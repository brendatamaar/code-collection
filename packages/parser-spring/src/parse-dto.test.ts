import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Schema, Warning } from "@code-collection/core";
import { describe, expect, it } from "vitest";

type ObjSchema = { properties?: Record<string, Schema>; required?: string[] };

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
    expect(registry.AddressDTO).toEqual({
      type: "object",
      properties: {
        street: { type: "string" }
      }
    });
    expect(registry.UserWithAddressDTO).toEqual(schema);
  });

  it("registers and returns a placeholder when class is missing", async () => {
    const registry: Record<string, Schema> = {};

    expect(inferDtoSchema("MissingDTO", await fixtureTree(), registry)).toEqual({
      type: "object"
    });
    expect(registry.MissingDTO).toEqual({ type: "object" });
  });

  it("emits LOMBOK_INFERRED info and infers fields from @Data class", async () => {
    const warnings: Warning[] = [];
    const schema = inferDtoSchema("LombokUserDTO", await fixtureTree(), {}, warnings);

    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "LOMBOK_INFERRED" })
    );
    expect((schema as ObjSchema).properties).toHaveProperty("id");
    expect((schema as ObjSchema).properties).toHaveProperty("name");
  });

  it("includes superclass fields one level deep for AuditedDTO", async () => {
    const schema = inferDtoSchema("AuditedDTO", await fixtureTree());

    expect((schema as ObjSchema).properties).toHaveProperty("createdBy");
    expect((schema as ObjSchema).properties).toHaveProperty("title");
  });

  it("emits CYCLIC_SCHEMA_REFERENCE and stops recursion for SelfRefDTO", async () => {
    const warnings: Warning[] = [];
    const schema = inferDtoSchema("SelfRefDTO", await fixtureTree(), {}, warnings);

    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "CYCLIC_SCHEMA_REFERENCE" })
    );
    expect((schema as ObjSchema).properties).toHaveProperty("name");
  });

  it("maps List<String> to array schema", async () => {
    const schema = inferDtoSchema("GenericDTO", await fixtureTree());

    expect((schema as ObjSchema).properties?.["items"]).toEqual({
      type: "array",
      items: { type: "string" }
    });
  });

  it("maps Optional<AddressDTO> to nullable ref", async () => {
    const schema = inferDtoSchema("GenericDTO", await fixtureTree());

    expect((schema as ObjSchema).properties?.["optionalAddress"]).toEqual({
      $ref: "#/schemas/AddressDTO"
    });
  });

  it("maps Map<String, Object> to object with additionalProperties", async () => {
    const schema = inferDtoSchema("GenericDTO", await fixtureTree());

    expect((schema as ObjSchema).properties?.["metadata"]).toEqual({
      type: "object",
      additionalProperties: true
    });
  });
});
