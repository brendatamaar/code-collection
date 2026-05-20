import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detect } from "./detect.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "laravel-detect-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("detect (Laravel)", () => {
  it("returns confidence 1 for composer.json with laravel/framework", async () => {
    await writeFile(
      join(tmpDir, "composer.json"),
      JSON.stringify({ require: { "laravel/framework": "^10.0" } })
    );
    const results = await detect({ repoPath: tmpDir } as any);
    const match = results.find((r) => r.confidence === 1);
    expect(match).toBeDefined();
    expect(match?.variant).toBe("laravel");
  });

  it("returns confidence 0.9 for artisan file", async () => {
    await writeFile(join(tmpDir, "artisan"), "#!/usr/bin/env php");
    const results = await detect({ repoPath: tmpDir } as any);
    const match = results.find((r) => r.confidence === 0.9);
    expect(match).toBeDefined();
    expect(match?.name).toBe("laravel");
  });

  it("returns confidence 0.5 for routes/api.php", async () => {
    await mkdir(join(tmpDir, "routes"), { recursive: true });
    await writeFile(join(tmpDir, "routes", "api.php"), "<?php\n");
    const results = await detect({ repoPath: tmpDir } as any);
    const match = results.find((r) => r.confidence === 0.5);
    expect(match).toBeDefined();
  });

  it("returns confidence 0.5 for routes/web.php", async () => {
    await mkdir(join(tmpDir, "routes"), { recursive: true });
    await writeFile(join(tmpDir, "routes", "web.php"), "<?php\n");
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results.some((r) => r.confidence === 0.5)).toBe(true);
  });

  it("always sets stackVariant to laravel", async () => {
    await writeFile(join(tmpDir, "artisan"), "#!/usr/bin/env php");
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results.every((r) => r.variant === "laravel")).toBe(true);
  });

  it("returns empty array for unrecognised directory", async () => {
    const results = await detect({ repoPath: tmpDir } as any);
    expect(results).toHaveLength(0);
  });
});
