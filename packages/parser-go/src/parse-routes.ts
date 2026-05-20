import { createHash } from "node:crypto";

import type { Endpoint, HttpMethod } from "@code-collection/core";

import { detectGoAuth } from "./parse-auth.js";
import { extractGroupPrefixes, joinPaths } from "./parse-groups.js";
import { detectVersion } from "./version-detector.js";

const METHOD_MAP: Record<string, HttpMethod> = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE"
};

export function parseGoRoutes(file: string, content: string): Endpoint[] {
  const groups = extractGroupPrefixes(content);
  const endpoints: Endpoint[] = [];
  const routePattern =
    /(?:(\w+)\.)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|Get|Post|Put|Patch|Delete|Handle|HandleFunc)\s*\(\s*"([^"]+)"\s*,\s*([^)]+)\)/g;

  for (const match of content.matchAll(routePattern)) {
    const receiver = match[1] ?? "";
    const callMethod = match[2] ?? "GET";
    const rawPattern = match[3] ?? "/";
    const handler = match[4] ?? "";
    const parsed = parsePattern(callMethod, rawPattern);
    const path = joinPaths(groups.get(receiver) ?? "", parsed.path);
    const version = detectVersion(path);
    const operationId = handlerName(handler);

    endpoints.push({
      id: endpointId(parsed.method, path, file),
      method: parsed.method,
      path,
      ...(operationId ? { operationId } : {}),
      tags: [receiver || "go"],
      ...(version ? { version } : {}),
      parameters: pathParameters(path),
      ...(
        parsed.method === "POST" || parsed.method === "PUT" || parsed.method === "PATCH"
          ? {
              requestBody: {
                required: false,
                content: { "application/json": { schema: { type: "object" } } }
              }
            }
          : {}),
      responses: {
        "200": {
          content: { "application/json": { schema: { type: "object" } } }
        }
      },
      security: detectGoAuth(handler),
      source: { file, line: lineForIndex(content, match.index ?? 0) }
    });
  }

  return endpoints;
}

function parsePattern(
  callMethod: string,
  pattern: string
): { method: HttpMethod; path: string } {
  const methodPrefixed = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+)$/.exec(
    pattern
  );
  if (methodPrefixed?.[1] && methodPrefixed[2]) {
    return {
      method: methodPrefixed[1] as HttpMethod,
      path: methodPrefixed[2]
    };
  }

  return {
    method: METHOD_MAP[callMethod] ?? "GET",
    path: pattern
  };
}

function handlerName(handler: string): string | undefined {
  return /([A-Za-z_]\w*)\s*$/.exec(handler.trim())?.[1];
}

function pathParameters(path: string): Endpoint["parameters"] {
  return [...path.matchAll(/\{([^}:]+)[^}]*\}/g)].map((match) => ({
    name: match[1] as string,
    in: "path" as const,
    required: true,
    schema: { type: "string" as const }
  }));
}

function lineForIndex(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function endpointId(method: string, path: string, file: string): string {
  return createHash("sha1").update(`${method}${path}${file}`).digest("hex");
}
