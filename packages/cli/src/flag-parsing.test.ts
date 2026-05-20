import { describe, expect, it } from "vitest";

import { toCliFlags } from "./flag-parsing.js";

describe("toCliFlags", () => {
  it("maps extract command arguments to typed CLI flags", () => {
    expect(
      toCliFlags({
        path: "fixture",
        format: "bruno",
        stack: "node",
        output: "out.json",
        "base-url": ["staging=https://staging.example", "prod=https://api.example"],
        "split-by-version": true,
        include: ["src/**/*.ts"],
        exclude: ["**/*.test.ts"],
        config: "code-collection.config.ts",
        profile: "staging",
        report: "report.json",
        "no-warnings": true,
        verbose: true,
        quiet: false,
        "no-color": true,
        ci: true,
        "dry-run": true,
        stdout: true
      })
    ).toMatchObject({
      path: "fixture",
      format: "bruno",
      stack: "node",
      output: "out.json",
      baseUrl: ["staging=https://staging.example", "prod=https://api.example"],
      splitByVersion: true,
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts"],
      config: "code-collection.config.ts",
      profile: "staging",
      report: "report.json",
      noWarnings: true,
      verbose: true,
      quiet: false,
      noColor: true,
      ci: true,
      dryRun: true,
      stdout: true
    });
  });

  it("rejects unsupported format and stack values", () => {
    expect(() => toCliFlags({ format: "curl" })).toThrow("Invalid format");
    expect(() => toCliFlags({ stack: "rails" })).toThrow("Invalid stack");
  });
});
