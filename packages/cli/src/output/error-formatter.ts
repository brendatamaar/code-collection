import { CodeCollectionError } from "@code-collection/core";

export function formatError(error: unknown): string {
  if (error instanceof CodeCollectionError) {
    return [
      `Error: ${error.message}`,
      "  The extraction pipeline stopped before it could finish.",
      error.cause instanceof Error ? `  Reason: ${error.cause.message}` : undefined,
      error.suggestion ? `\n  Suggestion: ${error.suggestion}` : undefined
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");
  }

  if (error instanceof Error) {
    return [
      `Error: ${error.message}`,
      "  An unexpected error occurred while running code-collection.",
      "\n  Suggestion: Run again with --verbose, or check the stack trace in debug logs."
    ].join("\n");
  }

  return [
    "Error: Unknown failure",
    "  An unexpected non-error value was thrown.",
    "\n  Suggestion: Run again with --verbose."
  ].join("\n");
}

export function exitCodeForError(error: unknown): number {
  if (!(error instanceof CodeCollectionError)) {
    return 1;
  }

  return (
    {
      INVALID_OPTIONS: 2,
      STACK_NOT_DETECTED: 2,
      PARSER_FAILED: 3,
      OUTPUT_WRITE_FAILED: 4,
      IR_VALIDATION_FAILED: 5,
      ESCALATED_WARNING: 10
    }[error.code] ?? 1
  );
}
