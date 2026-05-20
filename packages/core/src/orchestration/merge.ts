import { WarningCode } from "../errors.js";
import type { AuthScheme, Endpoint, Schema, Warning } from "../ir/schema.js";
import type { ParseResult } from "./types.js";

export interface MergeResult {
  endpoints: Endpoint[];
  schemas: Record<string, Schema>;
  auth: AuthScheme[];
  warnings: Warning[];
}

export function mergeParseResults(parseResults: ParseResult[]): MergeResult {
  const endpointsById = new Map<string, Endpoint>();
  const schemas: Record<string, Schema> = {};
  const authById = new Map<string, AuthScheme>();
  const warnings: Warning[] = [];

  for (const result of parseResults) {
    warnings.push(...result.warnings);

    for (const endpoint of result.endpoints) {
      if (endpointsById.has(endpoint.id)) {
        warnings.push({
          level: "warning",
          code: WarningCode.DUPLICATE_ROUTE,
          message: `Endpoint '${endpoint.id}' was produced more than once; kept the first definition`,
          source: endpoint.source
        });
        continue;
      }
      endpointsById.set(endpoint.id, endpoint);
    }

    for (const [name, schema] of Object.entries(result.schemas)) {
      if (schemas[name] !== undefined) {
        warnings.push({
          level: "info",
          code: WarningCode.DUPLICATE_SCHEMA,
          message: `Schema '${name}' was produced more than once; kept the first definition`
        });
        continue;
      }
      schemas[name] = schema;
    }

    for (const scheme of result.auth) {
      if (!authById.has(scheme.id)) {
        authById.set(scheme.id, scheme);
      }
    }
  }

  return {
    endpoints: [...endpointsById.values()],
    schemas,
    auth: [...authById.values()],
    warnings
  };
}
