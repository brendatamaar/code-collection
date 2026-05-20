import type { Endpoint, Response, Schema } from "@code-collection/core";

import { generateExample } from "./examples.js";
import { pathToPostmanUrl } from "./path.js";

const STATUS_TEXT: Record<string, string> = {
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "204": "No Content",
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "409": "Conflict",
  "422": "Unprocessable Entity",
  "500": "Internal Server Error"
};

export function emitResponses(
  endpoint: Endpoint,
  schemas: Record<string, Schema>
): unknown[] {
  return Object.entries(endpoint.responses)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, response]) => emitResponse(endpoint, code, response, schemas));
}

function emitResponse(
  endpoint: Endpoint,
  code: string,
  response: Response,
  schemas: Record<string, Schema>
): unknown {
  const contentType = response.content
    ? Object.keys(response.content).sort()[0]
    : undefined;
  const schema = contentType ? response.content?.[contentType]?.schema : undefined;

  return {
    name: `${code} ${STATUS_TEXT[code] ?? response.description ?? "Response"}`,
    originalRequest: {
      method: endpoint.method,
      url: pathToPostmanUrl(endpoint.path, endpoint.parameters)
    },
    status: STATUS_TEXT[code] ?? response.description ?? "Response",
    code: Number(code),
    header: contentType ? [{ key: "Content-Type", value: contentType }] : [],
    body: schema ? JSON.stringify(generateExample(schema, schemas), null, 2) : ""
  };
}
