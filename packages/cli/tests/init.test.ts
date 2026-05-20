import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import { loadConfigFile } from "@code-collection/core";
import { describe, expect, it } from "vitest";

const fixtureRoot = join(
  process.cwd(),
  "packages",
  "cli",
  "tests",
  "fixtures",
  "init-cli"
);

describe("init command", () => {
  it("writes a loadable default config without prompts when --yes is passed", async () => {
    await rm(fixtureRoot, { recursive: true, force: true });
    await mkdir(fixtureRoot, { recursive: true });

    try {
      const { stdout, stderr, exitCode } = await runCli([
        "init",
        toCliPath(fixtureRoot),
        "--yes",
        "--gitignore"
      ]);

      expect(exitCode).toBe(0);
      expect(stderr).not.toContain("Config already exists");
      expect(stdout).toContain("Created");

      const config = loadConfigFile({ repoPath: fixtureRoot });
      expect(config.stack).toBe("auto");
      expect(config.output?.formats).toEqual(["postman"]);
      expect(config.output?.file).toBe("./api-collection.json");

      await expect(readFile(join(fixtureRoot, ".gitignore"), "utf8")).resolves.toContain(
        "api-collections/"
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 15_000);
});

function toCliPath(path: string): string {
  return path.replaceAll("\\", "/");
}

async function runCli(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
}> {
  const child = spawn("bun", ["run", "cli", "--", ...args], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.on("close", resolveExit);
  });

  return {
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    exitCode
  };
}
