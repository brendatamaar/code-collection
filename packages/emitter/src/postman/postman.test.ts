import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

import type { IR } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { emitAuth } from "./auth.js";
import { emitInfo } from "./info.js";
import { emitVariables } from "./variables.js";
import { writeCollection } from "./write.js";

function makeIR(overrides: Partial<IR> = {}): IR {
  return {
    irVersion: "1.0",
    metadata: {
      extractedAt: "2026-05-16T10:30:00Z",
      toolVersion: "0.1.0",
      stack: "spring",
      repoPath: "/repo",
      fileCount: 1
    },
    info: {
      title: "billing-api",
      description: "Billing API",
      version: "0.1.0"
    },
    servers: [{ url: "https://api.example.com" }],
    auth: [],
    tags: [],
    schemas: {},
    endpoints: [],
    warnings: [],
    ...overrides
  };
}

describe("postman info", () => {
  it("emits deterministic info block", () => {
    expect(emitInfo(makeIR())).toEqual({
      name: "billing-api",
      description: "Billing API\n\nVersion: 0.1.0",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      _postman_id: createHash("sha1").update("billing-api0.1.0").digest("hex")
    });
  });
});

describe("postman variables", () => {
  it("emits baseUrl from the first server", () => {
    expect(emitVariables(makeIR())).toEqual([
      { key: "baseUrl", value: "https://api.example.com" }
    ]);
  });

  it("lets options override baseUrl", () => {
    expect(emitVariables(makeIR(), { baseUrl: "http://localhost:8080" })).toEqual([
      { key: "baseUrl", value: "http://localhost:8080" }
    ]);
  });

  it("adds auth variables", () => {
    expect(
      emitVariables(
        makeIR({
          auth: [{ id: "spring-security", type: "bearer" }]
        })
      )
    ).toEqual([
      { key: "baseUrl", value: "https://api.example.com" },
      { key: "bearerToken", value: "" }
    ]);
  });
});

describe("postman auth", () => {
  it("emits bearer auth", () => {
    expect(
      emitAuth(
        makeIR({
          auth: [{ id: "spring-security", type: "bearer" }]
        })
      )
    ).toEqual({
      type: "bearer",
      bearer: [{ key: "token", value: "{{bearerToken}}", type: "string" }]
    });
  });

  it("emits basic auth", () => {
    expect(
      emitAuth(
        makeIR({
          auth: [{ id: "basic", type: "basic" }]
        })
      )
    ).toEqual({
      type: "basic",
      basic: [
        { key: "username", value: "{{username}}", type: "string" },
        { key: "password", value: "{{password}}", type: "string" }
      ]
    });
  });

  it("emits api key auth", () => {
    expect(
      emitAuth(
        makeIR({
          auth: [{ id: "api-key", type: "apiKey", in: "header", name: "X-API-Key" }]
        })
      )
    ).toEqual({
      type: "apikey",
      apikey: [
        { key: "key", value: "X-API-Key", type: "string" },
        { key: "value", value: "{{apiKey}}", type: "string" },
        { key: "in", value: "header", type: "string" }
      ]
    });
  });
});

describe("writeCollection", () => {
  it("writes pretty JSON via temp file rename", async () => {
    const dir = await mkdtemp(join(tmpdir(), "postman-write-"));
    const path = join(dir, "collection.json");
    const result = await writeCollection({ info: { name: "demo" }, item: [] }, path);

    await expect(readFile(`${path}.tmp`, "utf8")).rejects.toThrow();
    await expect(readFile(path, "utf8")).resolves.toBe(
      '{\n  "info": {\n    "name": "demo"\n  },\n  "item": []\n}\n'
    );
    expect(result).toEqual({
      path,
      bytes: Buffer.byteLength(
        '{\n  "info": {\n    "name": "demo"\n  },\n  "item": []\n}\n'
      )
    });
  });
});
