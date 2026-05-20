import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  Endpoint,
  Parameter,
  ParseContext,
  ParseResult,
  Schema,
  Warning
} from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { endpointSecurity, sourceTreeHasSecurityFilterChain, SPRING_SECURITY_AUTH_SCHEME } from "./parse-auth.js";
import { extractRequestBody, extractResponse } from "./parse-body.js";
import { extractControllers } from "./parse-controller.js";
import { inferDtoSchema } from "./parse-dto.js";
import { extractMethods } from "./parse-methods.js";
import { extractParameters } from "./parse-parameters.js";
import { loadSpringProperties } from "./property-loader.js";
import { buildConstantIndex, resolveConstantExpression } from "./resolve-constant.js";
import { resolvePath } from "./path-resolver.js";
import { parseFile } from "./tree-sitter.js";
import { detectVersion } from "./version-detector.js";

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const endpoints: Endpoint[] = [];
  const schemas: Record<string, Schema> = {};
  const warnings: Warning[] = [];
  const javaFiles = ctx.files.filter((file) => file.endsWith(".java"));
  const springOptions = ctx.options as {
    profile?: string;
    propertyFiles?: string[];
  };
  const [constantIndex, properties, hasSecurityFilterChain] = await Promise.all([
    buildConstantIndex(ctx.repoPath, javaFiles),
    loadSpringProperties(ctx.repoPath, springOptions),
    sourceTreeHasSecurityFilterChain(ctx.repoPath, javaFiles)
  ]);
  const contextPath =
    properties["server.servlet.context-path"] ?? properties["server.contextPath"];
  const seenRoutes = new Set<string>();
  let hasEndpointSecurity = false;

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
          const resolvedPath = resolvePath(controller.requestMapping, method.path, {
            ...(contextPath ? { contextPath } : {}),
            properties,
            resolveConstant: (expression) => {
              const resolved = resolveConstantExpression(
                constantIndex,
                normalizedFile,
                expression
              );
              return { path: resolved.value, warnings: resolved.warnings };
            }
          });
          warnings.push(...method.warnings, ...resolvedPath.warnings);

          const requestBody = extractRequestBody(method.node, content);
          const responses = extractResponse(method.node, content);
          const parameters = applyRegexPathConstraints(
            extractParameters(method.node, {
              file: normalizedFile,
              content
            }),
            resolvedPath.path
          );
          const security = endpointSecurity(
            controller.authAnnotations,
            method.authAnnotations
          );
          hasEndpointSecurity ||= security.length > 0;

          registerReferencedSchemas(
            schemas,
            tree,
            [
              ...parameters.map((parameter) => parameter.schema),
              ...(requestBody
                ? Object.values(requestBody.content).map((mediaType) => mediaType.schema)
                : []),
              ...Object.values(responses).flatMap((response) =>
                response.content
                  ? Object.values(response.content).map((mediaType) => mediaType.schema)
                  : []
              )
            ],
            warnings
          );

          const id = endpointId(method.httpMethod, resolvedPath.path, normalizedFile);
          const routeKey = `${method.httpMethod} ${resolvedPath.path}`;
          const version = detectVersion(resolvedPath.path);
          if (seenRoutes.has(routeKey)) {
            warnings.push({
              level: "warning",
              code: WarningCode.DUPLICATE_ROUTE,
              message: `Duplicate Spring route ${routeKey}; kept the first endpoint`,
              source: method.source
            });
            continue;
          }
          seenRoutes.add(routeKey);

          endpoints.push({
            id,
            method: method.httpMethod,
            path: resolvedPath.path,
            operationId: method.methodName,
            tags: [controller.name],
            ...(version ? { version } : {}),
            parameters,
            ...(requestBody ? { requestBody } : {}),
            responses,
            security,
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
    auth:
      hasEndpointSecurity || hasSecurityFilterChain
        ? [SPRING_SECURITY_AUTH_SCHEME]
        : [],
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
  schemas: Schema[],
  warnings: Warning[] = []
): void {
  for (const schema of schemas) {
    if ("$ref" in schema) {
      const className = schema.$ref.slice("#/schemas/".length);
      if (registry[className] === undefined) {
        inferDtoSchema(className, tree, registry, warnings);
      }
      continue;
    }

    if (schema.type === "array") {
      registerReferencedSchemas(registry, tree, [schema.items], warnings);
      continue;
    }

    if (schema.type === "object" && schema.properties) {
      registerReferencedSchemas(registry, tree, Object.values(schema.properties), warnings);
    }
  }
}

function endpointId(method: string, path: string, file: string): string {
  return createHash("sha1").update(`${method}${path}${file}`).digest("hex");
}

function applyRegexPathConstraints(
  parameters: Parameter[],
  path: string
): Parameter[] {
  const patterns = new Map<string, string>();
  for (const match of path.matchAll(/\{([^}:]+):([^}]+)\}/g)) {
    if (match[1] && match[2]) {
      patterns.set(match[1], match[2]);
    }
  }

  if (patterns.size === 0) {
    return parameters;
  }

  return parameters.map((parameter) => {
    const pattern = patterns.get(parameter.name);
    if (!pattern || parameter.in !== "path" || !("type" in parameter.schema)) {
      return parameter;
    }

    return {
      ...parameter,
      schema: {
        ...parameter.schema,
        pattern
      }
    };
  });
}
