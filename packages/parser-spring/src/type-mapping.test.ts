import { describe, expect, it } from "vitest";

import { mapJavaType } from "./type-mapping.js";

describe("mapJavaType", () => {
  it.each([
    ["String", { type: "string" }],
    ["int", { type: "integer", format: "int32" }],
    ["Integer", { type: "integer", format: "int32" }],
    ["long", { type: "integer", format: "int64" }],
    ["Long", { type: "integer", format: "int64" }],
    ["float", { type: "number", format: "float" }],
    ["Float", { type: "number", format: "float" }],
    ["double", { type: "number", format: "double" }],
    ["Double", { type: "number", format: "double" }],
    ["boolean", { type: "boolean" }],
    ["Boolean", { type: "boolean" }],
    ["LocalDate", { type: "string", format: "date" }],
    ["LocalDateTime", { type: "string", format: "date-time" }],
    ["Instant", { type: "string", format: "date-time" }],
    ["ZonedDateTime", { type: "string", format: "date-time" }],
    ["UUID", { type: "string", format: "uuid" }],
    ["BigDecimal", { type: "number" }]
  ])("maps %s", (javaType, schema) => {
    expect(mapJavaType(javaType).schema).toEqual(schema);
  });

  it("maps arrays and lists", () => {
    expect(mapJavaType("String[]").schema).toEqual({
      type: "array",
      items: { type: "string" }
    });
    expect(mapJavaType("List<Long>").schema).toEqual({
      type: "array",
      items: { type: "integer", format: "int64" }
    });
  });

  it("unwraps Optional and marks it not required", () => {
    expect(mapJavaType("Optional<Integer>")).toEqual({
      schema: { type: "integer", format: "int32" },
      required: false,
      typeName: "Integer"
    });
  });

  it("maps custom classes to schema refs", () => {
    expect(mapJavaType("UserDTO").schema).toEqual({
      $ref: "#/schemas/UserDTO"
    });
  });
});
