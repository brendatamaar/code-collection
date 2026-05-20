import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { IR, resolveOptions, runPipeline } from "@code-collection/core";
import { postmanEmitter } from "@code-collection/emitter";
import { nodeParser } from "@code-collection/parser-node";
import { springParser } from "@code-collection/parser-spring";
import { describe, expect, it } from "vitest";

const fixturePath = "fixtures/multi-stack/spring-plus-node";

describe("multi-stack e2e", () => {
  it("detects and merges Spring plus Node endpoints in auto mode", async () => {
    const report = await runPipeline(
      resolveOptions({
        path: fixturePath,
        stack: "auto",
        dryRun: true,
        exclude: []
      }),
      [springParser, nodeParser],
      [postmanEmitter]
    );
    const expectedIr = IR.parse(
      JSON.parse(
        await readFile(join(fixturePath, "expected-ir.json"), "utf8")
      )
    );

    expect(report.ir).toEqual(expectedIr);
    expect(report.ir.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`).sort()).toEqual([
      "GET /api/v1/users",
      "GET /bff/v1/users/{id}"
    ]);
    expect(report.ir.auth.map((scheme) => scheme.id)).toContain("node-auth");
    expect(report.warningCount).toBe(0);
  });
});
