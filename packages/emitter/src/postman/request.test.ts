import type { Endpoint } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { pathToPostmanUrl } from "./path.js";
import { emitRequest } from "./request.js";

const endpoint: Endpoint = {
  id: "create-user",
  method: "POST",
  path: "/api/v1/users/{id}",
  operationId: "createUser",
  tags: ["UserController"],
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "integer" } },
    { name: "page", in: "query", required: false, schema: { type: "integer" } },
    { name: "X-Trace", in: "header", required: true, schema: { type: "string" } }
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: "#/schemas/CreateUserRequest" }
      }
    }
  },
  responses: {},
  security: [{ schemeId: "bearer", description: "@PreAuthorize admin" }],
  source: { file: "src/UserController.java", line: 12 }
};

describe("pathToPostmanUrl", () => {
  it("converts IR path params and query params to Postman URL shape", () => {
    expect(pathToPostmanUrl(endpoint.path, endpoint.parameters)).toEqual({
      raw: "{{baseUrl}}/api/v1/users/:id?page=0",
      host: ["{{baseUrl}}"],
      path: ["api", "v1", "users", ":id"],
      query: [{ key: "page", value: "0", disabled: true }],
      variable: [{ key: "id", value: "", description: "id (integer)" }]
    });
  });
});

describe("emitRequest", () => {
  it("emits Postman request item with headers and JSON body", () => {
    expect(
      emitRequest(endpoint, {
        CreateUserRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            name: { type: "string" }
          },
          required: ["name"]
        }
      })
    ).toMatchObject({
      name: "createUser",
      request: {
        method: "POST",
        header: [
          { key: "X-Trace", value: "" },
          { key: "Content-Type", value: "application/json" }
        ],
        body: {
          mode: "raw",
          raw: '{\n  "name": "string",\n  "email": "user@example.com"\n}',
          options: { raw: { language: "json" } }
        },
        description:
          "**Auth required:** @PreAuthorize admin\n\n_Source: src/UserController.java:12_"
      },
      response: []
    });
  });
});
