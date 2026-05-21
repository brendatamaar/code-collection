import { CodeCollectionError } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { exitCodeForError, formatError } from "./error-formatter.js";

function makeError(
  code: string,
  message: string,
  suggestion?: string,
  cause?: Error
): CodeCollectionError {
  return new CodeCollectionError({
    code,
    message,
    ...(suggestion !== undefined ? { suggestion } : {}),
    ...(cause !== undefined ? { cause } : {})
  });
}

describe("formatError", () => {
  it("INVALID_OPTIONS", () => {
    expect(formatError(makeError("INVALID_OPTIONS", "output.path: Required", "Run code-collection --help to see valid option values."))).toMatchInlineSnapshot(`
      "Error [INVALID_OPTIONS]: output.path: Required
        The extraction pipeline stopped before it could finish.

        Suggestion: Run code-collection --help to see valid option values."
    `);
  });

  it("STACK_NOT_DETECTED", () => {
    expect(formatError(makeError("STACK_NOT_DETECTED", "Could not detect a supported backend stack at /repo", "Pass --stack explicitly, or run from the repository root."))).toMatchInlineSnapshot(`
      "Error [STACK_NOT_DETECTED]: Could not detect a supported backend stack at /repo
        The extraction pipeline stopped before it could finish.

        Suggestion: Pass --stack explicitly, or run from the repository root."
    `);
  });

  it("PARSER_FAILED", () => {
    expect(formatError(makeError("PARSER_FAILED", "Spring parser failed unexpectedly"))).toMatchInlineSnapshot(`
      "Error [PARSER_FAILED]: Spring parser failed unexpectedly
        The extraction pipeline stopped before it could finish."
    `);
  });

  it("OUTPUT_WRITE_FAILED", () => {
    expect(formatError(makeError("OUTPUT_WRITE_FAILED", "Could not write to /output/collection.json", "Check that the output directory exists and is writable."))).toMatchInlineSnapshot(`
      "Error [OUTPUT_WRITE_FAILED]: Could not write to /output/collection.json
        The extraction pipeline stopped before it could finish.

        Suggestion: Check that the output directory exists and is writable."
    `);
  });

  it("IR_VALIDATION_FAILED", () => {
    expect(formatError(makeError("IR_VALIDATION_FAILED", "IR validation failed: path must start with /", "This is likely a parser bug. Run with --verbose and report the issue."))).toMatchInlineSnapshot(`
      "Error [IR_VALIDATION_FAILED]: IR validation failed: path must start with /
        The extraction pipeline stopped before it could finish.

        Suggestion: This is likely a parser bug. Run with --verbose and report the issue."
    `);
  });

  it("ESCALATED_WARNING", () => {
    expect(formatError(makeError("ESCALATED_WARNING", "UNRESOLVED_CONSTANT exceeded threshold", "Review unresolved constants or lower --warning-threshold."))).toMatchInlineSnapshot(`
      "Error [ESCALATED_WARNING]: UNRESOLVED_CONSTANT exceeded threshold
        The extraction pipeline stopped before it could finish.

        Suggestion: Review unresolved constants or lower --warning-threshold."
    `);
  });

  it("includes cause message when present", () => {
    const cause = new Error("ENOENT: no such file");
    const result = formatError(makeError("OUTPUT_WRITE_FAILED", "Write failed", undefined, cause));
    expect(result).toContain("Reason: ENOENT: no such file");
  });

  it("formats unexpected Error", () => {
    const result = formatError(new Error("something went wrong"));
    expect(result).toContain("something went wrong");
    expect(result).toContain("Suggestion:");
  });

  it("formats unknown thrown value", () => {
    const result = formatError("a string was thrown");
    expect(result).toContain("Unknown failure");
  });
});

describe("exitCodeForError", () => {
  it.each([
    ["INVALID_OPTIONS", 2],
    ["STACK_NOT_DETECTED", 2],
    ["PARSER_FAILED", 3],
    ["OUTPUT_WRITE_FAILED", 4],
    ["IR_VALIDATION_FAILED", 5],
    ["ESCALATED_WARNING", 10]
  ] as const)("%s → %i", (code, expected) => {
    expect(exitCodeForError(makeError(code, "msg"))).toBe(expected);
  });

  it("returns 1 for unknown error codes", () => {
    expect(exitCodeForError(makeError("UNKNOWN_CODE", "msg"))).toBe(1);
  });

  it("returns 1 for non-CodeCollectionError", () => {
    expect(exitCodeForError(new Error("boom"))).toBe(1);
  });
});
