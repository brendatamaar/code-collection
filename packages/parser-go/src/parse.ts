import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Endpoint, ParseContext, ParseResult, Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { GO_AUTH_SCHEME } from "./parse-auth.js";
import { parseGoRoutes } from "./parse-routes.js";

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const endpoints: Endpoint[] = [];
  const warnings: Warning[] = [];
  const goFiles = ctx.files.filter((file) => file.endsWith(".go"));

  for (const file of goFiles) {
    try {
      endpoints.push(
        ...parseGoRoutes(
          file.replace(/\\/g, "/"),
          await readFile(join(ctx.repoPath, file), "utf8")
        )
      );
    } catch (error) {
      warnings.push({
        level: "warning",
        code: WarningCode.PARSE_FAILED,
        message:
          error instanceof Error
            ? `Failed to parse ${file}: ${error.message}`
            : `Failed to parse ${file}`,
        source: { file: file.replace(/\\/g, "/"), line: 1 }
      });
    }
  }

  if (endpoints.some((endpoint) => endpoint.requestBody)) {
    warnings.push({
      level: "info",
      code: WarningCode.UNSUPPORTED_DTO_FEATURE,
      message: "Go DTO inference is not supported in beta; emitted empty JSON schemas"
    });
  }

  return {
    endpoints,
    schemas: {},
    auth: endpoints.some((endpoint) => endpoint.security.length > 0)
      ? [GO_AUTH_SCHEME]
      : [],
    warnings,
    metadata: {
      stack: "go",
      stackVariant: ctx.variant,
      fileCount: goFiles.length
    }
  };
}
