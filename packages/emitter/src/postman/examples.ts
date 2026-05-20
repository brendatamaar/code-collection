import type { Schema } from "@code-collection/core";

export function generateExample(
  schema: Schema,
  schemas: Record<string, Schema>,
  seenRefs = new Set<string>()
): unknown {
  if ("$ref" in schema) {
    const refName = schema.$ref.slice("#/schemas/".length);
    if (seenRefs.has(refName)) {
      return {};
    }

    const resolved = schemas[refName];
    if (!resolved) {
      return {};
    }

    return generateExample(resolved, schemas, new Set([...seenRefs, refName]));
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.type === "array") {
    return [generateExample(schema.items, schemas, seenRefs)];
  }

  if (schema.type === "object") {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const keys = Object.keys(properties).sort((left, right) => {
      const leftRequired = required.has(left);
      const rightRequired = required.has(right);
      if (leftRequired !== rightRequired) {
        return leftRequired ? -1 : 1;
      }
      return left.localeCompare(right);
    });

    return Object.fromEntries(
      keys.map((key) => [
        key,
        generateExample(properties[key] as Schema, schemas, seenRefs)
      ])
    );
  }

  if (schema.type === "string") {
    if (schema.enum?.[0] !== undefined) {
      return schema.enum[0];
    }
    if (schema.format === "email") {
      return "user@example.com";
    }
    if (schema.format === "uuid") {
      return "00000000-0000-0000-0000-000000000000";
    }
    if (schema.format === "date") {
      return "2025-01-01";
    }
    if (schema.format === "date-time") {
      return "2025-01-01T00:00:00Z";
    }
    if (schema.format === "binary") {
      return "";
    }
    return "string";
  }

  if (schema.type === "integer" || schema.type === "number") {
    if (schema.enum?.[0] !== undefined) {
      return schema.enum[0];
    }
    return 0;
  }

  if (schema.type === "boolean") {
    if (schema.enum?.[0] !== undefined) {
      return schema.enum[0];
    }
    return false;
  }

  return null;
}
