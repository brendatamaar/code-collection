import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detect } from "./detect.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "node-detect-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("detect (Node)", () => {
  it("returns empty array when no package.json found", async () => {
    expect(await detect({ repoPath: tmpDir } as any)).toHaveLength(0);
  });

  it.each([
    ["express", "express"],
    ["hono", "hono"],
    ["fastify", "fastify"],
    ["koa", "koa"]
  ])("detects %s with confidence 1.0", async (framework, expectedVariant) => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { [framework]: "^1.0.0" } })
    );
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results).toHaveLength(1);
    expect(results[0]?.confidence).toBe(1);
    expect(results[0]?.variant).toBe(expectedVariant);
  });

  it("also detects framework in devDependencies", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ devDependencies: { express: "^4.0.0" } })
    );
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results[0]?.variant).toBe("express");
  });

  it("does not detect NestJS (not supported in beta)", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { "@nestjs/core": "^10.0.0" } })
    );
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results).toHaveLength(0);
  });
});
