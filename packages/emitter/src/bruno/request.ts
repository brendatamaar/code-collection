import type { Endpoint, Schema } from "@code-collection/core";

import { generateExample } from "../postman/examples.js";
import { emitBrunoAuth } from "./auth.js";
import { dictionaryBlock, serializeBru, textBlock } from "./bru-syntax.js";

export function emitBruRequest(
  endpoint: Endpoint,
  schemas: Record<string, Schema>,
  authById: Map<string, Parameters<typeof emitBrunoAuth>[0]>
): string {
  const contentType = endpoint.requestBody
    ? Object.keys(endpoint.requestBody.content).sort()[0]
    : undefined;
  const bodySchema = contentType
    ? endpoint.requestBody?.content[contentType]?.schema
    : undefined;
  const auth = emitBrunoAuth(authById.get(endpoint.security[0]?.schemeId ?? ""));

  return serializeBru([
    dictionaryBlock("meta", {
      name: endpoint.operationId ?? `${endpoint.method} ${endpoint.path}`,
      type: "http",
      seq: 1
    }),
    dictionaryBlock(endpoint.method.toLowerCase(), {
      url: `{{baseUrl}}${endpoint.path}`
    }),
    headersBlock(contentType, endpoint),
    queryBlock(endpoint),
    paramsBlock(endpoint),
    auth,
    bodySchema
      ? textBlock(
          "body:json",
          JSON.stringify(generateExample(bodySchema, schemas), null, 2)
        )
      : ""
  ]);
}

function headersBlock(
  contentType: string | undefined,
  endpoint: Endpoint
): string {
  const headers = Object.fromEntries(
    endpoint.parameters
      .filter((parameter) => parameter.in === "header")
      .map((parameter) => [parameter.name, ""])
  ) as Record<string, string>;
  if (contentType) {
    headers["content-type"] = contentType;
  }
  return Object.keys(headers).length > 0 ? dictionaryBlock("headers", headers) : "";
}

function queryBlock(endpoint: Endpoint): string {
  const values = Object.fromEntries(
    endpoint.parameters
      .filter((parameter) => parameter.in === "query")
      .map((parameter) => [parameter.name, ""])
  ) as Record<string, string>;
  return Object.keys(values).length > 0 ? dictionaryBlock("params:query", values) : "";
}

function paramsBlock(endpoint: Endpoint): string {
  const values = Object.fromEntries(
    endpoint.parameters
      .filter((parameter) => parameter.in === "path")
      .map((parameter) => [parameter.name, ""])
  ) as Record<string, string>;
  return Object.keys(values).length > 0 ? dictionaryBlock("params:path", values) : "";
}
