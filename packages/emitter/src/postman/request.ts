import type { Endpoint, Schema } from "@code-collection/core";

import { generateExample } from "./examples.js";
import { pathToPostmanUrl } from "./path.js";
import { emitResponses } from "./response.js";

export interface PostmanRequestItem {
  name: string;
  request: {
    method: string;
    url: ReturnType<typeof pathToPostmanUrl>;
    header?: { key: string; value: string; description?: string; disabled?: boolean }[];
    body?: unknown;
    description?: string;
  };
  response?: unknown[];
}

export function emitRequest(
  endpoint: Endpoint,
  schemas: Record<string, Schema>
): PostmanRequestItem {
  const contentType = endpoint.requestBody
    ? Object.keys(endpoint.requestBody.content)[0]
    : undefined;
  const headers = [
    ...endpoint.parameters
      .filter((parameter) => parameter.in === "header")
      .map((parameter) => ({
        key: parameter.name,
        value: "",
        ...(parameter.description ? { description: parameter.description } : {}),
        ...(!parameter.required ? { disabled: true } : {})
      })),
    ...(contentType ? [{ key: "Content-Type", value: contentType }] : [])
  ];
  const requestDescription = description(endpoint);

  return {
    name: requestName(endpoint),
    request: {
      method: endpoint.method,
      url: pathToPostmanUrl(endpoint.path, endpoint.parameters),
      ...(headers.length > 0 ? { header: headers } : {}),
      ...(endpoint.requestBody && contentType
        ? {
            body: emitBody(
              contentType,
              endpoint.requestBody.content[contentType]?.schema,
              schemas
            )
          }
        : {}),
      ...(requestDescription ? { description: requestDescription } : {})
    },
    response: emitResponses(endpoint, schemas)
  };
}

function requestName(endpoint: Endpoint): string {
  const operationId = endpoint.operationId;
  if (
    operationId &&
    operationId.length > 2 &&
    !["handler", "index", "default", "fn", "f1"].includes(operationId)
  ) {
    return operationId;
  }

  return `${endpoint.method} ${endpoint.path}`;
}

function emitBody(
  contentType: string,
  schema: Schema | undefined,
  schemas: Record<string, Schema>
): unknown {
  if (!schema) {
    return undefined;
  }

  if (contentType === "application/json") {
    return {
      mode: "raw",
      raw: JSON.stringify(generateExample(schema, schemas), null, 2),
      options: { raw: { language: "json" } }
    };
  }

  if (contentType === "text/plain") {
    return {
      mode: "raw",
      raw: String(generateExample(schema, schemas)),
      options: { raw: { language: "text" } }
    };
  }

  return {
    mode: "raw",
    raw: ""
  };
}

function description(endpoint: Endpoint): string | undefined {
  const parts = [
    endpoint.summary,
    endpoint.description,
    endpoint.security[0]?.description
      ? `**Auth required:** ${endpoint.security[0].description}`
      : undefined,
    `_Source: ${endpoint.source.file}:${endpoint.source.line}_`
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
