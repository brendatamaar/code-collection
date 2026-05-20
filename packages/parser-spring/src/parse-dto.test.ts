import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Schema } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { inferDtoSchema } from "./parse-dto.js";
import { parseFile } from "./tree-sitter.js";

const fixturePath = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "dto",
  "UserDTO.java"
);

async function fixtureTree() {
  return parseFile(await readFile(fixturePath, "utf8"));
}

describe("inferDtoSchema", () => {
  it("infers primitive POJO fields", async () => {
    const schema = inferDtoSchema("PrimitiveDTO", await fixtureTree());

    expect(schema).toEqual({
      type: "object",
      properties: {
        id: { type: "integer", format: "int64" },
        name: { type: "string" },
        active: { type: "boolean" },
        score: { type: "number", format: "double" }
      },
      required: ["active"]
    });
  });

  it("marks reference fields required when validation annotations are present", async () => {
    const schema = inferDtoSchema("ValidatedDTO", await fixtureTree());

    expect(schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        description: { type: "string" }
      },
      required: ["name", "email", "description"]
    });
  });

  it("maps nested custom types to refs and registers placeholders", async () => {
    const registry: Record<string, Schema> = {};
    const schema = inferDtoSchema("UserWithAddressDTO", await fixtureTree(), registry);

    expect(schema).toEqual({
      type: "object",
      properties: {
        id: { type: "integer", format: "int64" },
        address: { $ref: "#/schemas/AddressDTO" }
      }
    });
    expect(registry.AddressDTO).toEqual({ type: "object" });
    expect(registry.UserWithAddressDTO).toEqual(schema);
  });

  it("registers and returns a placeholder when class is missing", async () => {
    const registry: Record<string, Schema> = {};

    expect(inferDtoSchema("MissingDTO", await fixtureTree(), registry)).toEqual({
      type: "object"
    });
    expect(registry.MissingDTO).toEqual({ type: "object" });
  });
});
