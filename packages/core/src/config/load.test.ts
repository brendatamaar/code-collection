import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findConfigFile, loadConfigFile } from "./load.js";

const fixtureRoot = join(process.cwd(), ".tmp", "config-load");

describe("loadConfigFile", () => {
  it("loads discovered JSON config files", async () => {
    const repoPath = join(fixtureRoot, "json");
    await reset(repoPath);
    await writeFile(
      join(repoPath, "code-collection.config.json"),
      JSON.stringify({ stack: "go", output: { formats: ["bruno"] } }),
      "utf8"
    );

    expect(findConfigFile(repoPath)).toBe(join(repoPath, "code-collection.config.json"));
    expect(loadConfigFile({ repoPath })).toMatchObject({
      stack: "go",
      output: { formats: ["bruno"] }
    });
  });

  it("loads the code-collection field from package.json", async () => {
    const repoPath = join(fixtureRoot, "package-json");
    await reset(repoPath);
    await writeFile(
      join(repoPath, "package.json"),
      JSON.stringify({
        name: "fixture",
        "code-collection": {
          stack: "node",
          include: ["src/**/*.ts"]
        }
      }),
      "utf8"
    );

    expect(findConfigFile(repoPath)).toBe(join(repoPath, "package.json"));
    expect(loadConfigFile({ repoPath })).toMatchObject({
      stack: "node",
      include: ["src/**/*.ts"]
    });
  });
});

async function reset(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
  await mkdir(path, { recursive: true });
}
