import type { Schema } from "@code-collection/core";

export interface TypeMappingResult {
  schema: Schema;
  required: boolean;
  typeName: string;
}

const PRIMITIVE_TYPES: Record<string, Schema> = {
  String: { type: "string" },
  int: { type: "integer", format: "int32" },
  Integer: { type: "integer", format: "int32" },
  long: { type: "integer", format: "int64" },
  Long: { type: "integer", format: "int64" },
  float: { type: "number", format: "float" },
  Float: { type: "number", format: "float" },
  double: { type: "number", format: "double" },
  Double: { type: "number", format: "double" },
  boolean: { type: "boolean" },
  Boolean: { type: "boolean" },
  "java.time.LocalDate": { type: "string", format: "date" },
  LocalDate: { type: "string", format: "date" },
  "java.time.LocalDateTime": { type: "string", format: "date-time" },
  LocalDateTime: { type: "string", format: "date-time" },
  Instant: { type: "string", format: "date-time" },
  ZonedDateTime: { type: "string", format: "date-time" },
  "java.util.UUID": { type: "string", format: "uuid" },
  UUID: { type: "string", format: "uuid" },
  "java.math.BigDecimal": { type: "number" },
  BigDecimal: { type: "number" },
  MultipartFile: { type: "string", format: "binary" }
};

export function mapJavaType(javaType: string): TypeMappingResult {
  const trimmed = javaType.trim();

  if (isOptionalType(trimmed)) {
    const inner = extractGenericInner(trimmed);
    return {
      ...mapJavaType(inner),
      required: false
    };
  }

  if (trimmed.endsWith("[]")) {
    const itemType = trimmed.slice(0, -2);
    return {
      schema: {
        type: "array",
        items: mapJavaType(itemType).schema
      },
      required: true,
      typeName: itemType
    };
  }

  if (isListType(trimmed)) {
    const itemType = extractGenericInner(trimmed);
    return {
      schema: {
        type: "array",
        items: mapJavaType(itemType).schema
      },
      required: true,
      typeName: itemType
    };
  }

  if (isMapType(trimmed)) {
    return {
      schema: { type: "object", additionalProperties: true },
      required: true,
      typeName: trimmed
    };
  }

  const primitive = PRIMITIVE_TYPES[trimmed];
  if (primitive) {
    return {
      schema: primitive,
      required: true,
      typeName: trimmed
    };
  }

  const typeName = simpleTypeName(trimmed);
  return {
    schema: { $ref: `#/schemas/${typeName}` },
    required: true,
    typeName
  };
}

function isOptionalType(value: string): boolean {
  return /^Optional\s*</.test(value) || /^java\.util\.Optional\s*</.test(value);
}

function isListType(value: string): boolean {
  return /^(List|Collection|java\.util\.List|java\.util\.Collection)\s*</.test(
    value
  );
}

function isMapType(value: string): boolean {
  return /^(Map|java\.util\.Map)\s*</.test(value);
}

function extractGenericInner(value: string): string {
  const start = value.indexOf("<");
  const end = value.lastIndexOf(">");
  if (start === -1 || end === -1 || end <= start) {
    return value;
  }

  return value.slice(start + 1, end).split(",")[0]?.trim() ?? value;
}

function simpleTypeName(value: string): string {
  const withoutGeneric = value.replace(/<.*>$/, "");
  return withoutGeneric.split(".").at(-1) ?? withoutGeneric;
}
