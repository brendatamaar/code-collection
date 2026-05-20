import { WarningCode, type PipelineReport } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { formatCiEvents } from "./ci-reporter.js";

describe("formatCiEvents", () => {
  it("emits valid JSON-lines events for CI mode", () => {
    const events = formatCiEvents(report())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string });

    expect(events.map((event) => event.type)).toEqual([
      "detect",
      "scan",
      "parse",
      "emit",
      "warning",
      "done"
    ]);
  });

  it("emits error event when an Error is provided", () => {
    const err = new Error("emitter failed");
    const events = formatCiEvents(report(), err)
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string; message?: string });

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.message).toBe("emitter failed");
  });

  it("error event appears before done event", () => {
    const types = formatCiEvents(report(), new Error("oops"))
      .trim()
      .split("\n")
      .map((line) => (JSON.parse(line) as { type: string }).type);

    expect(types.indexOf("error")).toBeLessThan(types.indexOf("done"));
  });
});

function report(): PipelineReport {
  return {
    ir: {
      irVersion: "1.0",
      metadata: {
        extractedAt: new Date(0).toISOString(),
        toolVersion: "0.5.0-beta",
        stack: "node",
        stackVariant: "express",
        repoPath: ".",
        fileCount: 1
      },
      info: {
        title: "fixture"
      },
      servers: [{ url: "{{baseUrl}}" }],
      auth: [],
      tags: [],
      schemas: {},
      endpoints: [],
      warnings: [
        {
          level: "warning",
          code: WarningCode.PARSE_FAILED,
          message: "parse failed"
        }
      ]
    },
    timings: [],
    warnings: [
      {
        level: "warning",
        code: WarningCode.PARSE_FAILED,
        message: "parse failed"
      }
    ],
    warningCount: 1,
    emittedFiles: [{ path: "collection.json", bytes: 12 }],
    dryRun: false
  };
}
