import { createHash } from "node:crypto";

import type { Endpoint, HttpMethod } from "@code-collection/core";
import ts from "typescript";

import { detectNodeAuth } from "./parse-auth.js";
import {
  inferRequestBody,
  inferRequestBodyFromHandler
} from "./parse-body.js";
import { extractMountPrefixesFromSourceFile, joinPaths } from "./parse-mounts.js";
import { detectVersion } from "./version-detector.js";

const METHOD_MAP: Record<string, HttpMethod[]> = {
  get: ["GET"],
  post: ["POST"],
  put: ["PUT"],
  patch: ["PATCH"],
  delete: ["DELETE"],
  head: ["HEAD"],
  options: ["OPTIONS"],
  all: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
};

export interface NodeRouteParseOptions {
  sourceFile?: ts.SourceFile;
  typeChecker?: ts.TypeChecker;
}

export function parseNodeRoutes(
  file: string,
  content: string,
  options: NodeRouteParseOptions = {}
): Endpoint[] {
  const sourceFile =
    options.sourceFile ??
    ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const prefixes = extractMountPrefixesFromSourceFile(sourceFile);
  const endpoints: Endpoint[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const route = routeCall(node, sourceFile);
      if (route) {
        const { receiver, methodName, path: rawPath } = route;
        const path = normalizePathParameters(
          joinPaths(prefixes.get(receiver) ?? "", rawPath)
        );
        const version = detectVersion(path);
        const handlerExpression = lastHandlerExpression(node);
        const handlerText = node.arguments
          .slice(1)
          .map((argument) => argument.getText(sourceFile))
          .join(", ");
        const operationId =
          operationIdForHandler(handlerExpression) ?? handlerName(handlerText);
        const requestBody =
          inferRequestBodyFromHandler(
            handlerExpression,
            options.typeChecker,
            sourceFile
          ) ?? inferRequestBody(content, handlerText);
        const line =
          sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        for (const method of METHOD_MAP[methodName] ?? ["GET"]) {
          endpoints.push({
            id: endpointId(method, path, file),
            method,
            path,
            ...(operationId ? { operationId } : {}),
            tags: [receiver],
            ...(version ? { version } : {}),
            parameters: pathParameters(path),
            ...(requestBody ? { requestBody } : {}),
            responses: {},
            security: detectNodeAuth(handlerText),
            source: { file, line }
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return endpoints;
}

function routeCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile
): { receiver: string; methodName: string; path: string } | undefined {
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return undefined;
  }

  const methodName = node.expression.name.text.toLowerCase();
  if (!(methodName in METHOD_MAP)) {
    return undefined;
  }

  const receiverNode = node.expression.expression;
  if (!ts.isIdentifier(receiverNode)) {
    return undefined;
  }

  const firstArgument = node.arguments[0];
  if (!isStringLiteralLike(firstArgument)) {
    return undefined;
  }

  return {
    receiver: receiverNode.getText(sourceFile),
    methodName,
    path: firstArgument.text
  };
}

function handlerName(handlerText: string): string | undefined {
  return /([A-Za-z_]\w*)\s*(?:\)|$)/.exec(handlerText.trim())?.[1];
}

function operationIdForHandler(
  handlerExpression: ts.Expression | undefined
): string | undefined {
  return handlerExpression && ts.isIdentifier(handlerExpression)
    ? handlerExpression.text
    : undefined;
}

function lastHandlerExpression(node: ts.CallExpression): ts.Expression | undefined {
  for (let index = node.arguments.length - 1; index >= 1; index -= 1) {
    const argument = node.arguments[index];
    if (argument && isHandlerExpression(argument)) {
      return argument;
    }
  }

  return undefined;
}

function isHandlerExpression(argument: ts.Expression): boolean {
  return (
    ts.isIdentifier(argument) ||
    ts.isArrowFunction(argument) ||
    ts.isFunctionExpression(argument)
  );
}

function pathParameters(path: string): Endpoint["parameters"] {
  return [
    ...path.matchAll(/:([A-Za-z_]\w*)|\{([^}:]+)[^}]*\}/g)
  ].map((match) => ({
    name: (match[1] ?? match[2]) as string,
    in: "path" as const,
    required: true,
    schema: { type: "string" as const }
  }));
}

function normalizePathParameters(path: string): string {
  return path.replace(/:([A-Za-z_]\w*)/g, "{$1}");
}

function endpointId(method: string, path: string, file: string): string {
  return createHash("sha1").update(`${method}${path}${file}`).digest("hex");
}

function isStringLiteralLike(
  node: ts.Node | undefined
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return (
    node !== undefined &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  );
}
