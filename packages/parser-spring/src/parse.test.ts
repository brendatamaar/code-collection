import { createHash } from "node:crypto";
import { join } from "node:path";

import { createLogger } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { parse } from "./parse.js";

const fixtureRoot = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "parse"
);

describe("parse", () => {
  it("extracts endpoints, parameters, bodies, responses, and DTO schemas", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: ["src/main/java/com/example/UserController.java"],
      variant: "spring-boot",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    expect(result.warnings).toEqual([]);
    expect(result.metadata).toEqual({
      stack: "spring",
      stackVariant: "spring-boot",
      fileCount: 1
    });
    expect(result.endpoints).toHaveLength(2);
    expect(result.endpoints[0]).toMatchObject({
      id: sha1("GET", "/api/v1/users/{id}", "src/main/java/com/example/UserController.java"),
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
            "application/json": {
              schema: { $ref: "#/schemas/UserDTO" }
            }
          }
        }
      },
      source: {
        file: "src/main/java/com/example/UserController.java"
      }
    });
    expect(result.endpoints[1]).toMatchObject({
      id: sha1("POST", "/api/v1/users", "src/main/java/com/example/UserController.java"),
      method: "POST",
      path: "/api/v1/users",
      operationId: "createUser",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/schemas/CreateUserRequest" }
          }
        }
      }
    });
    expect(result.schemas).toMatchObject({
      UserDTO: {
        type: "object",
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string" }
        }
      },
      CreateUserRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" }
        },
        required: ["name"]
      }
    });
  });

  it("converts per-file parse failures into warnings", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: ["src/main/java/com/example/Missing.java"],
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    expect(result.endpoints).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      level: "warning",
      code: "PARSE_FAILED",
      source: {
        file: "src/main/java/com/example/Missing.java",
        line: 1
      }
    });
  });
});

function sha1(method: string, path: string, file: string): string {
  return createHash("sha1").update(`${method}${path}${file}`).digest("hex");
}
