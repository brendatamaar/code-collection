import type { Endpoint } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { groupEndpoints } from "./grouping.js";

function endpoint(method: Endpoint["method"], path: string, tag?: string): Endpoint {
  return {
    id: `${method}-${path}`,
    method,
    path,
    tags: tag ? [tag] : [],
    parameters: [],
    responses: {},
    security: [],
    source: { file: "src/Test.java", line: 1 }
  };
}

describe("groupEndpoints", () => {
  it("groups by first tag and sorts folders and requests deterministically", () => {
    expect(
      groupEndpoints([
        endpoint("POST", "/orders", "OrderController"),
        endpoint("GET", "/users", "UserController"),
        endpoint("GET", "/orders/{id}", "OrderController")
      ]).map((folder) => ({
        name: folder.name,
        item: folder.item.map((item) => item.name)
      }))
    ).toEqual([
      { name: "OrderController", item: ["GET /orders/{id}", "POST /orders"] },
      { name: "UserController", item: ["GET /users"] }
    ]);
  });

  it("falls back to first path segment", () => {
    expect(groupEndpoints([endpoint("GET", "/health")])[0]?.name).toBe("health");
  });
});
