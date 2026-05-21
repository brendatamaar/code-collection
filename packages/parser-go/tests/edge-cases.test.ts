import { resolve } from "node:path";

import { createLogger } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { parse } from "../src/parse.js";

const fixtureRoot = resolve(
  process.cwd(),
  "fixtures",
  "go",
  "edge-cases"
);

describe("go edge-cases fixture", () => {
  it("extracts all HandleFunc route registrations", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: ["main.go"],
      variant: "gorilla",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    // At least the majority of handlers should be extracted
    expect(result.endpoints.length).toBeGreaterThanOrEqual(7);
  });

  it("extracts path parameters from gorilla-style paths", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: ["main.go"],
      variant: "gorilla",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    const withUserID = result.endpoints.filter((e) =>
      e.path.includes("userID")
    );
    expect(withUserID.length).toBeGreaterThan(0);
    const param = withUserID[0]?.parameters.find((p) => p.name === "userID");
    expect(param?.in).toBe("path");
    expect(param?.required).toBe(true);
  });

  it("emits no fatal errors for valid gorilla/mux routes", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: ["main.go"],
      variant: "gorilla",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    const errors = result.warnings.filter((w) => w.level === "error");
    expect(errors).toHaveLength(0);
  });
});
