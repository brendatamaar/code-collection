import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { CodeCollectionError } from "../errors.js";
import type { ConfigFileOptions } from "./types.js";

export interface LoadConfigFileOptions {
  repoPath?: string;
  configPath?: string | null;
}

const CONFIG_FILE_NAMES = [
  "code-collection.config.ts",
  "code-collection.config.mjs",
  "code-collection.config.js",
  "code-collection.config.json"
] as const;

export function defineConfig(options: ConfigFileOptions): ConfigFileOptions {
  return options;
}

export function loadConfigFile(
  options: LoadConfigFileOptions = {}
): ConfigFileOptions {
  const repoPath = resolve(options.repoPath ?? ".");
  const configPath = findConfigFile(repoPath, options.configPath);

  if (!configPath) {
    return {};
  }

  try {
    if (configPath.endsWith("package.json")) {
      const packageJson = JSON.parse(readFileSync(configPath, "utf8")) as {
        "code-collection"?: ConfigFileOptions;
      };
      return packageJson["code-collection"] ?? {};
    }

    const raw = readFileSync(configPath, "utf8");
    if (configPath.endsWith(".json")) {
      return JSON.parse(raw) as ConfigFileOptions;
    }

    return parseJavaScriptConfig(raw, configPath);
  } catch (error) {
    if (error instanceof CodeCollectionError) {
      throw error;
    }

    throw new CodeCollectionError({
      code: "INVALID_OPTIONS",
      message:
        error instanceof Error
          ? `Failed to load config ${configPath}: ${error.message}`
          : `Failed to load config ${configPath}`,
      suggestion: "Check the config file syntax and option names.",
      cause: error
    });
  }
}

export function findConfigFile(
  repoPath: string,
  configPath?: string | null
): string | undefined {
  if (configPath) {
    const resolved = isAbsolute(configPath)
      ? configPath
      : resolve(repoPath, configPath);
    return existsSync(resolved) ? resolved : undefined;
  }

  for (const fileName of CONFIG_FILE_NAMES) {
    const candidate = join(repoPath, fileName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const packageJson = join(repoPath, "package.json");
  if (!existsSync(packageJson)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(packageJson, "utf8")) as {
      "code-collection"?: unknown;
    };
    return parsed["code-collection"] !== undefined ? packageJson : undefined;
  } catch {
    return undefined;
  }
}

function parseJavaScriptConfig(
  raw: string,
  configPath: string
): ConfigFileOptions {
  const withoutImports = raw
    .split(/\r?\n/)
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n")
    .trim();
  const expression = withoutImports
    .replace(/;\s*$/g, "")
    .replace(/^export\s+default\s+defineConfig\s*\(/s, "")
    .replace(/^export\s+default\s+/s, "")
    .replace(/^module\.exports\s*=\s*defineConfig\s*\(/s, "")
    .replace(/^module\.exports\s*=\s*/s, "");
  const balancedExpression =
    withoutImports.includes("defineConfig(") && expression.endsWith(")")
      ? expression.slice(0, -1)
      : expression;

  try {
    const fn = new Function(
      "defineConfig",
      `return (${balancedExpression});`
    ) as (helper: (options: ConfigFileOptions) => ConfigFileOptions) => ConfigFileOptions;
    return fn(defineConfig);
  } catch (error) {
    throw new CodeCollectionError({
      code: "INVALID_OPTIONS",
      message: `Could not parse JavaScript config in ${dirname(configPath)}`,
      cause: error
    });
  }
}
