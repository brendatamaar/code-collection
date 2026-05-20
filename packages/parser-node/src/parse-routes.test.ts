import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseNodeRoutes } from "./parse-routes.js";
import { createProgram } from "./ts-program.js";

describe("parseNodeRoutes", () => {
  it("extracts mounted routes, all-method routes, and auth middleware", () => {
    const endpoints = parseNodeRoutes(
      "src/app.ts",
      `
app.use('/api', router);
router.get('/users/:id', requireAuth, getUser);
app.all('/health', health);
`
    );

    expect(endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).toEqual([
      "GET /api/users/{id}",
      "GET /health",
      "POST /health",
      "PUT /health",
      "PATCH /health",
      "DELETE /health",
      "HEAD /health",
      "OPTIONS /health"
    ]);
    expect(endpoints[0]?.security[0]?.schemeId).toBe("node-auth");
    expect(endpoints[0]?.parameters[0]?.name).toBe("id");
  });

  it("infers request bodies from TypeScript handler types", async () => {
    const fixtureDir = join(
      process.cwd(),
      "packages",
      "parser-node",
      "tests",
      ".tmp"
    );
    const fixtureFile = join(fixtureDir, "typed-route.ts");
    const content = `
interface UserDto {
  name: string;
  age?: number;
  active: boolean;
  tags: string[];
  profile: { nickname: string };
}

interface Request<Params = unknown, ResBody = unknown, ReqBody = unknown> {
  body: ReqBody;
}

declare const app: {
  post(path: string, handler: (req: Request<unknown, unknown, UserDto>) => void): void;
};

app.post('/users', (req: Request<unknown, unknown, UserDto>) => {
  void req.body;
});
`;

    await rm(fixtureDir, { recursive: true, force: true });
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(fixtureFile, content, "utf8");

    const program = createProgram([fixtureFile]);
    const sourceFile = program.getSourceFile(fixtureFile);
    const endpoints = parseNodeRoutes("src/typed-route.ts", content, {
      ...(sourceFile ? { sourceFile } : {}),
      typeChecker: program.getTypeChecker()
    });

    const schema = endpoints[0]?.requestBody?.content["application/json"]?.schema;
    expect(schema).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
        profile: { type: "object" }
      },
      required: ["name", "active", "tags", "profile"]
    });

    await rm(fixtureDir, { recursive: true, force: true });
  });
});
