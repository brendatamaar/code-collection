import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractControllers } from "./parse-controller.js";
import { extractRequestBody, extractResponse } from "./parse-body.js";
import { extractMethods } from "./parse-methods.js";
import { parseFile } from "./tree-sitter.js";

const fixturePath = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "body",
  "BodyController.java"
);

async function methodNode(methodName: string) {
  const content = await readFile(fixturePath, "utf8");
  const tree = parseFile(content);
  const [controller] = extractControllers(tree, {
    file: "src/main/java/com/example/BodyController.java",
    content
  });
  if (!controller) {
    throw new Error("No controller found");
  }

  const method = extractMethods(controller.node, {
    file: "src/main/java/com/example/BodyController.java",
    content
  }).find((candidate) => candidate.methodName === methodName);

  if (!method) {
    throw new Error(`No method found: ${methodName}`);
  }

  return { node: method.node, content };
}

describe("extractRequestBody", () => {
  it("extracts RequestBody as JSON ref schema", async () => {
    const { node, content } = await methodNode("create");

    expect(extractRequestBody(node, content)).toEqual({
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/schemas/CreateUserRequest" }
        }
      }
    });
  });

  it("uses consumes content type when present", async () => {
    const { node, content } = await methodNode("upload");

    expect(extractRequestBody(node, content)).toEqual({
      required: true,
      content: {
        "text/plain": {
          schema: { type: "string" }
        }
      }
    });
  });

  it("honors RequestBody required=false", async () => {
    const { node, content } = await methodNode("optionalBody");

    expect(extractRequestBody(node, content)?.required).toBe(false);
  });

  it("returns undefined when no RequestBody exists", async () => {
    const { node, content } = await methodNode("list");

    expect(extractRequestBody(node, content)).toBeUndefined();
  });
});

describe("extractResponse", () => {
  it("maps custom return types to 200 JSON refs", async () => {
    const { node, content } = await methodNode("create");

    expect(extractResponse(node, content)).toEqual({
      "200": {
        content: {
          "application/json": {
            schema: { $ref: "#/schemas/UserDTO" }
          }
        }
      }
    });
  });

  it("maps void to no-content response", async () => {
    const { node, content } = await methodNode("delete");

    expect(extractResponse(node, content)).toEqual({
      "200": {
        description: "No content"
      }
    });
  });

  it("unwraps ResponseEntity<T>", async () => {
    const { node, content } = await methodNode("getEntity");

    expect(extractResponse(node, content)).toEqual({
      "200": {
        content: {
          "application/json": {
            schema: { $ref: "#/schemas/UserDTO" }
          }
        }
      }
    });
  });

  it("maps List<T> response to array schema", async () => {
    const { node, content } = await methodNode("list");

    expect(extractResponse(node, content)).toEqual({
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: { $ref: "#/schemas/UserDTO" }
            }
          }
        }
      }
    });
  });

  it("maps array response to array schema", async () => {
    const { node, content } = await methodNode("array");

    expect(extractResponse(node, content)["200"]?.content?.["application/json"]?.schema).toEqual({
      type: "array",
      items: { $ref: "#/schemas/UserDTO" }
    });
  });
});
