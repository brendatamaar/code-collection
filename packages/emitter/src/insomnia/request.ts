import type { AuthScheme, Endpoint, Schema } from "@code-collection/core";

import { generateExample } from "../postman/examples.js";
import { emitAuth } from "./auth.js";
import { deterministicId } from "./info.js";
import type {
  InsomniaBody,
  InsomniaBodyParam,
  InsomniaHeader,
  InsomniaQueryParam,
  InsomniaRequest
} from "./types.js";

export function emitRequest(
  groupId: string,
  endpoint: Endpoint,
  schemas: Record<string, Schema>,
  authSchemes: AuthScheme[],
  sortIndex: number
): InsomniaRequest {
  return {
    _id: `req_${deterministicId(endpoint.id)}`,
    _type: "request",
    parentId: groupId,
    modified: 0,
    created: 0,
    url: pathToInsomniaUrl(endpoint.path),
    name: requestName(endpoint),
    description: requestDescription(endpoint),
    method: endpoint.method,
    body: emitBody(endpoint, schemas),
    parameters: emitQueryParams(endpoint),
    headers: emitHeaders(endpoint),
    authentication: emitAuth(endpoint, authSchemes),
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    metaSortKey: -(sortIndex + 1) * 1_000_000
  };
}

export function pathToInsomniaUrl(path: string): string {
  const converted = path.replace(/\{([^}:]+)(?::[^}]+)?\}/g, "{{ $1 }}");
  return `{{ _.baseUrl }}${converted}`;
}

function requestName(endpoint: Endpoint): string {
  const blocklist = ["handler", "index", "default", "fn", "f1"];
  const operationId = endpoint.operationId;

  if (operationId && operationId.length > 2 && !blocklist.includes(operationId)) {
    return endpoint.deprecated ? `[DEPRECATED] ${operationId}` : operationId;
  }

  const name = `${endpoint.method} ${endpoint.path}`;
  return endpoint.deprecated ? `[DEPRECATED] ${name}` : name;
}

function requestDescription(endpoint: Endpoint): string {
  const parts = [
    endpoint.summary,
    endpoint.description,
    endpoint.security[0]?.description
      ? `**Auth required:** ${endpoint.security[0].description}`
      : undefined,
    `_Source: ${endpoint.source.file}:${endpoint.source.line}_`
  ].filter((part): part is string => Boolean(part));

  return parts.join("\n\n");
}

function emitHeaders(endpoint: Endpoint): InsomniaHeader[] {
  const headers: InsomniaHeader[] = endpoint.parameters
    .filter((p) => p.in === "header")
    .map((p) => ({
      name: p.name,
      value: "",
      disabled: !p.required
    }));

  if (endpoint.requestBody) {
    const contentType = Object.keys(endpoint.requestBody.content)[0];
    if (contentType && contentType === "application/json") {
      headers.push({ name: "Content-Type", value: contentType, disabled: false });
    }
  }

  return headers;
}

function emitQueryParams(endpoint: Endpoint): InsomniaQueryParam[] {
  return endpoint.parameters
    .filter((p) => p.in === "query")
    .map((p) => ({
      name: p.name,
      value: exampleParamValue(p),
      disabled: !p.required
    }));
}

function exampleParamValue(
  parameter: Endpoint["parameters"][number]
): string {
  if (parameter.example !== undefined) {
    return String(parameter.example);
  }

  if ("type" in parameter.schema) {
    if (
      parameter.schema.type === "integer" ||
      parameter.schema.type === "number"
    ) {
      return "0";
    }
    if (parameter.schema.type === "boolean") {
      return "false";
    }
  }

  return "";
}

function emitBody(
  endpoint: Endpoint,
  schemas: Record<string, Schema>
): InsomniaBody {
  if (!endpoint.requestBody) {
    return {};
  }

  const contentType = Object.keys(endpoint.requestBody.content)[0];
  if (!contentType) {
    return {};
  }

  const schema = endpoint.requestBody.content[contentType]?.schema;

  if (contentType === "application/json") {
    return {
      mimeType: "application/json",
      text: schema ? JSON.stringify(generateExample(schema, schemas), null, 2) : ""
    };
  }

  if (contentType === "text/plain") {
    return {
      mimeType: "text/plain",
      text: schema ? String(generateExample(schema, schemas)) : ""
    };
  }

  if (
    contentType === "multipart/form-data" ||
    contentType === "application/x-www-form-urlencoded"
  ) {
    const params = schema ? schemaToBodyParams(schema, schemas, contentType === "multipart/form-data") : [];
    return { mimeType: contentType, params };
  }

  return { mimeType: contentType, text: "" };
}

function schemaToBodyParams(
  schema: Schema,
  schemas: Record<string, Schema>,
  allowFileType: boolean
): InsomniaBodyParam[] {
  const example = generateExample(schema, schemas);
  if (typeof example !== "object" || example === null) {
    return [];
  }

  const properties =
    "type" in schema && schema.type === "object" && schema.properties
      ? schema.properties
      : {};

  return Object.entries(example as Record<string, unknown>).map(([key, value]) => {
    const fieldSchema = properties[key];
    const isBinary =
      allowFileType &&
      fieldSchema !== undefined &&
      "type" in fieldSchema &&
      fieldSchema.type === "string" &&
      "format" in fieldSchema &&
      fieldSchema.format === "binary";

    if (isBinary) {
      return { name: key, value: "", disabled: false, type: "file" as const };
    }

    return { name: key, value: String(value ?? ""), disabled: false };
  });
}
