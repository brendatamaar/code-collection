import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractControllers } from "./parse-controller.js";
import { extractMethods } from "./parse-methods.js";
import { extractParameters } from "./parse-parameters.js";
import { parseFile } from "./tree-sitter.js";

const fixturePath = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "parameters",
  "ParameterController.java"
);

async function extractFixture(methodName: string) {
  const content = await readFile(fixturePath, "utf8");
  const tree = parseFile(content);
  const [controller] = extractControllers(tree, {
    file: "src/main/java/com/example/ParameterController.java",
    content
  });
  if (!controller) {
    throw new Error("No controller found");
  }

  const method = extractMethods(controller.node, {
    file: "src/main/java/com/example/ParameterController.java",
    content
  }).find((candidate) => candidate.methodName === methodName);

  if (!method) {
    throw new Error(`No method found: ${methodName}`);
  }

  return extractParameters(method.node, {
    file: "src/main/java/com/example/ParameterController.java",
    content
  });
}

describe("extractParameters", () => {
  it("extracts path, query, header, and cookie parameters", async () => {
    await expect(extractFixture("allKinds")).resolves.toEqual([
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer", format: "int64" }
      },
      {
        name: "q",
        in: "query",
        required: true,
        schema: { type: "string" }
      },
      {
        name: "X-Request-ID",
        in: "header",
        required: true,
        schema: { type: "string" }
      },
      {
        name: "session",
        in: "cookie",
        required: true,
        schema: { type: "string" }
      }
    ]);
  });

  it("does not return RequestBody parameters", async () => {
    await expect(extractFixture("withBody")).resolves.toEqual([]);
  });

  it("marks Optional and required=false query parameters as not required", async () => {
    await expect(extractFixture("optionalQuery")).resolves.toEqual([
      {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer", format: "int32" }
      },
      {
        name: "offset",
        in: "query",
        required: false,
        schema: { type: "integer", format: "int32" }
      }
    ]);
  });

  it("maps array, list, and custom class parameters", async () => {
    await expect(extractFixture("complexTypes")).resolves.toEqual([
      {
        name: "ids",
        in: "query",
        required: true,
        schema: {
          type: "array",
          items: { type: "integer", format: "int64" }
        }
      },
      {
        name: "names",
        in: "query",
        required: true,
        schema: {
          type: "array",
          items: { type: "string" }
        }
      },
      {
        name: "filter",
        in: "query",
        required: true,
        schema: { $ref: "#/schemas/UserFilter" }
      }
    ]);
  });
});
