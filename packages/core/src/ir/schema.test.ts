import { describe, expect, it } from "vitest";

import { IR, Schema } from "./schema.js";

const exampleIr = {
  irVersion: "1.0",
  metadata: {
    extractedAt: "2026-05-16T10:30:00Z",
    toolVersion: "1.0.0",
    stack: "spring",
    stackVariant: "spring-boot",
    repoPath: "/Users/paduka/pln-user-service",
    fileCount: 142
  },
  info: {
    title: "pln-user-service",
    version: "0.0.1-SNAPSHOT"
  },
  servers: [{ url: "{{baseUrl}}" }],
  auth: [
    {
      id: "spring-security",
      type: "bearer",
      bearerFormat: "JWT",
      description: "Detected Spring Security with JWT filter"
    }
  ],
  schemas: {
    UserDTO: {
      type: "object",
      properties: {
        id: { type: "integer", format: "int64" },
        name: { type: "string" },
        email: { type: "string", format: "email" }
      },
      required: ["id", "name", "email"]
    },
    CreateUserRequest: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string" }
      },
      required: ["name", "email"]
    }
  },
  endpoints: [
    {
      id: "8a3f",
      method: "GET",
      path: "/api/v1/users/{id}",
      operationId: "getUser",
      tags: ["UserController"],
      version: "v1",
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
            "application/json": { schema: { $ref: "#/schemas/UserDTO" } }
          }
        }
      },
      security: [
        {
          schemeId: "spring-security",
          description: "@PreAuthorize isAuthenticated()"
        }
      ],
      source: {
        file: "src/main/java/com/pln/UserController.java",
        line: 12
      }
    },
    {
      id: "b71e",
      method: "POST",
      path: "/api/v1/users",
      operationId: "createUser",
      tags: ["UserController"],
      version: "v1",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/schemas/CreateUserRequest" }
          }
        }
      },
      responses: {
        "200": {
          content: {
            "application/json": { schema: { $ref: "#/schemas/UserDTO" } }
          }
        }
      },
      security: [
        {
          schemeId: "spring-security",
          description: "@PreAuthorize hasRole('ADMIN')"
        }
      ],
      source: {
        file: "src/main/java/com/pln/UserController.java",
        line: 17
      }
    }
  ],
  warnings: []
} as const;

describe("IR schema", () => {
  it("round-trips a valid IR and applies defaults", () => {
    const parsed = IR.parse({
      ...exampleIr,
      endpoints: [
        {
          id: "health",
          method: "GET",
          path: "/health",
          source: { file: "src/Health.java", line: 1 }
        }
      ]
    });

    expect(parsed.endpoints[0]).toMatchObject({
      tags: [],
      parameters: [],
      responses: {},
      security: []
    });
    expect(parsed.auth).toEqual(exampleIr.auth);
  });

  it("rejects missing required fields", () => {
    expect(() =>
      IR.parse({
        irVersion: "1.0",
        metadata: exampleIr.metadata,
        endpoints: []
      })
    ).toThrow();
  });

  it("round-trips recursive schemas and schema refs", () => {
    const schema = Schema.parse({
      type: "object",
      properties: {
        children: {
          type: "array",
          items: { $ref: "#/schemas/TreeNode" }
        }
      }
    });

    expect(schema).toEqual({
      type: "object",
      properties: {
        children: {
          type: "array",
          items: { $ref: "#/schemas/TreeNode" }
        }
      }
    });
  });

  it("parses the worked example from the IR spec", () => {
    expect(() => IR.parse(exampleIr)).not.toThrow();
  });
});
