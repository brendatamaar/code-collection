import { CodeCollectionError } from "../errors.js";
import { DEFAULT_OPTIONS } from "./defaults.js";
import {
  type CliFlags,
  type ConfigFileOptions,
  type EnvVars,
  ResolvedOptions
} from "./types.js";
import type { ResolvedOptions as ResolvedOptionsT } from "./types.js";

export function loadConfigFile(): ConfigFileOptions {
  return {};
}

export function readEnvVars(envVars: EnvVars): ConfigFileOptions {
  void envVars;
  return {};
}

export function resolveOptions(
  cliFlags: CliFlags = {},
  envVars: EnvVars = {},
  configFile: ConfigFileOptions = loadConfigFile(),
  defaults: ResolvedOptionsT = DEFAULT_OPTIONS
): ResolvedOptionsT {
  const envOptions = readEnvVars(envVars);
  const merged = mergeOptions(
    mergeOptions(mergeOptions(defaults, configFile), envOptions),
    cliFlagsToOptions(cliFlags, defaults)
  );

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
    options.servers = parseBaseUrls(flags.baseUrl);
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

function parseBaseUrls(values: string[]): ResolvedOptionsT["servers"] {
  if (values.length === 0) {
    return [{ url: "{{baseUrl}}" }];
  }

  if (values.length === 1 && !values[0]?.includes("=")) {
    return [{ url: values[0] ?? "{{baseUrl}}" }];
  }

  return values.map((value) => {
    const equalsIndex = value.indexOf("=");
    return {
      url: equalsIndex === -1 ? value : value.slice(equalsIndex + 1),
      description: equalsIndex === -1 ? undefined : value.slice(0, equalsIndex)
    };
  });
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
    exclude: overrides.exclude ?? base.exclude
  };
}
