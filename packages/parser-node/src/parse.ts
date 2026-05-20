import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import type { Endpoint, ParseContext, ParseResult, Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { NODE_AUTH_SCHEME } from "./parse-auth.js";
import { parseNodeRoutes } from "./parse-routes.js";
import { createProgram } from "./ts-program.js";

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const endpoints: Endpoint[] = [];
  const warnings: Warning[] = [];
  const sourceFiles = ctx.files.filter((file) => /\.(?:cjs|mjs|js|ts)$/.test(file));
  const absoluteFiles = sourceFiles.map((file) => join(ctx.repoPath, file));
  const nodeOptions = ctx.options as { tsConfig?: string };
  const tsConfig = nodeOptions.tsConfig
    ? isAbsolute(nodeOptions.tsConfig)
      ? nodeOptions.tsConfig
      : resolve(ctx.repoPath, nodeOptions.tsConfig)
    : undefined;
  const program = createProgram(absoluteFiles, tsConfig);
  const typeChecker = program.getTypeChecker();
  const sourceFileByPath = new Map(
    program
      .getSourceFiles()
      .map((sourceFile) => [
        normalizeAbsolutePath(sourceFile.fileName),
        sourceFile
      ])
  );

  for (const file of sourceFiles) {
    try {
      const absolutePath = join(ctx.repoPath, file);
      const sourceFile = sourceFileByPath.get(normalizeAbsolutePath(absolutePath));
      const content =
        sourceFile?.getFullText() ?? await readFile(absolutePath, "utf8");
      endpoints.push(
        ...parseNodeRoutes(
          file.replace(/\\/g, "/"),
          content,
          {
            ...(sourceFile ? { sourceFile } : {}),
            typeChecker
          }
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

  return {
    endpoints,
    schemas: {},
    auth: endpoints.some((endpoint) => endpoint.security.length > 0)
      ? [NODE_AUTH_SCHEME]
      : [],
    warnings,
    metadata: {
      stack: "node",
      stackVariant: ctx.variant,
      fileCount: sourceFiles.length
    }
  };
}

function normalizeAbsolutePath(path: string): string {
  return resolve(path).replace(/\\/g, "/").toLowerCase();
}
