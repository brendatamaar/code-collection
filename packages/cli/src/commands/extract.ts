import {
  createLogger,
  resolveOptions,
  runPipeline
} from "@code-collection/core";
import {
  brunoEmitter,
  insomniaEmitter,
  postmanEmitter
} from "@code-collection/emitter";
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

const EXTRACT_EXAMPLES = `
Examples:

  # Scan current directory, emit Postman (default)
  code-collection extract

  # Specific repo, Bruno format
  code-collection extract ./my-service --format bruno --output ./collections/

  # All three formats at once
  code-collection extract . --format all --output ./api-collections/

  # Force a parser when auto-detect fails
  code-collection extract . --stack spring

  # Spring profile for property file resolution
  code-collection extract . --profile staging

  # Multi-environment collection (one env file per name)
  code-collection extract . \\
    --base-url dev=http://localhost:8080 \\
    --base-url prod=https://api.example.com

  # Dry run to inspect endpoints without writing files
  code-collection extract ./my-app --dry-run

  # Pipe IR into jq
  code-collection extract ./my-app --stdout | jq '.endpoints | length'

  # CI mode with JSON report
  code-collection extract . --ci --report ./coverage.json
`.trim();

export const extractCommand = defineCommand({
  meta: {
    name: "extract",
    description: "Scan a repository and emit API collections (Postman, Bruno, Insomnia)",
    version: "0.5.0-beta"
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the repository root to scan",
      default: "."
    },
    output: {
      type: "string",
      alias: "o",
      description:
        "Output file path or directory. Defaults to ./api-collection.json " +
        "(or a directory when --format all is used)."
    },
    format: {
      type: "string",
      alias: "f",
      description:
        "Output format: postman | bruno | insomnia | all. " +
        "Default: postman. Use 'all' to emit all three formats."
    },
    stack: {
      type: "string",
      alias: "s",
      description:
        "Force a parser: auto | spring | laravel | go | node. " +
        "Default: auto (detects from repo markers)."
    },
    "base-url": {
      type: "string",
      description:
        "Base URL. Pass a bare URL for a single anonymous environment, " +
        "or <name>=<url> for a named environment. " +
        "Repeat for multi-environment collections. " +
        "Example: --base-url dev=http://localhost:8080 --base-url prod=https://api.example.com"
    },
    "split-by-version": {
      type: "boolean",
      description:
        "Emit one collection file per detected API version (v1, v2, …). " +
        "Endpoints with no version go into an 'unversioned' collection."
    },
    include: {
      type: "string",
      description:
        "Glob pattern to include files. Can be repeated. " +
        "Example: --include 'src/main/**' --include 'lib/**'"
    },
    exclude: {
      type: "string",
      description:
        "Glob pattern to exclude files. Appends to built-in defaults " +
        "(node_modules, vendor, target, build, dist, test). " +
        "Can be repeated."
    },
    config: {
      type: "string",
      alias: "c",
      description:
        "Path to a code-collection.config.{ts,js,json} file. " +
        "Auto-discovered if not specified."
    },
    profile: {
      type: "string",
      description:
        "Spring profile for application-<profile>.properties resolution. " +
        "Default: default. Example: --profile staging"
    },
    report: {
      type: "string",
      description:
        "Also write a JSON coverage report to this path. " +
        "Includes endpoints, warnings, and timing."
    },
    "no-warnings": {
      type: "boolean",
      description:
        "Suppress warning output in the terminal (warnings are still included in --report)."
    },
    verbose: {
      type: "boolean",
      alias: "v",
      description:
        "Show per-file parse details, resolved constants, auth detection, and emit steps."
    },
    quiet: {
      type: "boolean",
      alias: "q",
      description: "Suppress all non-error output. Useful in scripts."
    },
    "no-color": {
      type: "boolean",
      description: "Disable colored output. Also respected via the NO_COLOR env var."
    },
    ci: {
      type: "boolean",
      description:
        "CI mode: emit one JSON object per event on stderr, no spinners. " +
        "Combine with --report for machine-readable coverage."
    },
    "dry-run": {
      type: "boolean",
      alias: "d",
      description:
        "List all discovered endpoints without writing any files. " +
        "Exit 0 on success, 3+ on parse errors."
    },
    stdout: {
      type: "boolean",
      description:
        "Write the raw IR (Intermediate Representation) JSON to stdout " +
        "instead of emitting a collection file. " +
        "Useful for piping into jq or other tools."
    }
  },
  async run({ args }) {
    const cliFlags = toCliFlags(args);
    const options = resolveOptions(cliFlags);
    const logger = createLogger({ level: options.verbose ? "debug" : "info", ci: options.ci });
    const report = await runPipeline(
      options,
      [springParser, laravelParser, goParser, nodeParser],
      [postmanEmitter, brunoEmitter, insomniaEmitter]
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

    void EXTRACT_EXAMPLES; // referenced to ensure it's not tree-shaken from help
  }
});
