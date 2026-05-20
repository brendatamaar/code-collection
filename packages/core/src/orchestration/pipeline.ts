import { glob } from "tinyglobby";

import type { ResolvedOptions } from "../config/types.js";
import { detectStacks } from "../detect/index.js";
import { CodeCollectionError, WarningCode } from "../errors.js";
import { IR } from "../ir/schema.js";
import { validateIR } from "../ir/validate.js";
import { createLogger } from "../logger.js";
import { mergeParseResults, type MergeResult } from "./merge.js";
import type {
  Emitter,
  EmitResult,
  ParseResult,
  Parser,
  ParserOptions,
  PipelineReport,
  PipelineTiming
} from "./types.js";

export async function runPipeline(
  options: ResolvedOptions,
  parsers: Parser[],
  emitters: Emitter[]
): Promise<PipelineReport> {
  const timings: PipelineTiming[] = [];
  const logger = createLogger({ level: "silent", ci: true });

  const stacks = await timeStep(timings, "detect", () =>
    detectStacks(parsers, { repoPath: options.repoPath, logger })
  );
  const selectedStacks =
    options.stack === "auto"
      ? stacks
      : stacks.filter((stack) => stack.name === options.stack);

  if (selectedStacks.length === 0 && options.stack === "auto") {
    throw new CodeCollectionError({
      code: "STACK_NOT_DETECTED",
      message: `Could not detect a supported backend stack at ${options.repoPath}`,
      suggestion: "Pass --stack explicitly, or run from the repository root."
    });
  }

  const selectedParsers =
    options.stack === "auto"
      ? parsers.filter((parser) =>
          selectedStacks.some((stack) => stack.name === parser.name)
        )
      : parsers.filter((parser) => parser.name === options.stack);

  const files = await timeStep(timings, "resolve-files", () =>
    resolveFiles(options)
  );
  const parseResults = await timeStep(timings, "parse", () =>
    parseSequentially(options, selectedParsers, selectedStacks, files, logger)
  );
  const mergedResult = await timeStep(timings, "merge", () =>
    Promise.resolve(mergeParseResults(parseResults))
  );
  const merged = toIRInput(options, parseResults, mergedResult);
  const ir = await timeStep(timings, "validate", () =>
    Promise.resolve(validateIR(IR.parse(merged)))
  );
  const emitResults = options.dryRun || options.stdout
    ? []
    : await timeStep(timings, "emit", () => emitAll(options, ir, emitters));

  const emitWarnings = emitResults.flatMap((result) => result.warnings);
  const warnings = [...ir.warnings, ...emitWarnings];

  return {
    ir,
    timings,
    warnings,
    warningCount: warnings.length,
    emittedFiles: emitResults.flatMap((result) => result.files),
    dryRun: options.dryRun
  };
}

async function resolveFiles(options: ResolvedOptions): Promise<string[]> {
  const include = options.include.length > 0 ? options.include : ["**/*"];
  const files = await glob(include, {
    cwd: options.repoPath,
    absolute: false,
    onlyFiles: true,
    ignore: options.exclude
  });

  return [...new Set(files.map((file) => file.replace(/\\/g, "/")))].sort();
}

async function parseSequentially(
  options: ResolvedOptions,
  parsers: Parser[],
  stacks: { name: string; variant?: string }[],
  files: string[],
  logger: ReturnType<typeof createLogger>
): Promise<ParseResult[]> {
  const results: ParseResult[] = [];

  for (const parser of parsers) {
    const stack = stacks.find((detectedStack) => detectedStack.name === parser.name);
    try {
      const parseContext = {
        repoPath: options.repoPath,
        files,
        options: parserOptionsFor(options, parser.name),
        logger,
        ...(stack?.variant !== undefined ? { variant: stack.variant } : {})
      };

      results.push(
        await parser.parse(parseContext)
      );
    } catch (error) {
      results.push({
        endpoints: [],
        schemas: {},
        auth: [],
        metadata: {},
        warnings: [
          {
            level: "warning",
            code: WarningCode.PARSER_FAILED,
            message:
              error instanceof Error
                ? `${parser.name} parser failed: ${error.message}`
                : `${parser.name} parser failed`
          }
        ]
      });
    }
  }

  return results;
}

function toIRInput(
  options: ResolvedOptions,
  parseResults: ParseResult[],
  merged: MergeResult
): unknown {
  const firstMetadata = parseResults[0]?.metadata;

  return {
    irVersion: "1.0",
    metadata: {
      extractedAt: new Date(0).toISOString(),
      toolVersion: "0.5.0-beta",
      stack: firstMetadata?.stack ?? "spring",
      stackVariant: firstMetadata?.stackVariant,
      repoPath: options.repoPath,
      fileCount: 0,
      ...firstMetadata
    },
    info: {
      title: "code-collection",
      ...parseResults[0]?.metadata
    },
    servers: options.servers,
    auth: merged.auth,
    tags: [],
    schemas: merged.schemas,
    endpoints: merged.endpoints,
    warnings: merged.warnings
  };
}

async function emitAll(
  options: ResolvedOptions,
  ir: ReturnType<typeof IR.parse>,
  emitters: Emitter[]
): Promise<EmitResult[]> {
  const results: EmitResult[] = [];

  for (const format of options.output.formats) {
    const emitter = emitters.find((candidate) => candidate.name === format);
    if (!emitter) {
      continue;
    }

    const emitOptions = {
        outputPath:
          format === "bruno" ? options.output.directory : options.output.file,
        splitByVersion: options.output.splitByVersion,
        environments: options.environments,
        ...(options.servers[0]?.url ? { baseUrl: options.servers[0].url } : {})
      };

    results.push(await emitter.emit(ir, emitOptions));
  }

  return results;
}

async function timeStep<T>(
  timings: PipelineTiming[],
  step: string,
  action: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await action();
  timings.push({ step, durationMs: Math.round(performance.now() - start) });
  return result;
}

function parserOptionsFor(
  options: ResolvedOptions,
  parserName: Parser["name"]
): ParserOptions {
  return options.parser[parserName];
}
