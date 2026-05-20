export interface CodeCollectionErrorOptions {
  code: string;
  message: string;
  suggestion?: string;
  cause?: unknown;
}

export class CodeCollectionError extends Error {
  public readonly code: string;
  public readonly suggestion: string | undefined;
  public override readonly cause?: unknown;

  public constructor(options: CodeCollectionErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "CodeCollectionError";
    this.code = options.code;
    this.suggestion = options.suggestion;
    this.cause = options.cause;
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion
    };
  }
}

export const WarningCode = {
  DYNAMIC_PREFIX: "DYNAMIC_PREFIX",
  UNRESOLVED_CONSTANT: "UNRESOLVED_CONSTANT",
  UNRESOLVED_PROPERTY: "UNRESOLVED_PROPERTY",
  UNKNOWN_AUTH_MIDDLEWARE: "UNKNOWN_AUTH_MIDDLEWARE",
  UNSUPPORTED_DTO_FEATURE: "UNSUPPORTED_DTO_FEATURE",
  CYCLIC_SCHEMA_REFERENCE: "CYCLIC_SCHEMA_REFERENCE",
  LOMBOK_INFERRED: "LOMBOK_INFERRED",
  BODY_ON_GET_OR_DELETE: "BODY_ON_GET_OR_DELETE",
  DUPLICATE_ROUTE: "DUPLICATE_ROUTE",
  DUPLICATE_SCHEMA: "DUPLICATE_SCHEMA",
  ROUTE_CACHE_DETECTED: "ROUTE_CACHE_DETECTED",
  MULTI_MODULE_REPO: "MULTI_MODULE_REPO",
  PARSER_FAILED: "PARSER_FAILED",
  PARSE_FAILED: "PARSE_FAILED",
  WEBFLUX_FUNCTIONAL_ROUTES: "WEBFLUX_FUNCTIONAL_ROUTES"
} as const;

export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode];
