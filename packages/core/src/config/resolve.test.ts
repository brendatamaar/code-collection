import { describe, expect, it } from "vitest";

import { DEFAULT_EXCLUDE_GLOBS, DEFAULT_OPTIONS } from "./defaults.js";
import { resolveOptions } from "./resolve.js";

describe("resolveOptions", () => {
  it("applies defaults", () => {
    const options = resolveOptions();

    expect(options).toMatchObject({
      repoPath: ".",
      stack: "auto",
      output: {
        formats: ["postman"],
        file: "./api-collection.json",
        splitByVersion: false
      },
      dryRun: false
    });
    expect(options.exclude).toEqual([...DEFAULT_EXCLUDE_GLOBS]);
  });

  it("lets CLI flags override defaults", () => {
    const options = resolveOptions({
      path: "./fixtures/spring/alpha-fixture",
      stack: "spring",
      format: "bruno",
      output: "./collections",
      profile: "staging",
      verbose: true,
      dryRun: true
    });

    expect(options.repoPath).toBe("./fixtures/spring/alpha-fixture");
    expect(options.stack).toBe("spring");
    expect(options.output.formats).toEqual(["bruno"]);
    expect(options.output.file).toBe("./collections");
    expect(options.output.directory).toBe("./collections");
    expect(options.parser.spring.profile).toBe("staging");
    expect(options.verbose).toBe(true);
    expect(options.dryRun).toBe(true);
  });

  it("concatenates CLI excludes with default excludes", () => {
    const options = resolveOptions({
      exclude: ["**/generated/**"]
    });

    expect(options.exclude).toEqual([
      ...DEFAULT_OPTIONS.exclude,
      "**/generated/**"
    ]);
  });

  it("expands all output formats", () => {
    const options = resolveOptions({
      format: "all"
    });

    expect(options.output.formats).toEqual(["postman", "bruno", "insomnia"]);
  });

  it("maps base URL flags to server defaults", () => {
    expect(resolveOptions({ baseUrl: ["http://localhost:8080"] }).servers).toEqual([
      { url: "http://localhost:8080" }
    ]);

    expect(
      resolveOptions({
        baseUrl: ["dev=http://localhost:8080", "prod=https://api.example.com"]
      }).servers
    ).toEqual([
      { url: "http://localhost:8080", description: "dev" },
      { url: "https://api.example.com", description: "prod" }
    ]);
  });
});
