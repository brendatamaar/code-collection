import { glob } from "tinyglobby";

import type { ResolvedOptions } from "../config/types.js";
import { detectStacks } from "../detect/index.js";
import { CodeCollectionError, WarningCode } from "../errors.js";
import { IR, type Warning } from "../ir/schema.js";
import { validateIR } from "../ir/validate.js";
import { createLogger } from "../logger.js";
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
  const merged = await timeStep(timings, "merge", () =>
    Promise.resolve(mergeParseResults(options, parseResults))
  );
  const ir = await timeStep(timings, "validate", () =>
    Promise.resolve(validateIR(IR.parse(merged)))
  );
  const emitResults = options.dryRun
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

function mergeParseResults(
  options: ResolvedOptions,
  parseResults: ParseResult[]
): unknown {
  const endpointsById = new Map<string, ParseResult["endpoints"][number]>();
  const schemas: ParseResult["schemas"] = {};
  const authById = new Map<string, ParseResult["auth"][number]>();
  const warnings: Warning[] = [];
  const firstMetadata = parseResults[0]?.metadata;

  for (const result of parseResults) {
    result.warnings.forEach((warning) => warnings.push(warning));
    result.endpoints.forEach((endpoint) => {
      if (!endpointsById.has(endpoint.id)) {
        endpointsById.set(endpoint.id, endpoint);
      }
    });
    Object.entries(result.schemas).forEach(([name, schema]) => {
      if (schemas[name] === undefined) {
        schemas[name] = schema;
      } else {
        warnings.push({
          level: "warning",
          code: WarningCode.DUPLICATE_ROUTE,
          message: `Schema '${name}' was produced more than once; kept the first definition`
        });
      }
    });
    result.auth.forEach((scheme) => {
      if (!authById.has(scheme.id)) {
        authById.set(scheme.id, scheme);
      }
    });
  }

  return {
    irVersion: "1.0",
    metadata: {
      extractedAt: new Date(0).toISOString(),
      toolVersion: "0.1.0",
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
    auth: [...authById.values()],
    tags: [],
    schemas,
    endpoints: [...endpointsById.values()],
    warnings
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

    results.push(
      await emitter.emit(ir, {
        outputPath: options.output.file,
        splitByVersion: options.output.splitByVersion,
        environments: options.environments
      })
    );
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
