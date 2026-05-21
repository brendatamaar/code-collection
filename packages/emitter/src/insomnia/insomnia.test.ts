import { describe, expect, it } from "vitest";

import type { IR } from "@code-collection/core";

import { assembleExport } from "./index.js";
import { pathToInsomniaUrl } from "./request.js";

function makeIR(overrides: Partial<IR> = {}): IR {
  return {
    irVersion: "1.0",
    metadata: {
      extractedAt: "2026-05-21T00:00:00Z",
      toolVersion: "0.5.0-beta",
      stack: "spring",
      repoPath: "/repo",
      fileCount: 1
    },
    info: { title: "test-api", version: "1.0.0" },
    servers: [{ url: "https://api.example.com" }],
    auth: [],
    endpoints: [],
    schemas: {},
    tags: [],
    warnings: [],
    ...overrides
  };
}

const baseOptions = {
  outputPath: "/tmp/out",
  splitByVersion: false
};

describe("assembleExport", () => {
  it("produces workspace as first resource", () => {
    const result = assembleExport(makeIR(), baseOptions);
    expect(result.resources[0]?._type).toBe("workspace");
    const ws = result.resources[0] as { name: string };
    expect(ws.name).toBe("test-api");
  });

  it("produces base environment as second resource", () => {
    const result = assembleExport(makeIR(), baseOptions);
    const env = result.resources[1] as { _type: string; name: string };
    expect(env._type).toBe("environment");
    expect(env.name).toBe("Base Environment");
  });

  it("sets __export_format to 4", () => {
    expect(assembleExport(makeIR(), baseOptions).__export_format).toBe(4);
  });

  it("uses deterministic export date", () => {
    expect(assembleExport(makeIR(), baseOptions).__export_date).toBe(
      "1970-01-01T00:00:00.000Z"
    );
  });

  it("is byte-identical on repeated runs (determinism)", () => {
    const ir = makeIR({
      auth: [{ id: "auth1", type: "bearer", bearerFormat: "JWT" }],
      endpoints: [
        {
          id: "ep1",
          method: "GET",
          path: "/users/{id}",
          tags: ["Users"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" }
            }
          ],
          security: [{ schemeId: "auth1" }],
          responses: {},
          source: { file: "src/controller.ts", line: 1 }
        }
      ]
    });
    const run1 = JSON.stringify(assembleExport(ir, baseOptions), null, 2);
    const run2 = JSON.stringify(assembleExport(ir, baseOptions), null, 2);
    expect(Buffer.compare(Buffer.from(run1), Buffer.from(run2))).toBe(0);
  });

  it("includes bearerToken in base environment for bearer auth", () => {
    const ir = makeIR({ auth: [{ id: "auth1", type: "bearer", bearerFormat: "JWT" }] });
    const env = assembleExport(ir, baseOptions).resources[1] as {
      data: Record<string, string>;
    };
    expect(env.data["bearerToken"]).toBe("");
  });

  it("includes username and password in base environment for basic auth", () => {
    const ir = makeIR({ auth: [{ id: "auth1", type: "basic" }] });
    const env = assembleExport(ir, baseOptions).resources[1] as {
      data: Record<string, string>;
    };
    expect(env.data["username"]).toBe("");
    expect(env.data["password"]).toBe("");
  });

  it("includes apiKey in base environment for apiKey auth", () => {
    const ir = makeIR({
      auth: [{ id: "auth1", type: "apiKey", name: "X-API-Key", in: "header" }]
    });
    const env = assembleExport(ir, baseOptions).resources[1] as {
      data: Record<string, string>;
    };
    expect(env.data["apiKey"]).toBe("");
  });

  it("creates named sub-environments when options.environments is provided", () => {
    const result = assembleExport(makeIR(), {
      ...baseOptions,
      environments: {
        dev: { baseUrl: "http://localhost:8080" },
        prod: { baseUrl: "https://api.example.com" }
      }
    });
    const envs = result.resources.filter((r) => r._type === "environment");
    expect(envs).toHaveLength(3);
    const names = envs.map((e) => (e as { name: string }).name);
    expect(names).toContain("dev");
    expect(names).toContain("prod");
  });

  it("groups endpoints into request_group resources", () => {
    const ir = makeIR({
      endpoints: [
        {
          id: "ep1",
          method: "GET",
          path: "/users",
          tags: ["Users"],
          parameters: [],
          security: [],
          responses: {},
          source: { file: "src/controller.ts", line: 1 }
        }
      ]
    });
    const groups = assembleExport(ir, baseOptions).resources.filter(
      (r) => r._type === "request_group"
    );
    expect(groups).toHaveLength(1);
    expect((groups[0] as { name: string }).name).toBe("Users");
  });

  it("emits bearer auth on request when security matches bearer scheme", () => {
    const ir = makeIR({
      auth: [{ id: "auth1", type: "bearer", bearerFormat: "JWT" }],
      endpoints: [
        {
          id: "ep1",
          method: "GET",
          path: "/users",
          tags: ["Users"],
          parameters: [],
          security: [{ schemeId: "auth1", description: "Bearer JWT" }],
          responses: {},
          source: { file: "src/controller.ts", line: 1 }
        }
      ]
    });
    const request = assembleExport(ir, baseOptions).resources.find(
      (r) => r._type === "request"
    ) as { authentication: { type: string; token: string } } | undefined;
    expect(request?.authentication.type).toBe("bearer");
    expect(request?.authentication.token).toBe("{{ _.bearerToken }}");
  });

  it("emits no auth when endpoint.security is empty", () => {
    const ir = makeIR({
      auth: [{ id: "auth1", type: "bearer", bearerFormat: "JWT" }],
      endpoints: [
        {
          id: "ep1",
          method: "GET",
          path: "/public",
          tags: ["Public"],
          parameters: [],
          security: [],
          responses: {},
          source: { file: "src/controller.ts", line: 1 }
        }
      ]
    });
    const request = assembleExport(ir, baseOptions).resources.find(
      (r) => r._type === "request"
    ) as { authentication: { type: string } } | undefined;
    expect(request?.authentication.type).toBe("none");
  });

  it("prefixes deprecated endpoint names with [DEPRECATED]", () => {
    const ir = makeIR({
      endpoints: [
        {
          id: "ep1",
          method: "GET",
          path: "/old",
          tags: ["Old"],
          deprecated: true,
          parameters: [],
          security: [],
          responses: {},
          source: { file: "src/controller.ts", line: 1 }
        }
      ]
    });
    const request = assembleExport(ir, baseOptions).resources.find(
      (r) => r._type === "request"
    ) as { name: string } | undefined;
    expect(request?.name).toMatch(/^\[DEPRECATED\]/);
  });

  it("uses options.baseUrl over servers[0].url in base environment", () => {
    const ir = makeIR({ servers: [{ url: "https://prod.example.com" }] });
    const result = assembleExport(ir, {
      ...baseOptions,
      baseUrl: "http://localhost:9090"
    });
    const env = result.resources[1] as { data: Record<string, string> };
    expect(env.data["baseUrl"]).toBe("http://localhost:9090");
  });
});

describe("pathToInsomniaUrl", () => {
  it("converts OpenAPI path params to Insomnia template syntax", () => {
    expect(pathToInsomniaUrl("/users/{id}")).toBe("{{ _.baseUrl }}/users/{{ id }}");
  });

  it("handles multiple path params", () => {
    expect(pathToInsomniaUrl("/orgs/{orgId}/repos/{repoId}")).toBe(
      "{{ _.baseUrl }}/orgs/{{ orgId }}/repos/{{ repoId }}"
    );
  });

  it("strips regex constraints from path params", () => {
    expect(pathToInsomniaUrl("/users/{id:[0-9]+}")).toBe(
      "{{ _.baseUrl }}/users/{{ id }}"
    );
  });

  it("handles paths with no params", () => {
    expect(pathToInsomniaUrl("/health")).toBe("{{ _.baseUrl }}/health");
  });
});
