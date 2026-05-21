import { resolve } from "node:path";

import { createLogger } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { parse } from "../src/parse.js";

const fixtureRoot = resolve(
  process.cwd(),
  "fixtures",
  "node",
  "edge-cases"
);

describe("node edge-cases fixture", () => {
  it("extracts the health route defined directly on app", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [
        "src/app.ts",
        "src/routes/users.ts",
        "src/routes/orders.ts"
      ],
      variant: "express",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    const paths = result.endpoints.map((e) => `${e.method} ${e.path}`);
    expect(paths).toContain("GET /health");
  });

  it("extracts routes from the users sub-router file", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [
        "src/app.ts",
        "src/routes/users.ts",
        "src/routes/orders.ts"
      ],
      variant: "express",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    // Routes in users.ts are extracted; prefix is resolved from app.ts mount
    const userPaths = result.endpoints
      .filter((e) => e.tags.includes("usersRouter"))
      .map((e) => `${e.method} ${e.path}`);

    expect(userPaths.length).toBeGreaterThan(0);
  });

  it("emits no parse errors for valid Express code", async () => {
    const result = await parse({
      repoPath: fixtureRoot,
      files: [
        "src/app.ts",
        "src/routes/users.ts",
        "src/routes/orders.ts"
      ],
      variant: "express",
      options: {},
      logger: createLogger({ level: "silent", ci: true })
    });

    const errors = result.warnings.filter((w) => w.level === "error");
    expect(errors).toHaveLength(0);
  });
});
