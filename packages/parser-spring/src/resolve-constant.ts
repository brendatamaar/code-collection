import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

interface JavaFileConstants {
  file: string;
  packageName: string;
  className: string;
  imports: Map<string, string>;
  constants: Map<string, string>;
}

export interface ConstantIndex {
  files: Map<string, JavaFileConstants>;
  classes: Map<string, JavaFileConstants>;
}

export interface ConstantResolutionResult {
  value: string;
  warnings: Warning[];
}

export async function buildConstantIndex(
  repoPath: string,
  files: string[]
): Promise<ConstantIndex> {
  const index: ConstantIndex = { files: new Map(), classes: new Map() };

  await Promise.all(
    files
      .filter((file) => file.endsWith(".java"))
      .map(async (file) => {
        const normalized = file.replace(/\\/g, "/");
        const content = await readFile(join(repoPath, file), "utf8").catch(() => undefined);
        if (content === undefined) {
          return;
        }
        const parsed = parseJavaConstants(normalized, content);
        if (!parsed) {
          return;
        }
        index.files.set(normalized, parsed);
        index.classes.set(parsed.className, parsed);
        index.classes.set(`${parsed.packageName}.${parsed.className}`, parsed);
      })
  );

  return index;
}

export function parseJavaConstants(
  file: string,
  content: string
): JavaFileConstants | undefined {
  const className = /(?:public\s+)?(?:final\s+)?class\s+([A-Za-z_]\w*)/.exec(
    content
  )?.[1];
  if (!className) {
    return undefined;
  }

  const packageName = /^\s*package\s+([A-Za-z_][\w.]*);/m.exec(content)?.[1] ?? "";
  const imports = new Map<string, string>();
  for (const match of content.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)\s*;/gm)) {
    const qualified = match[1];
    const simpleName = qualified?.split(".").at(-1);
    if (qualified && simpleName) {
      imports.set(simpleName, qualified);
    }
  }

  const constants = new Map<string, string>();
  const constantPattern =
    /(?:public|private|protected)?\s*(?:static\s+)?final\s+String\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
  for (const match of content.matchAll(constantPattern)) {
    const name = match[1];
    const expression = match[2];
    if (name && expression) {
      constants.set(name, expression.trim());
    }
  }

  return {
    file,
    packageName,
    className,
    imports,
    constants
  };
}

export function resolveConstantExpression(
  index: ConstantIndex,
  currentFile: string,
  expression: string
): ConstantResolutionResult {
  const warnings: Warning[] = [];
  const value = resolveExpression(
    index,
    index.files.get(currentFile.replace(/\\/g, "/")),
    expression.trim(),
    warnings,
    new Set(),
    0
  );

  return {
    value: value ?? expression,
    warnings:
      value === undefined
        ? [
            ...warnings,
            {
              level: "warning",
              code: WarningCode.UNRESOLVED_CONSTANT,
              message: `Could not resolve constant expression '${expression}'`
            }
          ]
        : warnings
  };
}

function resolveExpression(
  index: ConstantIndex,
  currentFile: JavaFileConstants | undefined,
  expression: string,
  warnings: Warning[],
  seen: Set<string>,
  depth: number
): string | undefined {
  if (depth > 2) {
    return undefined;
  }

  const parts = splitConcatenation(expression);
  if (parts.length > 1) {
    const resolved = parts.map((part) =>
      resolveExpression(index, currentFile, part, warnings, seen, depth)
    );
    return resolved.every((part): part is string => part !== undefined)
      ? resolved.join("")
      : undefined;
  }

  const literal = /^"((?:\\.|[^"])*)"$/.exec(expression)?.[1];
  if (literal !== undefined) {
    return literal.replace(/\\"/g, "\"");
  }

  const sameFileExpression = /^([A-Za-z_]\w*)$/.exec(expression)?.[1];
  if (sameFileExpression && currentFile) {
    return resolveConstantByName(
      index,
      currentFile,
      sameFileExpression,
      warnings,
      seen,
      depth + 1
    );
  }

  const fieldAccess = /^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/.exec(expression);
  if (fieldAccess?.[1] && fieldAccess[2]) {
    const owner = resolveImportedClass(index, currentFile, fieldAccess[1]);
    if (!owner) {
      return undefined;
    }
    return resolveConstantByName(
      index,
      owner,
      fieldAccess[2],
      warnings,
      seen,
      depth + 1
    );
  }

  return undefined;
}

function resolveConstantByName(
  index: ConstantIndex,
  file: JavaFileConstants,
  name: string,
  warnings: Warning[],
  seen: Set<string>,
  depth: number
): string | undefined {
  const key = `${file.file}:${name}`;
  if (seen.has(key)) {
    return undefined;
  }

  const expression = file.constants.get(name);
  if (!expression) {
    return undefined;
  }

  return resolveExpression(
    index,
    file,
    expression,
    warnings,
    new Set([...seen, key]),
    depth
  );
}

function resolveImportedClass(
  index: ConstantIndex,
  currentFile: JavaFileConstants | undefined,
  simpleName: string
): JavaFileConstants | undefined {
  if (!currentFile) {
    return index.classes.get(simpleName);
  }

  const imported = currentFile.imports.get(simpleName);
  if (imported) {
    return index.classes.get(imported) ?? index.classes.get(simpleName);
  }

  return (
    index.classes.get(`${currentFile.packageName}.${simpleName}`) ??
    index.classes.get(simpleName)
  );
}

function splitConcatenation(expression: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inString = false;
  let escaped = false;

  for (const char of expression) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === "\"") {
      current += char;
      inString = !inString;
      continue;
    }
    if (char === "+" && !inString) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}
