import { join, resolve } from "node:path";

import { createLogger } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { parse } from "../src/parse.js";

const fixtureRoot = resolve(
  process.cwd(),
  "fixtures",
  "spring",
  "edge-cases"
);

describe("spring edge-cases fixture", () => {
  it("extracts endpoints with regex path constraints", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [
        "src/main/java/dev/codecollection/edge/RegexController.java"
      ],
      variant: "spring-boot",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    expect(result.warnings).toEqual([]);
    expect(result.endpoints).toHaveLength(3);

    const getItem = result.endpoints.find(
      (e) => e.operationId === "getItem"
    );
    expect(getItem).toBeDefined();
    expect(getItem?.path).toBe("/api/v1/items/{id:[0-9]+}");
    const idParam = getItem?.parameters.find((p) => p.name === "id");
    expect(idParam?.in).toBe("path");
    expect(idParam?.required).toBe(true);
    if (idParam && "pattern" in idParam.schema) {
      expect(idParam.schema.pattern).toBe("[0-9]+");
    }
  });

  it("extracts @PreAuthorize as security requirement on all endpoints", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [
        "src/main/java/dev/codecollection/edge/RegexController.java"
      ],
      variant: "spring-boot",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    for (const endpoint of result.endpoints) {
      expect(endpoint.security.length).toBeGreaterThan(0);
    }
  });

  it("marks optional @RequestParam as not required", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [
        "src/main/java/dev/codecollection/edge/RegexController.java"
      ],
      variant: "spring-boot",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    const search = result.endpoints.find((e) => e.operationId === "searchItems");
    expect(search).toBeDefined();

    const qParam = search?.parameters.find((p) => p.name === "q");
    const sizeParam = search?.parameters.find((p) => p.name === "size");
    expect(qParam?.required).toBe(true);
    expect(sizeParam?.required).toBe(false);
  });
});
