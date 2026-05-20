import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_OPTIONS } from "../config/defaults.js";
import { WarningCode } from "../errors.js";
import type { Endpoint } from "../ir/schema.js";
import { runPipeline } from "./pipeline.js";
import type { Emitter, Parser } from "./types.js";

const endpoint: Endpoint = {
  id: "get-user",
  method: "GET",
  path: "/users/{id}",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" }
    }
  ],
  responses: {},
  source: { file: "src/UserController.java", line: 1 },
  tags: [],
  security: []
};

function parser(overrides: Partial<Parser> = {}): Parser {
  return {
    name: "spring",
    async detect() {
      return [
        {
          name: "spring",
          variant: "spring-boot",
          confidence: 1,
          markers: ["pom.xml"]
        }
      ];
    },
    async parse(ctx) {
      return {
        endpoints: [endpoint],
        schemas: {},
        auth: [],
        warnings: [],
        metadata: {
          stack: "spring",
          stackVariant: ctx.variant,
          fileCount: ctx.files.length
        }
      };
    },
    ...overrides
  };
}

function emitter(): Emitter {
  return {
    name: "postman",
    async emit() {
      return {
        files: [{ path: "./api-collection.json", bytes: 12 }],
        warnings: []
      };
    }
  };
}

async function repoFixture(testName: string): Promise<string> {
  const repoPath = join(process.cwd(), ".tmp", testName);
  await mkdir(join(repoPath, "src"), { recursive: true });
  await writeFile(join(repoPath, "pom.xml"), "<spring-boot-starter />");
  await writeFile(join(repoPath, "src", "UserController.java"), "class User {}");
  return repoPath;
}

describe("runPipeline", () => {
  it("runs detect, file resolution, parse, validate, emit, and report", async () => {
    const report = await runPipeline(
      {
        ...DEFAULT_OPTIONS,
        repoPath: await repoFixture("pipeline-success"),
        exclude: []
      },
      [parser()],
      [emitter()]
    );

    expect(report.ir.endpoints).toEqual([endpoint]);
    expect(report.ir.metadata.stack).toBe("spring");
    expect(report.emittedFiles).toEqual([
      { path: "./api-collection.json", bytes: 12 }
    ]);
    expect(report.timings.map((timing) => timing.step)).toEqual([
      "detect",
      "resolve-files",
      "parse",
      "merge",
      "validate",
      "emit"
    ]);
  });

  it("converts parser boundary errors to warnings and continues", async () => {
    const report = await runPipeline(
      {
        ...DEFAULT_OPTIONS,
        repoPath: await repoFixture("pipeline-parser-error"),
        exclude: []
      },
      [
        parser({
          async parse() {
            throw new Error("boom");
          }
        })
      ],
      [emitter()]
    );

    expect(report.warnings).toContainEqual({
      level: "warning",
      code: WarningCode.PARSER_FAILED,
      message: "spring parser failed: boom"
    });
    expect(report.ir.endpoints).toEqual([]);
  });

  it("skips emit when dryRun is true", async () => {
    const report = await runPipeline(
      {
        ...DEFAULT_OPTIONS,
        repoPath: await repoFixture("pipeline-dry-run"),
        exclude: [],
        dryRun: true
      },
      [parser()],
      [emitter()]
    );

    expect(report.dryRun).toBe(true);
    expect(report.emittedFiles).toEqual([]);
    expect(report.timings.map((timing) => timing.step)).not.toContain("emit");
  });

  it("runs an explicitly requested parser even when detection has no hits", async () => {
    const report = await runPipeline(
      {
        ...DEFAULT_OPTIONS,
        repoPath: await repoFixture("pipeline-forced-stack"),
        exclude: [],
        stack: "spring",
        dryRun: true
      },
      [
        parser({
          async detect() {
            return [];
          }
        })
      ],
      [emitter()]
    );

    expect(report.ir.endpoints).toEqual([endpoint]);
    expect(report.ir.metadata.stack).toBe("spring");
  });
});
