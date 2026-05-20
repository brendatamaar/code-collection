import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Endpoint, RequestBody } from "@code-collection/core";

import { parseFormRequest } from "./parse-form-request.js";

export function requestBodyForHandler(
  repoPath: string,
  handler: string | undefined
): RequestBody | undefined {
  if (!handler) {
    return undefined;
  }

  const [controllerName, methodName] = handler.split("@");
  if (!controllerName || !methodName) {
    return undefined;
  }

  const controllerPath = join(
    repoPath,
    "app",
    "Http",
    "Controllers",
    `${controllerName}.php`
  );
  if (!existsSync(controllerPath)) {
    return undefined;
  }

  const controller = readFileSync(controllerPath, "utf8");
  const signature = new RegExp(`function\\s+${methodName}\\s*\\(([^)]*)\\)`).exec(
    controller
  )?.[1];
  const formRequest = signature
    ?.split(",")
    .map((part) => /([A-Za-z_]\w*Request)\s+\$/.exec(part.trim())?.[1])
    .find((name): name is string => Boolean(name));
  if (!formRequest) {
    return undefined;
  }

  return loadFormRequest(repoPath, formRequest);
}

export function applyControllerRequestBodies(
  repoPath: string,
  routes: { endpoint: Endpoint; handler?: string }[]
): Endpoint[] {
  return routes.map((route) => {
    const requestBody = requestBodyForHandler(repoPath, route.handler);
    return requestBody ? { ...route.endpoint, requestBody } : route.endpoint;
  });
}

function loadFormRequest(
  repoPath: string,
  formRequest: string
): RequestBody | undefined {
  const requestPath = join(
    repoPath,
    "app",
    "Http",
    "Requests",
    `${formRequest}.php`
  );
  if (!existsSync(requestPath)) {
    return undefined;
  }

  return parseFormRequest(readFileSync(requestPath, "utf8"));
}
