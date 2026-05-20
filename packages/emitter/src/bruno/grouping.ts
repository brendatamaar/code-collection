import type { Endpoint } from "@code-collection/core";

export function folderForEndpoint(endpoint: Endpoint): string[] {
  return [sanitizeName(endpoint.tags[0] ?? endpoint.path.split("/").filter(Boolean)[0] ?? "root")];
}

export function sanitizeName(value: string): string {
  const sanitized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");
  return sanitized || "root";
}

export function requestFileName(endpoint: Endpoint): string {
  const base =
    endpoint.operationId ??
    `${endpoint.method}-${endpoint.path.replace(/[{}]/g, "").replace(/\W+/g, "-")}`;
  return `${sanitizeName(base)}.bru`;
}
