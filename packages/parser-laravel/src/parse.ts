import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AuthScheme, ParseContext, ParseResult, Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { applyControllerRequestBodies } from "./parse-controller.js";
import { parseLaravelRouteFile, type LaravelRoute } from "./parse-routes.js";

const LARAVEL_AUTH: AuthScheme = {
  id: "laravel-auth",
  type: "bearer",
  bearerFormat: "JWT",
  description: "Laravel bearer authentication"
};

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const options = ctx.options as { routeFiles?: string[]; includeFormRequests?: boolean };
  const routeFiles = options.routeFiles?.length
    ? options.routeFiles
    : ["routes/web.php", "routes/api.php"];
  const routes: LaravelRoute[] = [];
  const warnings: Warning[] = [];

  for (const file of routeFiles) {
    try {
      const absolute = join(ctx.repoPath, file);
      if (!existsSync(absolute)) {
        continue;
      }
      const parsed = parseLaravelRouteFile(
        file.replace(/\\/g, "/"),
        await readFile(absolute, "utf8")
      );
      routes.push(...parsed.routes);
      warnings.push(...parsed.warnings);
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

  const endpoints =
    options.includeFormRequests === false
      ? routes.map((route) => route.endpoint)
      : applyControllerRequestBodies(ctx.repoPath, routes);
  const hasAuth = endpoints.some((endpoint) => endpoint.security.length > 0);

  return {
    endpoints,
    schemas: {},
    auth: hasAuth ? [LARAVEL_AUTH] : [],
    warnings,
    metadata: {
      stack: "laravel",
      stackVariant: "laravel",
      fileCount: routeFiles.length
    }
  };
}
