import { describe, expect, it } from "vitest";

import { CodeCollectionError, WarningCode } from "../errors.js";
import type { Endpoint, IR } from "./schema.js";
import { validateIR } from "./validate.js";

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    id: "get-user",
    method: "GET",
    path: "/users/{id}",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer", format: "int64" }
      }
    ],
    responses: {
      "200": {
        content: {
          "application/json": {
            schema: { $ref: "#/schemas/User" }
          }
        }
      }
    },
    source: { file: "src/UserController.java", line: 10 },
    tags: [],
    security: [],
    ...overrides
  };
}

function makeIR(overrides: Partial<IR> = {}): IR {
  return {
    irVersion: "1.0",
    metadata: {
      extractedAt: "2026-05-16T10:30:00Z",
      toolVersion: "1.0.0",
      stack: "spring",
      repoPath: "/repo",
      fileCount: 1
    },
    info: {
      title: "test-api"
    },
    servers: [{ url: "{{baseUrl}}" }],
    auth: [],
    tags: [],
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer", format: "int64" }
        }
      }
    },
    endpoints: [makeEndpoint()],
    warnings: [],
    ...overrides
  };
}

function expectValidationError(ir: IR, messagePart: string): void {
  expect(() => validateIR(ir)).toThrow(CodeCollectionError);

  try {
    validateIR(ir);
  } catch (error) {
    expect(error).toBeInstanceOf(CodeCollectionError);
    expect((error as CodeCollectionError).code).toBe("IR_VALIDATION_FAILED");
    expect((error as Error).message).toContain(messagePart);
  }
}

describe("validateIR", () => {
  it("returns a valid IR unchanged", () => {
    const ir = makeIR();

    expect(validateIR(ir)).toBe(ir);
  });

  it("validates matching path parameters", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          path: "/users/{id}/{orgId}",
          parameters: [
            ...makeEndpoint().parameters,
            {
              name: "orgId",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ]
        })
      ]
    });

    expect(validateIR(ir)).toBe(ir);
  });

  it("rejects missing path parameters", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          parameters: []
        })
      ]
    });

    expectValidationError(ir, "endpoints[0].parameters missing path parameter");
  });

  it("validates auth scheme references", () => {
    const ir = makeIR({
      auth: [{ id: "bearer", type: "bearer" }],
      endpoints: [
        makeEndpoint({
          security: [{ schemeId: "bearer" }]
        })
      ]
    });

    expect(validateIR(ir)).toBe(ir);
  });

  it("rejects missing auth scheme references", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          security: [{ schemeId: "missing" }]
        })
      ]
    });

    expectValidationError(ir, "endpoints[0].security[0].schemeId");
  });

  it("validates schema references", () => {
    const ir = makeIR({
      schemas: {
        User: {
          type: "object",
          properties: {
            manager: { $ref: "#/schemas/User" }
          }
        }
      }
    });

    expect(validateIR(ir)).toBe(ir);
  });

  it("rejects missing schema references", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: { $ref: "#/schemas/Missing" }
                }
              }
            }
          }
        })
      ]
    });

    expectValidationError(ir, "endpoints[0].responses['200']");
  });

  it("validates unique endpoint IDs", () => {
    const firstEndpoint = makeEndpoint();
    const ir = makeIR({
      endpoints: [
        firstEndpoint,
        {
          ...firstEndpoint,
          id: "list-users",
          path: "/users",
          parameters: []
        }
      ]
    });

    expect(validateIR(ir)).toBe(ir);
  });

  it("rejects duplicate endpoint IDs", () => {
    const firstEndpoint = makeEndpoint();
    const ir = makeIR({
      endpoints: [
        firstEndpoint,
        {
          ...firstEndpoint,
          path: "/users/{id}/details"
        }
      ]
    });

    expectValidationError(ir, "endpoints[1].id duplicates endpoints[0].id");
  });

  it("validates response status code keys", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          responses: {
            "204": { description: "No content" },
            default: { description: "Unexpected error" }
          }
        })
      ]
    });

    expect(validateIR(ir)).toBe(ir);
  });

  it("rejects invalid response status code keys", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          responses: {
            OK: { description: "OK" }
          }
        })
      ]
    });

    expectValidationError(ir, "endpoints[0].responses['OK']");
  });

  it("adds a warning for GET request bodies", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/schemas/User" }
              }
            }
          }
        })
      ]
    });

    expect(validateIR(ir).warnings).toContainEqual({
      level: "warning",
      code: WarningCode.BODY_ON_GET_OR_DELETE,
      message: "GET /users/{id} declares a request body",
      source: { file: "src/UserController.java", line: 10 }
    });
  });

  it("does not warn for POST request bodies", () => {
    const ir = makeIR({
      endpoints: [
        makeEndpoint({
          method: "POST",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/schemas/User" }
              }
            }
          }
        })
      ]
    });

    expect(validateIR(ir).warnings).toEqual([]);
  });

  it("validates server URL placeholders", () => {
    const ir = makeIR({
      servers: [
        {
          url: "https://{env}.example.com",
          variables: {
            env: { default: "api" }
          }
        }
      ]
    });

    expect(validateIR(ir)).toBe(ir);
  });

  it("rejects missing server URL placeholders", () => {
    const ir = makeIR({
      servers: [{ url: "https://{env}.example.com" }]
    });

    expectValidationError(ir, "servers[0].url references missing variable");
  });
});
