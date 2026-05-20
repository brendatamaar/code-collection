import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface SpringPropertyLoaderOptions {
  propertyFiles?: string[];
  profile?: string;
}

export async function loadSpringProperties(
  repoPath: string,
  options: SpringPropertyLoaderOptions = {}
): Promise<Record<string, string>> {
  const defaultFiles = options.propertyFiles?.length
    ? options.propertyFiles
    : [
        "src/main/resources/application.yml",
        "src/main/resources/application.yaml",
        "src/main/resources/application.properties"
      ];
  const profileFiles = options.profile
    ? defaultFiles.flatMap((file) => profileVariantNames(file, options.profile as string))
    : [];
  const merged: Record<string, string> = {};

  for (const file of [...defaultFiles, ...profileFiles]) {
    const path = join(repoPath, file);
    if (!existsSync(path)) {
      continue;
    }

    const content = await readFile(path, "utf8");
    Object.assign(
      merged,
      file.endsWith(".properties")
        ? parseProperties(content)
        : parseYamlProperties(content)
    );
  }

  return resolvePlaceholders(merged);
}

export function parseProperties(content: string): Record<string, string> {
  const properties: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) {
      continue;
    }

    const separator = /[:=]/.exec(trimmed);
    if (!separator) {
      continue;
    }

    properties[trimmed.slice(0, separator.index).trim()] = trimmed
      .slice(separator.index + 1)
      .trim();
  }

  return properties;
}

export function parseYamlProperties(content: string): Record<string, string> {
  const properties: Record<string, string> = {};
  const stack: { indent: number; key: string }[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) {
      continue;
    }

    const match = /^(\s*)([^:#]+):(?:\s*(.*))?$/.exec(line);
    if (!match?.[2]) {
      continue;
    }

    const indent = match[1]?.length ?? 0;
    const key = match[2].trim();
    const value = match[3]?.trim();
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    const fullKey = [...stack.map((entry) => entry.key), key].join(".");
    if (value === undefined || value === "") {
      stack.push({ indent, key });
      continue;
    }

    properties[fullKey] = unquote(value);
  }

  return properties;
}

export function resolvePropertyPlaceholders(
  value: string,
  properties: Record<string, string>,
  maxDepth = 10
): string | undefined {
  let current: string | undefined = value;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!current.includes("${")) {
      return current;
    }

    let unresolved = false;
    current = current.replace(/\$\{([^}:]+)(?::([^}]+))?\}/g, (_match, key, fallback) => {
      const replacement = properties[String(key)] ?? fallback;
      if (replacement === undefined) {
        unresolved = true;
        return _match;
      }
      return replacement;
    });

    if (unresolved) {
      return undefined;
    }
  }

  return undefined;
}

function resolvePlaceholders(
  properties: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      resolvePropertyPlaceholders(value, properties) ?? value
    ])
  );
}

function profileVariantNames(file: string, profile: string): string[] {
  return file.replace(/application(\.(?:ya?ml|properties))$/, `application-${profile}$1`)
    ? [file.replace(/application(\.(?:ya?ml|properties))$/, `application-${profile}$1`)]
    : [];
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}
