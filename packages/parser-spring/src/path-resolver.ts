import type { Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { resolvePropertyPlaceholders } from "./property-loader.js";

export interface ResolvePathResult {
  path: string;
  warnings: Warning[];
}

export interface ResolvePathOptions {
  contextPath?: string;
  properties?: Record<string, string>;
  resolveConstant?: (expression: string) => ResolvePathResult;
}

export function resolvePath(
  classPrefix: string | undefined,
  methodPath: string | undefined,
  options: ResolvePathOptions = {}
): ResolvePathResult {
  const resolvedParts = [options.contextPath, classPrefix, methodPath]
    .filter(isPresent)
    .map((part) => resolvePart(part, options));
  const warnings = resolvedParts.flatMap((part) => part.warnings);
  const path = normalizePath(resolvedParts.map((part) => part.path).join("/"));

  return { path, warnings };
}

function resolvePart(
  value: string,
  options: ResolvePathOptions
): ResolvePathResult {
  const constantResolved =
    isLiteralPath(value) || value.includes("${") || !options.resolveConstant
      ? { path: value, warnings: [] }
      : options.resolveConstant(value);
  const propertyResolved = resolveProperties(
    constantResolved.path,
    options.properties ?? {}
  );

  return {
    path: propertyResolved.path,
    warnings: [
      ...constantResolved.warnings,
      ...propertyResolved.warnings,
      ...dynamicWarnings(propertyResolved.path, "route path")
    ]
  };
}

function resolveProperties(
  value: string,
  properties: Record<string, string>
): ResolvePathResult {
  if (!value.includes("${")) {
    return { path: value, warnings: [] };
  }

  const resolved = resolvePropertyPlaceholders(value, properties);
  if (resolved !== undefined) {
    return { path: resolved, warnings: [] };
  }

  return {
    path: value,
    warnings: [
      {
        level: "warning",
        code: WarningCode.UNRESOLVED_PROPERTY,
        message: `Could not resolve property placeholder in '${value}'`
      }
    ]
  };
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/g, "") : "/";

  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

function dynamicWarnings(value: string | undefined, label: string): Warning[] {
  if (!value || isLiteralPath(value)) {
    return [];
  }

  return [
    {
      level: "warning",
      code: WarningCode.DYNAMIC_PREFIX,
      message: `Dynamic ${label} '${value}' could not be statically resolved; left raw text in path`
    }
  ];
}

function isLiteralPath(value: string): boolean {
  return (
    value === "" ||
    /^"[^"]*"$/.test(value) ||
    value.startsWith("/") ||
    value.startsWith("{") ||
    /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._~{}:-]+)*$/.test(value)
  );
}

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
