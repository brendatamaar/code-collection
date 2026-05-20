import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Endpoint, ParseContext, ParseResult, Schema, Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { extractRequestBody, extractResponse } from "./parse-body.js";
import { extractControllers } from "./parse-controller.js";
import { inferDtoSchema } from "./parse-dto.js";
import { extractMethods } from "./parse-methods.js";
import { extractParameters } from "./parse-parameters.js";
import { resolvePath } from "./path-resolver.js";
import { parseFile } from "./tree-sitter.js";

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const endpoints: Endpoint[] = [];
  const schemas: Record<string, Schema> = {};
  const warnings: Warning[] = [];
  const javaFiles = ctx.files.filter((file) => file.endsWith(".java"));

  for (const file of javaFiles) {
    try {
      const normalizedFile = file.replace(/\\/g, "/");
      const content = await readFile(join(ctx.repoPath, file), "utf8");
      const tree = parseFile(content);
      const controllers = extractControllers(tree, {
        file: normalizedFile,
        content
      });

      for (const controller of controllers) {
        const methods = extractMethods(controller.node, {
          file: normalizedFile,
          content
        });

        for (const method of methods) {
          const resolvedPath = resolvePath(controller.requestMapping, method.path);
          warnings.push(...method.warnings, ...resolvedPath.warnings);

          const requestBody = extractRequestBody(method.node, content);
          const responses = extractResponse(method.node, content);
          const parameters = extractParameters(method.node, {
            file: normalizedFile,
            content
          });

          registerReferencedSchemas(schemas, tree, [
            ...parameters.map((parameter) => parameter.schema),
            ...(requestBody
              ? Object.values(requestBody.content).map((mediaType) => mediaType.schema)
              : []),
            ...Object.values(responses).flatMap((response) =>
              response.content
                ? Object.values(response.content).map((mediaType) => mediaType.schema)
                : []
            )
          ]);

          endpoints.push({
            id: endpointId(method.httpMethod, resolvedPath.path, normalizedFile),
            method: method.httpMethod,
            path: resolvedPath.path,
            operationId: method.methodName,
            tags: [controller.name],
            ...(detectVersion(resolvedPath.path) !== undefined
              ? { version: detectVersion(resolvedPath.path) }
              : {}),
            parameters,
            ...(requestBody ? { requestBody } : {}),
            responses,
            security: [],
            source: method.source
          });
        }
      }
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
    schemas,
    auth: [],
    warnings,
    metadata: {
      stack: "spring",
      stackVariant: ctx.variant,
      fileCount: javaFiles.length
    }
  };
}

function registerReferencedSchemas(
  registry: Record<string, Schema>,
  tree: ReturnType<typeof parseFile>,
  schemas: Schema[]
): void {
  for (const schema of schemas) {
    if ("$ref" in schema) {
      const className = schema.$ref.slice("#/schemas/".length);
      if (registry[className] === undefined) {
        inferDtoSchema(className, tree, registry);
      }
      continue;
    }

    if (schema.type === "array") {
      registerReferencedSchemas(registry, tree, [schema.items]);
      continue;
    }

    if (schema.type === "object" && schema.properties) {
      registerReferencedSchemas(registry, tree, Object.values(schema.properties));
    }
  }
}

function endpointId(method: string, path: string, file: string): string {
  return createHash("sha1").update(`${method}${path}${file}`).digest("hex");
}

function detectVersion(path: string): string | undefined {
  return /\/(v\d+)(?:\/|$)/i.exec(path)?.[1]?.toLowerCase();
}
