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

  const fileContents = await Promise.all(
    goFiles.map(async (file) => {
      try {
        const content = await readFile(join(ctx.repoPath, file), "utf8");
        return { file, content, error: null } as const;
      } catch (error) {
        return { file, content: null, error } as const;
      }
    })
  );

  for (const result of fileContents) {
    if (result.error !== null || result.content === null) {
      const error = result.error;
      warnings.push({
        level: "warning",
        code: WarningCode.PARSE_FAILED,
        message:
          error instanceof Error
            ? `Failed to parse ${result.file}: ${error.message}`
            : `Failed to parse ${result.file}`,
        source: { file: result.file.replace(/\\/g, "/"), line: 1 }
      });
      continue;
    }

    try {
      endpoints.push(
        ...parseGoRoutes(result.file.replace(/\\/g, "/"), result.content)
      );
    } catch (error) {
      warnings.push({
        level: "warning",
        code: WarningCode.PARSE_FAILED,
        message:
          error instanceof Error
            ? `Failed to parse ${result.file}: ${error.message}`
            : `Failed to parse ${result.file}`,
        source: { file: result.file.replace(/\\/g, "/"), line: 1 }
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
