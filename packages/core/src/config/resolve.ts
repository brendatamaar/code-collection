import { CodeCollectionError } from "../errors.js";
import { DEFAULT_OPTIONS } from "./defaults.js";
import { loadConfigFile as loadDiscoveredConfigFile } from "./load.js";
import {
  type CliFlags,
  type ConfigFileOptions,
  type EnvVars,
  ResolvedOptions
} from "./types.js";
import type { ResolvedOptions as ResolvedOptionsT } from "./types.js";

export function loadConfigFile(): ConfigFileOptions {
  return loadDiscoveredConfigFile();
}

export function readEnvVars(envVars: EnvVars): ConfigFileOptions {
  void envVars;
  return {};
}

export function resolveOptions(
  cliFlags: CliFlags = {},
  envVars: EnvVars = {},
  configFile: ConfigFileOptions | undefined = undefined,
  defaults: ResolvedOptionsT = DEFAULT_OPTIONS
): ResolvedOptionsT {
  const discoveredConfig =
    configFile ??
    loadDiscoveredConfigFile({
      repoPath: cliFlags.path ?? defaults.repoPath,
      configPath: cliFlags.config ?? null
    });
  const envOptions = readEnvVars(envVars);
  const merged = mergeOptions(
    mergeOptions(mergeOptions(defaults, discoveredConfig), envOptions),
    cliFlagsToOptions(cliFlags, defaults)
  );
  if (merged.ci) {
    merged.noColor = true;
  }

  const parsed = ResolvedOptions.safeParse(merged);
  if (!parsed.success) {
    throw new CodeCollectionError({
      code: "INVALID_OPTIONS",
      message: `Invalid options: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`
    });
  }

  return parsed.data;
}

function cliFlagsToOptions(
  flags: CliFlags,
  defaults: ResolvedOptionsT
): ConfigFileOptions {
  const options: ConfigFileOptions = {};

  if (flags.path !== undefined) {
    options.repoPath = flags.path;
  }

  if (flags.stack !== undefined) {
    options.stack = flags.stack;
  }

  if (flags.include !== undefined) {
    options.include = flags.include;
  }

  if (flags.exclude !== undefined) {
    options.exclude = [...defaults.exclude, ...flags.exclude];
  }

  if (
    flags.format !== undefined ||
    flags.output !== undefined ||
    flags.splitByVersion !== undefined
  ) {
    options.output = {
      ...defaults.output,
      formats:
        flags.format === "all"
          ? ["postman", "bruno", "insomnia"]
          : flags.format !== undefined
            ? [flags.format]
            : defaults.output.formats,
      file: flags.output ?? defaults.output.file,
      directory: flags.output ?? defaults.output.directory,
      splitByVersion: flags.splitByVersion ?? defaults.output.splitByVersion
    };
  }

  if (flags.baseUrl !== undefined) {
    const parsed = parseBaseUrls(flags.baseUrl);
    options.servers = parsed.servers;
    options.environments = parsed.environments;
  }

  if (flags.profile !== undefined) {
    options.parser = {
      ...defaults.parser,
      spring: {
        ...defaults.parser.spring,
        profile: flags.profile
      }
    };
  }

  if (flags.report !== undefined) {
    options.reportPath = flags.report;
  }

  if (flags.config !== undefined) {
    options.config = flags.config;
  }

  copyBooleanFlag(options, "verbose", flags.verbose);
  copyBooleanFlag(options, "quiet", flags.quiet);
  copyBooleanFlag(options, "noColor", flags.noColor);
  copyBooleanFlag(options, "ci", flags.ci);
  copyBooleanFlag(options, "dryRun", flags.dryRun);
  copyBooleanFlag(options, "stdout", flags.stdout);
  copyBooleanFlag(options, "noWarnings", flags.noWarnings);

  return options;
}

function copyBooleanFlag<T extends keyof ConfigFileOptions>(
  options: ConfigFileOptions,
  key: T,
  value: boolean | undefined
): void {
  if (value !== undefined) {
    options[key] = value as ConfigFileOptions[T];
  }
}

function parseBaseUrls(values: string[]): {
  servers: ResolvedOptionsT["servers"];
  environments: ResolvedOptionsT["environments"];
} {
  if (values.length === 0) {
    return { servers: [{ url: "{{baseUrl}}" }], environments: {} };
  }

  if (values.length === 1 && !values[0]?.includes("=")) {
    return {
      servers: [{ url: values[0] ?? "{{baseUrl}}" }],
      environments: {}
    };
  }

  const hasNamed = values.some((value) => value.includes("="));
  const hasUnnamed = values.some((value) => !value.includes("="));
  if (hasNamed && hasUnnamed) {
    throw new CodeCollectionError({
      code: "INVALID_OPTIONS",
      message: "Do not mix named and unnamed --base-url values",
      suggestion: "Use either --base-url https://... or repeated name=https://... values."
    });
  }

  const seen = new Set<string>();
  const servers = values.map((value) => {
    const equalsIndex = value.indexOf("=");
    const name = value.slice(0, equalsIndex);
    if (seen.has(name)) {
      throw new CodeCollectionError({
        code: "INVALID_OPTIONS",
        message: `Duplicate --base-url environment '${name}'`
      });
    }
    seen.add(name);

    return {
      url: value.slice(equalsIndex + 1),
      description: name
    };
  });
  const environments = Object.fromEntries(
    servers.map((server) => [
      server.description as string,
      { baseUrl: server.url }
    ])
  );

  return { servers, environments };
}

function mergeOptions(
  base: ResolvedOptionsT,
  overrides: ConfigFileOptions
): ResolvedOptionsT {
  return {
    ...base,
    ...overrides,
    output: {
      ...base.output,
      ...overrides.output
    },
    parser: {
      spring: {
        ...base.parser.spring,
        ...overrides.parser?.spring
      },
      laravel: {
        ...base.parser.laravel,
        ...overrides.parser?.laravel
      },
      go: {
        ...base.parser.go,
        ...overrides.parser?.go
      },
      node: {
        ...base.parser.node,
        ...overrides.parser?.node
      }
    },
    warnings: {
      ...base.warnings,
      ...overrides.warnings
    },
    environments: overrides.environments ?? base.environments,
    exclude: overrides.exclude ?? base.exclude
  };
}
