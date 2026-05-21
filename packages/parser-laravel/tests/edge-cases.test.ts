import { resolve } from "node:path";

import { createLogger } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { parse } from "../src/parse.js";

const fixtureRoot = resolve(
  process.cwd(),
  "fixtures",
  "laravel",
  "edge-cases"
);

describe("laravel edge-cases fixture", () => {
  it("extracts routes from nested prefix groups", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [],
      variant: "laravel",
      options: { routeFiles: ["routes/api.php"], includeFormRequests: false },
      logger: createLogger({ level: "silent", ci: true })
    });

    const paths = result.endpoints.map((e) => `${e.method} ${e.path}`);

    expect(paths).toContain("GET /v1/products");
    expect(paths).toContain("POST /v1/products");
    expect(paths).toContain("GET /v1/orders");
    expect(paths).toContain("POST /v1/orders");
    expect(paths).toContain("PATCH /v1/orders/{id}/status");
  });

  it("emits no fatal errors for valid laravel routes", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [],
      variant: "laravel",
      options: { routeFiles: ["routes/api.php"], includeFormRequests: false },
      logger: createLogger({ level: "silent", ci: true })
    });

    const errors = result.warnings.filter((w) => w.level === "error");
    expect(errors).toHaveLength(0);
  });
});
