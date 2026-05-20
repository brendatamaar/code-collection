import type { Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

export interface ResolvePathResult {
  path: string;
  warnings: Warning[];
}

export function resolvePath(
  classPrefix: string | undefined,
  methodPath: string | undefined
): ResolvePathResult {
  const warnings = [
    ...dynamicWarnings(classPrefix, "class-level route prefix"),
    ...dynamicWarnings(methodPath, "method-level route path")
  ];
  const path = normalizePath([classPrefix, methodPath].filter(isPresent).join("/"));

  return { path, warnings };
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
    value.startsWith("/") ||
    value.startsWith("{") ||
    /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._~{}:-]+)*$/.test(value)
  );
}

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
