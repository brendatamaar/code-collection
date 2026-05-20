import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parse } from "./parse.js";

const fixtureDir = join(
  process.cwd(),
  "packages",
  "parser-go",
  "tests",
  "fixtures",
  "alpha"
);

describe("parse (Go integration)", () => {
  it("extracts all endpoints from the alpha fixture", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: ["main.go"],
      variant: "gin",
      options: {}
    } as any);

    expect(result.endpoints.length).toBe(4);
  });

  it("applies group prefix to grouped routes", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: ["main.go"],
      variant: "gin",
      options: {}
    } as any);

    const paths = result.endpoints.map((e) => e.path);
    expect(paths).toContain("/v1/users");
    expect(paths).toContain("/health");
  });

  it("detects auth from middleware name", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: ["main.go"],
      variant: "gin",
      options: {}
    } as any);

    const authed = result.endpoints.filter((e) => e.security.length > 0);
    expect(authed).toHaveLength(3);
    expect(result.auth.some((a) => a.id === "go-auth")).toBe(true);
  });

  it("detects version from path", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: ["main.go"],
      variant: "gin",
      options: {}
    } as any);

    const versioned = result.endpoints.filter((e) => e.version);
    expect(versioned.every((e) => e.version === "v1")).toBe(true);
  });
});
