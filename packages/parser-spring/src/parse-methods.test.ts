import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { WarningCode } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { extractControllers } from "./parse-controller.js";
import { extractMethods } from "./parse-methods.js";
import { parseFile } from "./tree-sitter.js";

const fixtureDir = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "methods"
);

async function extractFixture(fileName: string) {
  const content = await readFile(join(fixtureDir, fileName), "utf8");
  const tree = parseFile(content);
  const [controller] = extractControllers(tree, {
    file: `src/main/java/com/example/${fileName}`,
    content
  });

  if (!controller) {
    throw new Error(`No controller found in ${fileName}`);
  }

  return extractMethods(controller.node, {
    file: `src/main/java/com/example/${fileName}`,
    content
  });
}

describe("extractMethods", () => {
  it.each([
    ["GetController.java", "GET", "/{id}", "getUser"],
    ["PostController.java", "POST", "", "createUser"],
    ["PutController.java", "PUT", "/{id}", "replaceUser"],
    ["PatchController.java", "PATCH", "/{id}", "patchUser"],
    ["DeleteController.java", "DELETE", "/{id}", "deleteUser"]
  ])("extracts %s mapping", async (fileName, method, path, methodName) => {
    const [extracted] = await extractFixture(fileName);

    expect(extracted).toMatchObject({
      httpMethod: method,
      path,
      methodName,
      rawReturnType: method === "DELETE" ? "void" : "UserDTO",
      source: {
        file: `src/main/java/com/example/${fileName}`
      }
    });
  });

  it("extracts RequestMapping method values", async () => {
    const [extracted] = await extractFixture("RequestMappingController.java");

    expect(extracted).toMatchObject({
      httpMethod: "POST",
      path: "/search",
      methodName: "search"
    });
  });

  it("captures raw parameter info", async () => {
    const [extracted] = await extractFixture("GetController.java");

    expect(extracted?.rawParameters).toEqual([
      {
        name: "id",
        type: "Long",
        annotations: ["@PathVariable"]
      }
    ]);
  });

  it("emits a warning and uses the first path for multiple paths", async () => {
    const [extracted] = await extractFixture("MultiplePathsController.java");

    expect(extracted).toMatchObject({
      httpMethod: "GET",
      path: "/users"
    });
    expect(extracted?.warnings).toContainEqual({
      level: "warning",
      code: WarningCode.UNSUPPORTED_MULTIPLE_PATHS,
      message:
        "Multiple mapping paths are not fully expanded in alpha; using the first path"
    });
  });
});
