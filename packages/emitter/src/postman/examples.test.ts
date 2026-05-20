import { describe, expect, it } from "vitest";

import { generateExample } from "./examples.js";

describe("generateExample", () => {
  it("generates primitive examples", () => {
    expect(generateExample({ type: "string" }, {})).toBe("string");
    expect(generateExample({ type: "string", format: "email" }, {})).toBe("user@example.com");
    expect(generateExample({ type: "integer" }, {})).toBe(0);
    expect(generateExample({ type: "boolean" }, {})).toBe(false);
  });

  it("generates object examples with required keys first", () => {
    expect(
      generateExample(
        {
          type: "object",
          properties: {
            zed: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" }
          },
          required: ["email"]
        },
        {}
      )
    ).toEqual({
      email: "user@example.com",
      name: "string",
      zed: "string"
    });
  });

  it("resolves refs and cyclic refs", () => {
    expect(
      generateExample(
        { $ref: "#/schemas/User" },
        {
          User: {
            type: "object",
            properties: {
              manager: { $ref: "#/schemas/User" }
            }
          }
        }
      )
    ).toEqual({ manager: {} });
  });
});
