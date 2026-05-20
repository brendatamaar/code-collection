import type { Logger } from "../logger.js";
import type {
  AuthScheme,
  Endpoint,
  IR,
  Metadata,
  Schema,
  Warning
} from "../ir/schema.js";
import type { DetectContext, DetectedStack, StackName } from "../detect/index.js";
import type { ResolvedOptions } from "../config/types.js";

export type ParserOptions = Record<string, unknown>;

export interface ParseContext {
  repoPath: string;
  files: string[];
  variant?: string;
  options: ParserOptions;
  logger: Logger;
}

export interface ParseResult {
  endpoints: Endpoint[];
  schemas: Record<string, Schema>;
  auth: AuthScheme[];
  warnings: Warning[];
  metadata: Partial<Metadata>;
}

export interface Parser {
  name: StackName;
  detect(ctx: DetectContext): Promise<DetectedStack[]>;
  parse(ctx: ParseContext): Promise<ParseResult>;
}

export type EmitterName = "postman" | "bruno" | "insomnia";

export interface EmitOptions {
  outputPath: string;
  baseUrl?: string;
  splitByVersion: boolean;
  environments?: Record<string, { baseUrl: string }>;
}

export interface EmitResult {
  files: { path: string; bytes: number }[];
  warnings: Warning[];
}

export interface Emitter {
  name: EmitterName;
  emit(ir: IR, options: EmitOptions): Promise<EmitResult>;
}

export interface PipelineTiming {
  step: string;
  durationMs: number;
}

export interface PipelineReport {
  ir: IR;
  timings: PipelineTiming[];
  warnings: Warning[];
  warningCount: number;
  emittedFiles: { path: string; bytes: number }[];
  dryRun: boolean;
}

export interface RunPipelineOptions {
  options: ResolvedOptions;
  parsers: Parser[];
  emitters: Emitter[];
  logger: Logger;
}
