import { createHash } from "node:crypto";

import type { Endpoint, HttpMethod, Warning } from "@code-collection/core";

import { detectVersion } from "./version-detector.js";

export interface LaravelRoute {
  endpoint: Endpoint;
  handler?: string;
  middleware: string[];
}

const ANY_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS"
];

export function parseLaravelRouteFile(
  file: string,
  content: string
): { routes: LaravelRoute[]; warnings: Warning[] } {
  const routes: LaravelRoute[] = [];
  const warnings: Warning[] = [];
  const groupStack: { prefix: string; middleware: string[] }[] = [
    { prefix: "", middleware: [] }
  ];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/Route::group\s*\(/.test(line) && /function\s*\(/.test(line)) {
      const current = groupStack[groupStack.length - 1]!;
      groupStack.push({
        prefix: joinPaths(current.prefix, extractPrefix(line)),
        middleware: [...current.middleware, ...extractMiddleware(line)]
      });
      return;
    }

    if (/^\s*}\s*\)\s*;?\s*$/.test(line) || /^\s*}\s*\)\s*->/.test(line)) {
      if (groupStack.length > 1) {
        groupStack.pop();
      }
      return;
    }

    const call = /Route::(get|post|put|patch|delete|any|match)\s*\((.*)\)\s*(?:->middleware\(([^)]*)\))?/i.exec(
      line
    );
    if (!call?.[1] || !call[2]) {
      return;
    }

    const current = groupStack[groupStack.length - 1]!;
    const path = joinPaths(current.prefix, extractFirstString(call[2]) ?? "/");
    const methods = methodsFor(call[1], call[2]);
    const middleware = [
      ...current.middleware,
      ...extractMiddleware(call[3] ?? line)
    ];
    const handler = extractHandler(call[2]);

    for (const method of methods) {
      const version = detectVersion(path);
      const route: LaravelRoute = {
        endpoint: {
          id: endpointId(method, path, file),
          method,
          path,
          ...(handler?.split("@").at(-1)
            ? { operationId: handler.split("@").at(-1) as string }
            : {}),
          tags: [handler?.split("@")[0] ?? firstPathSegment(path)],
          ...(version ? { version } : {}),
          parameters: pathParameters(path),
          responses: {},
          security: authSecurity(middleware),
          source: { file, line: index + 1 }
        },
        middleware
      };
      if (handler) {
        route.handler = handler;
      }
      routes.push(route);
    }
  });

  return { routes, warnings };
}

export function joinPaths(...parts: string[]): string {
  const joined = parts
    .filter(Boolean)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
  const withLeading = joined.startsWith("/") ? joined : `/${joined}`;
  return withLeading.length > 1 ? withLeading.replace(/\/+$/g, "") : withLeading;
}

function methodsFor(name: string, args: string): HttpMethod[] {
  if (name.toLowerCase() === "any") {
    return ANY_METHODS;
  }

  if (name.toLowerCase() === "match") {
    const array = /\[([^\]]+)\]/.exec(args)?.[1] ?? "";
    const methods = [...array.matchAll(/['"]([A-Za-z]+)['"]/g)]
      .map((match) => match[1]?.toUpperCase())
      .filter((method): method is HttpMethod => isHttpMethod(method));
    return methods.length > 0 ? methods : ["GET"];
  }

  return [name.toUpperCase() as HttpMethod];
}

function isHttpMethod(method: string | undefined): method is HttpMethod {
  return (
    method === "GET" ||
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE" ||
    method === "HEAD" ||
    method === "OPTIONS" ||
    method === "TRACE"
  );
}

function extractPrefix(text: string): string {
  return /['"]prefix['"]\s*=>\s*['"]([^'"]+)['"]/.exec(text)?.[1] ?? "";
}

function extractMiddleware(text: string): string[] {
  return [...text.matchAll(/(?:middleware['"]?\s*=>\s*|middleware\s*\()\s*(?:\[)?['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value));
}

function extractFirstString(text: string): string | undefined {
  return /['"]([^'"]+)['"]/.exec(text)?.[1];
}

function extractHandler(args: string): string | undefined {
  const controllerArray = /([A-Za-z_]\w*)::class\s*,\s*['"]([A-Za-z_]\w*)['"]/.exec(args);
  if (controllerArray?.[1] && controllerArray[2]) {
    return `${controllerArray[1]}@${controllerArray[2]}`;
  }

  return /['"]([A-Za-z_\\][\w\\]+@[A-Za-z_]\w*)['"]/.exec(args)?.[1]?.split("\\").at(-1);
}

function firstPathSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "root";
}

function pathParameters(path: string): Endpoint["parameters"] {
  return [...path.matchAll(/\{([^}:?]+)[^}]*\}/g)].map((match) => ({
    name: match[1] as string,
    in: "path" as const,
    required: true,
    schema: { type: "string" as const }
  }));
}

function authSecurity(middleware: string[]): Endpoint["security"] {
  return middleware.some((entry) => /^(auth(?::api)?|sanctum|jwt|passport)$/.test(entry))
    ? [{ schemeId: "laravel-auth", description: `Laravel middleware: ${middleware.join(", ")}` }]
    : [];
}

function endpointId(method: string, path: string, file: string): string {
  return createHash("sha1").update(`${method}${path}${file}`).digest("hex");
}
