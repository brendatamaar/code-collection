import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractControllers } from "./parse-controller.js";
import { parseFile } from "./tree-sitter.js";

const fixtureDir = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "controllers"
);

async function parseFixture(fileName: string) {
  const content = await readFile(join(fixtureDir, fileName), "utf8");
  return {
    tree: parseFile(content),
    source: {
      file: `src/main/java/com/example/${fileName}`,
      content
    }
  };
}

describe("extractControllers", () => {
  it("extracts RestController class metadata", async () => {
    const { tree, source } = await parseFixture("UserController.java");

    expect(extractControllers(tree, source)).toMatchObject([
      {
        name: "UserController",
        source: {
          file: "src/main/java/com/example/UserController.java",
          line: 7,
          column: 0
        },
        requestMapping: "/api/v1/users",
        authAnnotations: ['@PreAuthorize("isAuthenticated()")']
      }
    ]);
  });

  it("extracts Controller classes", async () => {
    const { tree, source } = await parseFixture("MvcController.java");

    expect(extractControllers(tree, source)).toMatchObject([
      {
        name: "MvcController",
        requestMapping: "/pages",
        authAnnotations: []
      }
    ]);
  });

  it("skips classes without controller annotations", async () => {
    const { tree, source } = await parseFixture("PlainService.java");

    expect(extractControllers(tree, source)).toEqual([]);
  });
});
