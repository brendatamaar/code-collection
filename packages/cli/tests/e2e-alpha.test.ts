import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  IR,
  resolveOptions,
  runPipeline,
  validateIR,
  type HttpMethod
} from "@code-collection/core";
import { postmanEmitter } from "@code-collection/emitter";
import { springParser } from "@code-collection/parser-spring";
import { describe, expect, it } from "vitest";

const fixturePath = "fixtures/spring/alpha-fixture";
const expectedIrPath = join(fixturePath, "expected-ir.json");
const expectedPostmanPath = join(fixturePath, "expected-postman.json");
const outputDir = join(".tmp", "e2e-alpha");

describe("alpha fixture e2e", () => {
  it("validates the expected IR and extracts every alpha HTTP method", async () => {
    const expectedIr = IR.parse(JSON.parse(await readFile(expectedIrPath, "utf8")));
    expect(() => validateIR(expectedIr)).not.toThrow();

    const report = await runPipeline(
      resolveOptions({ path: fixturePath, stack: "spring", dryRun: true }),
      [springParser],
      [postmanEmitter]
    );

    expect(report.ir).toEqual(expectedIr);
    expect(report.warningCount).toBe(0);
    expect(methods(report.ir.endpoints)).toEqual([
      "DELETE",
      "GET",
      "PATCH",
      "POST",
      "PUT"
    ]);
  });

  it("emits byte-identical Postman output and is deterministic", async () => {
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });

    const firstOutput = join(outputDir, "alpha-first.json");
    const secondOutput = join(outputDir, "alpha-second.json");

    const firstRun = await runCli([
      "extract",
      toCliPath(fixturePath),
      "--stack",
      "spring",
      "--output",
      toCliPath(firstOutput)
    ]);
    const secondRun = await runCli([
      "extract",
      toCliPath(fixturePath),
      "--stack",
      "spring",
      "--output",
      toCliPath(secondOutput)
    ]);

    expect(firstRun.exitCode).toBe(0);
    expect(secondRun.exitCode).toBe(0);
    expect(firstRun.stdout).toContain("Parsed 6 endpoints");
    expect(secondRun.stdout).toContain("Parsed 6 endpoints");
    expect(firstRun.stderr).not.toContain("Parsed 6 endpoints");
    expect(secondRun.stderr).not.toContain("Parsed 6 endpoints");

    const expectedBytes = await readFile(expectedPostmanPath, "utf8");
    const firstBytes = await readFile(firstOutput, "utf8");
    const secondBytes = await readFile(secondOutput, "utf8");

    expect(firstBytes).toBe(expectedBytes);
    expect(secondBytes).toBe(expectedBytes);
    expect(secondBytes).toBe(firstBytes);

    const collection = JSON.parse(expectedBytes) as {
      info?: { schema?: string };
      item?: unknown[];
    };
    expect(collection.info?.schema).toBe(
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    );
    expect(Array.isArray(collection.item)).toBe(true);
  }, 30_000);
});

function methods(endpoints: { method: HttpMethod }[]): HttpMethod[] {
  return [...new Set(endpoints.map((endpoint) => endpoint.method))].sort();
}

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
