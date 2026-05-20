import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detect } from "./detect.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "go-detect-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("detect (Go)", () => {
  it("returns empty array when no go.mod found", async () => {
    expect(await detect({ repoPath: tmpDir } as any)).toHaveLength(0);
  });

  it("returns confidence 1.0 for any go.mod", async () => {
    await writeFile(join(tmpDir, "go.mod"), "module example.com/app\n\ngo 1.21\n");
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results).toHaveLength(1);
    expect(results[0]?.confidence).toBe(1);
  });

  it.each([
    ["gin-gonic/gin", "gin"],
    ["labstack/echo", "echo"],
    ["gofiber/fiber", "fiber"],
    ["go-chi/chi", "chi"]
  ])("sets stackVariant to '%s' when go.mod contains %s", async (module, variant) => {
    await writeFile(
      join(tmpDir, "go.mod"),
      `module example.com/app\n\ngo 1.21\n\nrequire (\n\tgithub.com/${module} v1.0.0\n)\n`
    );
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results[0]?.variant).toBe(variant);
  });

  it("defaults stackVariant to stdlib when no known framework found", async () => {
    await writeFile(
      join(tmpDir, "go.mod"),
      "module example.com/app\n\ngo 1.21\n"
    );
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results[0]?.variant).toBe("stdlib");
  });
});
