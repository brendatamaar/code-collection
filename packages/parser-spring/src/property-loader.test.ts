import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadSpringProperties,
  parseProperties,
  parseYamlProperties,
  resolvePropertyPlaceholders
} from "./property-loader.js";

describe("parseProperties", () => {
  it("parses key=value pairs", () => {
    expect(parseProperties("server.port=8080\napp.name=demo")).toEqual({
      "server.port": "8080",
      "app.name": "demo"
    });
  });

  it("parses key: value pairs", () => {
    expect(parseProperties("server.port: 8080")).toEqual({ "server.port": "8080" });
  });

  it("ignores comments and blank lines", () => {
    expect(parseProperties("# comment\n\nkey=value")).toEqual({ key: "value" });
  });
});

describe("parseYamlProperties", () => {
  it("flattens nested YAML to dotted keys", () => {
    const yaml = `
server:
  port: 8080
  servlet:
    context-path: /api
`;
    expect(parseYamlProperties(yaml)).toEqual({
      "server.port": "8080",
      "server.servlet.context-path": "/api"
    });
  });

  it("handles flat scalar values", () => {
    expect(parseYamlProperties("app.name: demo")).toEqual({ "app.name": "demo" });
  });

  it("strips leading/trailing quotes from values", () => {
    expect(parseYamlProperties('key: "hello"')).toEqual({ key: "hello" });
  });

  it("ignores comment lines", () => {
    expect(parseYamlProperties("# comment\nkey: val")).toEqual({ key: "val" });
  });
});

describe("resolvePropertyPlaceholders", () => {
  const props = { "base.url": "https://example.com", "api.path": "/api" };

  it("resolves a simple placeholder", () => {
    expect(resolvePropertyPlaceholders("${base.url}", props)).toBe(
      "https://example.com"
    );
  });

  it("resolves embedded placeholder", () => {
    expect(resolvePropertyPlaceholders("url: ${base.url}${api.path}", props)).toBe(
      "url: https://example.com/api"
    );
  });

  it("returns the value unchanged when no placeholders", () => {
    expect(resolvePropertyPlaceholders("/static", props)).toBe("/static");
  });

  it("returns undefined for unresolved placeholder", () => {
    expect(resolvePropertyPlaceholders("${missing}", props)).toBeUndefined();
  });

  it("uses default from ${key:default} when key missing", () => {
    expect(resolvePropertyPlaceholders("${missing:fallback}", props)).toBe("fallback");
  });

  it("resolves transitive placeholders", () => {
    const chained = {
      a: "${b}",
      b: "${c}",
      c: "final"
    };
    expect(resolvePropertyPlaceholders("${a}", chained)).toBe("final");
  });

  it("returns undefined and does not loop forever on cyclic references (cycle guard)", () => {
    const cyclic = { a: "${b}", b: "${a}" };
    expect(resolvePropertyPlaceholders("${a}", cyclic)).toBeUndefined();
  });
});

describe("loadSpringProperties — filesystem integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "prop-test-"));
    await mkdir(join(tmpDir, "src", "main", "resources"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("loads application.yml", async () => {
    await writeFile(
      join(tmpDir, "src", "main", "resources", "application.yml"),
      "server:\n  port: 9000\n"
    );
    const result = await loadSpringProperties(tmpDir);
    expect(result["server.port"]).toBe("9000");
  });

  it("loads application.properties", async () => {
    await writeFile(
      join(tmpDir, "src", "main", "resources", "application.properties"),
      "app.name=test\n"
    );
    const result = await loadSpringProperties(tmpDir);
    expect(result["app.name"]).toBe("test");
  });

  it("merges profile override on top of default", async () => {
    await writeFile(
      join(tmpDir, "src", "main", "resources", "application.properties"),
      "server.port=8080\napp.mode=default\n"
    );
    await writeFile(
      join(tmpDir, "src", "main", "resources", "application-staging.properties"),
      "server.port=9090\n"
    );
    const result = await loadSpringProperties(tmpDir, { profile: "staging" });
    expect(result["server.port"]).toBe("9090");
    expect(result["app.mode"]).toBe("default");
  });

  it("resolves transitive placeholder references across the merged map", async () => {
    await writeFile(
      join(tmpDir, "src", "main", "resources", "application.properties"),
      "base.url=https://api.example.com\nfull.url=${base.url}/v1\n"
    );
    const result = await loadSpringProperties(tmpDir);
    expect(result["full.url"]).toBe("https://api.example.com/v1");
  });
});
