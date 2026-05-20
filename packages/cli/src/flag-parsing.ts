import { resolve } from "node:path";

import { CodeCollectionError, type CliFlags } from "@code-collection/core";

export function toCliFlags(args: Record<string, unknown>): CliFlags {
  const repoPath = typeof args.path === "string" ? args.path : ".";
  const output =
    typeof args.output === "string"
      ? args.output
      : resolve(repoPath, "api-collection.json");
  const format = stringArg(args.format);
  const stack = stringArg(args.stack);

  if (format !== undefined && !isFormat(format)) {
    throw invalid("format", format, "postman, bruno, insomnia, all");
  }
  if (stack !== undefined && !isStack(stack)) {
    throw invalid("stack", stack, "auto, spring, laravel, go, node");
  }

  const flags: CliFlags = {
    path: repoPath,
    output,
    ...(format ? { format } : {}),
    ...(stack ? { stack } : {}),
    ...(stringListArg(args["base-url"]).length > 0
      ? { baseUrl: stringListArg(args["base-url"]) }
      : {}),
    ...(stringListArg(args.include).length > 0
      ? { include: stringListArg(args.include) }
      : {}),
    ...(stringListArg(args.exclude).length > 0
      ? { exclude: stringListArg(args.exclude) }
      : {}),
    ...(stringArg(args.config) ? { config: stringArg(args.config) as string } : {}),
    ...(stringArg(args.profile) ? { profile: stringArg(args.profile) as string } : {}),
    ...(stringArg(args.report) ? { report: stringArg(args.report) as string } : {}),
  };

  copyBoolean(flags, "splitByVersion", booleanArg(args["split-by-version"]));
  copyBoolean(flags, "noWarnings", booleanArg(args["no-warnings"]));
  copyBoolean(flags, "verbose", booleanArg(args.verbose));
  copyBoolean(flags, "quiet", booleanArg(args.quiet));
  copyBoolean(flags, "noColor", booleanArg(args["no-color"]));
  copyBoolean(flags, "ci", booleanArg(args.ci));
  copyBoolean(flags, "dryRun", booleanArg(args["dry-run"]));
  copyBoolean(flags, "stdout", booleanArg(args.stdout));

  return flags;
}

function stringArg(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringListArg(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function booleanArg(value: unknown): boolean | undefined {
  return value === undefined ? undefined : value === true;
}

function copyBoolean<T extends keyof CliFlags>(
  flags: CliFlags,
  key: T,
  value: boolean | undefined
): void {
  if (value !== undefined) {
    flags[key] = value as CliFlags[T];
  }
}

function isFormat(value: string): value is NonNullable<CliFlags["format"]> {
  return ["postman", "bruno", "insomnia", "all"].includes(value);
}

function isStack(value: string): value is NonNullable<CliFlags["stack"]> {
  return ["auto", "spring", "laravel", "go", "node"].includes(value);
}

function invalid(name: string, value: string, allowed: string): CodeCollectionError {
  return new CodeCollectionError({
    code: "INVALID_OPTIONS",
    message: `Invalid ${name} '${value}'`,
    suggestion: `Use one of: ${allowed}.`
  });
}
