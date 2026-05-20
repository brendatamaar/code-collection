import { describe, expect, it } from "vitest";

import { CodeCollectionError, WarningCode } from "./errors.js";

describe("CodeCollectionError", () => {
  it("captures code, suggestion, and cause", () => {
    const cause = new Error("underlying failure");
    const error = new CodeCollectionError({
      code: "STACK_NOT_DETECTED",
      message: "Could not detect a supported backend stack",
      suggestion: "Pass --stack explicitly.",
      cause
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CodeCollectionError");
    expect(error.code).toBe("STACK_NOT_DETECTED");
    expect(error.suggestion).toBe("Pass --stack explicitly.");
    expect(error.cause).toBe(cause);
  });

  it("serializes stable error fields", () => {
    const error = new CodeCollectionError({
      code: "IR_VALIDATION_FAILED",
      message: "IR validation failed"
    });

    expect(JSON.parse(JSON.stringify(error))).toEqual({
      name: "CodeCollectionError",
      code: "IR_VALIDATION_FAILED",
      message: "IR validation failed"
    });
  });

  it("exports reserved warning codes", () => {
    expect(WarningCode.DYNAMIC_PREFIX).toBe("DYNAMIC_PREFIX");
    expect(WarningCode.PARSE_FAILED).toBe("PARSE_FAILED");
    expect(WarningCode.WEBFLUX_FUNCTIONAL_ROUTES).toBe(
      "WEBFLUX_FUNCTIONAL_ROUTES"
    );
  });
});
