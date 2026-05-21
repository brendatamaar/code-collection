import { CodeCollectionError } from "@code-collection/core";

const isDebug = process.env["CODE_COLLECTION_LOG_LEVEL"] === "debug";

export function formatError(error: unknown): string {
  if (error instanceof CodeCollectionError) {
    const lines = [
      `Error [${error.code}]: ${error.message}`,
      "  The extraction pipeline stopped before it could finish.",
      error.cause instanceof Error ? `  Reason: ${error.cause.message}` : undefined,
      error.suggestion ? `\n  Suggestion: ${error.suggestion}` : undefined
    ].filter((line): line is string => line !== undefined);

    if (isDebug && error.stack) {
      lines.push(`\n  Stack trace:\n${error.stack.split("\n").map((l) => `    ${l}`).join("\n")}`);
    }

    if (isDebug && error.cause instanceof Error && error.cause.stack) {
      lines.push(`\n  Caused by:\n${error.cause.stack.split("\n").map((l) => `    ${l}`).join("\n")}`);
    }

    return lines.join("\n");
  }

  if (error instanceof Error) {
    const lines = [
      `Error: ${error.message}`,
      "  An unexpected error occurred while running code-collection.",
      "\n  Suggestion: Run again with CODE_COLLECTION_LOG_LEVEL=debug to see the full stack trace."
    ];

    if (isDebug && error.stack) {
      lines.push(`\n  Stack trace:\n${error.stack.split("\n").map((l) => `    ${l}`).join("\n")}`);
    }

    return lines.join("\n");
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
