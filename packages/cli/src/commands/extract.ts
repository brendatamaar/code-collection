import {
  createLogger,
  resolveOptions,
  runPipeline
} from "@code-collection/core";
import { brunoEmitter, postmanEmitter } from "@code-collection/emitter";
import { goParser } from "@code-collection/parser-go";
import { laravelParser } from "@code-collection/parser-laravel";
import { nodeParser } from "@code-collection/parser-node";
import { springParser } from "@code-collection/parser-spring";
import { defineCommand } from "citty";

import { toCliFlags } from "../flag-parsing.js";
import { formatCiEvents } from "../output/ci-reporter.js";
import { formatDefaultReport } from "../output/default-reporter.js";
import { formatDryRunReport } from "../output/dry-run-reporter.js";
import { writeJsonReport } from "../output/report.js";

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
    format: {
      type: "string",
      description: "Output format"
    },
    stack: {
      type: "string",
      description: "Parser stack"
    },
    "base-url": {
      type: "string",
      description: "Base URL, repeatable as name=url"
    },
    "split-by-version": { type: "boolean", description: "Split output by API version" },
    include: { type: "string", description: "Include glob" },
    exclude: { type: "string", description: "Exclude glob" },
    config: { type: "string", description: "Config file path" },
    profile: { type: "string", description: "Spring profile" },
    report: { type: "string", description: "Write JSON report" },
    "no-warnings": { type: "boolean", description: "Suppress warnings" },
    verbose: {
      type: "boolean",
      description: "Show verbose output"
    },
    quiet: { type: "boolean", description: "Suppress human output" },
    "no-color": { type: "boolean", description: "Disable color" },
    ci: { type: "boolean", description: "Emit JSON-lines events on stderr" },
    "dry-run": {
      type: "boolean",
      description: "List endpoints without writing files"
    },
    stdout: {
      type: "boolean",
      description: "Write IR JSON to stdout"
    }
  },
  async run({ args }) {
    const cliFlags = toCliFlags(args);
    const options = resolveOptions(cliFlags);
    const logger = createLogger({ level: options.verbose ? "debug" : "info", ci: options.ci });
    const report = await runPipeline(
      options,
      [springParser, laravelParser, goParser, nodeParser],
      [postmanEmitter, brunoEmitter]
    );

    if (options.reportPath) {
      await writeJsonReport(report, options.reportPath);
    }
    if (options.ci) {
      process.stderr.write(formatCiEvents(report));
    }
    if (options.stdout) {
      process.stdout.write(`${JSON.stringify(report.ir, null, 2)}\n`);
    } else if (options.dryRun) {
      process.stdout.write(formatDryRunReport(report));
    } else {
      const output = formatDefaultReport(report, {
        verbose: options.verbose,
        quiet: options.quiet
      });

      if (output) {
        process.stdout.write(output);
      }
    }

    logger.flush();
  }
});
