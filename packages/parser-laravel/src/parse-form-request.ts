import type { RequestBody, Schema } from "@code-collection/core";

export function parseFormRequest(content: string): RequestBody | undefined {
  const rulesBody = /function\s+rules\s*\(\s*\)\s*(?::\s*array)?\s*\{[\s\S]*?return\s*\[([\s\S]*?)\]\s*;/m.exec(
    content
  )?.[1];
  if (!rulesBody) {
    return undefined;
  }

  const properties: Record<string, Schema> = {};
  const required: string[] = [];

  for (const match of rulesBody.matchAll(/['"]([^'"]+)['"]\s*=>\s*(\[[^\]]+\]|[^\n,]+)/g)) {
    const field = match[1];
    const ruleText = match[2];
    if (!field || !ruleText) {
      continue;
    }

    const rules = [...ruleText.matchAll(/['"]([^'"]+)['"]/g)]
      .flatMap((rule) => rule[1]?.split("|") ?? [])
      .concat(ruleText.replace(/['"[\]]/g, "").split("|"))
      .map((rule) => rule.trim())
      .filter(Boolean);

    assignSchema(properties, field, schemaForRules(rules));
    if (rules.includes("required")) {
      required.push(field.split(".")[0] as string);
    }
  }

  return {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties,
          ...(required.length > 0 ? { required: [...new Set(required)] } : {})
        }
      }
    }
  };
}

function assignSchema(
  properties: Record<string, Schema>,
  dottedField: string,
  schema: Schema
): void {
  const [head, tail] = dottedField.split(/\.(.+)/);
  if (!head) {
    return;
  }

  if (!tail) {
    properties[head] = schema;
    return;
  }

  const parent =
    properties[head] && "type" in properties[head] && properties[head].type === "object"
      ? properties[head]
      : { type: "object" as const, properties: {} };
  parent.properties ??= {};
  parent.properties[tail] = schema;
  properties[head] = parent;
}

function schemaForRules(rules: string[]): Schema {
  const normalized = new Set(rules.map((rule) => rule.split(":")[0] ?? rule));
  const schema: Schema = normalized.has("integer")
    ? { type: "integer" }
    : normalized.has("numeric")
      ? { type: "number" }
      : normalized.has("boolean")
        ? { type: "boolean" }
        : normalized.has("array")
          ? { type: "array", items: { type: "string" } }
          : { type: "string" };

  if ("type" in schema) {
    if (normalized.has("email") && schema.type === "string") {
      schema.format = "email";
    }
    if (normalized.has("uuid") && schema.type === "string") {
      schema.format = "uuid";
    }
    if (normalized.has("date") && schema.type === "string") {
      schema.format = "date";
    }
    if (normalized.has("nullable")) {
      schema.nullable = true;
    }
  }

  return schema;
}
