import { resolve } from "node:path";

import {
  CodeCollectionError,
  createLogger,
  resolveOptions,
  runPipeline,
  type CliFlags
} from "@code-collection/core";
import { postmanEmitter } from "@code-collection/emitter";
import { springParser } from "@code-collection/parser-spring";
import { defineCommand } from "citty";

import { formatDefaultReport } from "../output/default-reporter.js";

export const extractCommand = defineCommand({
  meta: {
    name: "extract",
    description: "Scan a repo and emit API collections"
  },
  args: {
    path: {
      type: "positional",
      description: "Repository root",
      default: "."
    },
    output: {
      type: "string",
      description: "Output file path"
    },
    stack: {
      type: "string",
      description: "Parser stack"
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output"
    },
    "dry-run": {
      type: "boolean",
      description: "List endpoints without writing files"
    }
  },
  async run({ args }) {
    const cliFlags = toCliFlags(args);
    const options = resolveOptions(cliFlags);
    const logger = createLogger({ level: options.verbose ? "debug" : "info", ci: options.ci });
    const report = await runPipeline(options, [springParser], [postmanEmitter]);
    const output = formatDefaultReport(report, {
      verbose: options.verbose,
      quiet: options.quiet
    });

    if (output) {
      process.stdout.write(output);
    }

    logger.flush();
  }
});

function toCliFlags(args: Record<string, unknown>): CliFlags {
  const repoPath = typeof args.path === "string" ? args.path : ".";
  const output =
    typeof args.output === "string"
      ? args.output
      : resolve(repoPath, "api-collection.json");

  if (typeof args.stack === "string" && !isStack(args.stack)) {
    throw new CodeCollectionError({
      code: "INVALID_OPTIONS",
      message: `Invalid stack '${args.stack}'`,
      suggestion: "Use one of: auto, spring, laravel, go, node."
    });
  }
  const stack = typeof args.stack === "string" && isStack(args.stack) ? args.stack : undefined;

  return {
    path: repoPath,
    output,
    verbose: args.verbose === true,
    dryRun: args["dry-run"] === true,
    ...(stack ? { stack } : {})
  };
}

function isStack(value: string): value is NonNullable<CliFlags["stack"]> {
  return ["auto", "spring", "laravel", "go", "node"].includes(value);
}
