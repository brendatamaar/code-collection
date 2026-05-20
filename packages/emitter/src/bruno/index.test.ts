import type { IR } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { emitCollectionFiles } from "./index.js";

describe("emitCollectionFiles", () => {
  it("emits deterministic Bruno collection files", () => {
    const ir: IR = {
      irVersion: "1.0",
      metadata: {
        extractedAt: new Date(0).toISOString(),
        toolVersion: "0.1.0",
        stack: "spring",
        repoPath: ".",
        fileCount: 1
      },
      info: { title: "demo" },
      servers: [],
      auth: [{ id: "auth", type: "bearer" }],
      tags: [{ name: "Users", description: "User operations" }],
      schemas: {},
      endpoints: [
        {
          id: "get-users",
          method: "GET",
          path: "/users",
          operationId: "listUsers",
          tags: ["Users"],
          parameters: [],
          responses: {},
          security: [{ schemeId: "auth" }],
          source: { file: "UserController.java", line: 1 }
        }
      ],
      warnings: []
    };

    const files = emitCollectionFiles(ir);

    expect(files.map((file) => file.relativePath)).toEqual([
      "bruno.json",
      "Users/folder.bru",
      "Users/listUsers.bru"
    ]);
    expect(files[2]?.content).toContain("auth:bearer");
    expect(files).toEqual(emitCollectionFiles(ir));
  });
});
