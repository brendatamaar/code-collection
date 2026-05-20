import { z } from "zod";

import { WarningCode } from "../errors.js";

export const OutputFormat = z.enum(["postman", "bruno", "insomnia"]);
export const StackOption = z.enum(["auto", "spring", "laravel", "go", "node"]);

export const ResolvedOptions = z.object({
  repoPath: z.string(),
  stack: StackOption,
  include: z.array(z.string()),
  exclude: z.array(z.string()),
  output: z.object({
    formats: z.array(OutputFormat),
    file: z.string(),
    directory: z.string(),
    splitByVersion: z.boolean()
  }),
  servers: z.array(
    z.object({
      url: z.string(),
      description: z.string().optional(),
      variables: z
        .record(
          z.string(),
          z.object({
            default: z.string(),
            enum: z.array(z.string()).optional(),
            description: z.string().optional()
          })
        )
        .optional()
    })
  ),
  environments: z.record(
    z.string(),
    z.object({
      baseUrl: z.string()
    })
  ),
  parser: z.object({
    spring: z.object({
      propertyFiles: z.array(z.string()),
      profile: z.string()
    }),
    laravel: z.object({
      routeFiles: z.array(z.string()),
      includeFormRequests: z.boolean()
    }),
    go: z.object({
      modules: z.array(z.string())
    }),
    node: z.object({
      tsConfig: z.string()
    })
  }),
  authDetection: z.boolean(),
  reportPath: z.string().nullable(),
  warnings: z.object({
    suppress: z.array(z.nativeEnum(WarningCode)),
    failOn: z.array(z.nativeEnum(WarningCode))
  }),
  verbose: z.boolean(),
  quiet: z.boolean(),
  noColor: z.boolean(),
  ci: z.boolean(),
  dryRun: z.boolean(),
  stdout: z.boolean(),
  noWarnings: z.boolean(),
  config: z.string().nullable()
});

export type ResolvedOptions = z.infer<typeof ResolvedOptions>;

export type CliFlags = Partial<{
  path: string;
  format: "postman" | "bruno" | "insomnia" | "all";
  output: string;
  stack: z.infer<typeof StackOption>;
  baseUrl: string[];
  splitByVersion: boolean;
  include: string[];
  exclude: string[];
  config: string;
  profile: string;
  report: string;
  noWarnings: boolean;
  verbose: boolean;
  quiet: boolean;
  noColor: boolean;
  ci: boolean;
  dryRun: boolean;
  stdout: boolean;
}>;

export type EnvVars = Record<string, string | undefined>;
export type ConfigFileOptions = Partial<ResolvedOptions>;
