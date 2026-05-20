import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parse } from "./parse.js";

const fixtureDir = join(
  process.cwd(),
  "packages",
  "parser-laravel",
  "tests",
  "fixtures",
  "alpha"
);

describe("parse (Laravel integration)", () => {
  it("extracts all endpoints from the alpha fixture", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: [],
      variant: "laravel",
      options: { includeFormRequests: false }
    } as any);

    expect(result.endpoints.length).toBe(8);
  });

  it("applies auth from group middleware to protected routes", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: [],
      variant: "laravel",
      options: { includeFormRequests: false }
    } as any);

    const users = result.endpoints.filter((e) => e.path.includes("/users"));
    expect(users.every((e) => e.security.length > 0)).toBe(true);

    const health = result.endpoints.find((e) => e.path === "/health");
    expect(health?.security).toHaveLength(0);
  });

  it("detects version from path", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: [],
      variant: "laravel",
      options: { includeFormRequests: false }
    } as any);

    const versioned = result.endpoints.filter((e) => e.version);
    expect(versioned.every((e) => e.version === "v1")).toBe(true);
  });

  it("registers laravel-auth scheme when endpoints have security", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: [],
      variant: "laravel",
      options: { includeFormRequests: false }
    } as any);

    expect(result.auth.some((a) => a.id === "laravel-auth")).toBe(true);
  });

  it("emits PARSE_FAILED on invalid route file path gracefully", async () => {
    const result = await parse({
      repoPath: fixtureDir,
      files: [],
      variant: "laravel",
      options: { routeFiles: ["routes/nonexistent.php"], includeFormRequests: false }
    } as any);

    expect(result.endpoints).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
