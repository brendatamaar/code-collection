import type Parser from "tree-sitter";

import type { HttpMethod, SourceLocation, Warning } from "@code-collection/core";

import type { SourceFile } from "./parse-controller.js";
import { extractAuthAnnotations } from "./parse-auth.js";

const MAPPING_ANNOTATIONS: Record<string, HttpMethod> = {
  GetMapping: "GET",
  PostMapping: "POST",
  PutMapping: "PUT",
  PatchMapping: "PATCH",
  DeleteMapping: "DELETE"
};

export interface RawParameterInfo {
  name: string;
  type: string;
  annotations: string[];
}

export interface MethodInfo {
  httpMethod: HttpMethod;
  path: string;
  methodName: string;
  source: SourceLocation;
  rawParameters: RawParameterInfo[];
  rawReturnType: string;
  authAnnotations: string[];
  warnings: Warning[];
  node: Parser.SyntaxNode;
}

export function extractMethods(
  controllerNode: Parser.SyntaxNode,
  source: SourceFile
): MethodInfo[] {
  return descendantsOfType(controllerNode, "method_declaration")
    .flatMap((methodNode) => extractMethod(methodNode, source));
}

function extractMethod(
  methodNode: Parser.SyntaxNode,
  source: SourceFile
): MethodInfo[] {
  const mappings = extractMappings(methodNode);
  const methodNameNode = methodNode.childForFieldName("name");
  const returnTypeNode = methodNode.childForFieldName("type");

  if (mappings.length === 0 || !methodNameNode || !returnTypeNode) {
    return [];
  }

  const annotations = methodAnnotations(methodNode).map((annotation) => annotation.text);

  return mappings.map((mapping) => ({
    httpMethod: mapping.httpMethod,
    path: mapping.path,
    methodName: methodNameNode.text,
    source: {
      file: source.file.replace(/\\/g, "/"),
      line: methodNameNode.startPosition.row + 1,
      column: methodNameNode.startPosition.column
    },
    rawParameters: extractRawParameters(methodNode),
    rawReturnType: returnTypeNode.text,
    authAnnotations: extractAuthAnnotations(annotations),
    warnings: mapping.warnings,
    node: methodNode
  }));
}

function extractMappings(
  methodNode: Parser.SyntaxNode
): { httpMethod: HttpMethod; path: string; warnings: Warning[] }[] {
  const annotations = methodAnnotations(methodNode);

  for (const annotation of annotations) {
    const name = annotationName(annotation);
    if (!name) {
      continue;
    }

    if (name in MAPPING_ANNOTATIONS) {
      const { paths, warnings } = extractPaths(annotation);
      return paths.map((path) => ({
        httpMethod: MAPPING_ANNOTATIONS[name] as HttpMethod,
        path,
        warnings
      }));
    }

    if (name === "RequestMapping") {
      const methods = extractRequestMethods(annotation);
      const { paths, warnings } = extractPaths(annotation);
      return methods.flatMap((httpMethod) =>
        paths.map((path) => ({
          httpMethod,
          path,
          warnings
        }))
      );
    }
  }

  return [];
}

function extractPaths(annotation: Parser.SyntaxNode): {
  paths: string[];
  warnings: Warning[];
} {
  const args = annotation.childForFieldName("arguments");
  if (!args) {
    return { paths: [""], warnings: [] };
  }

  const expressions = extractPathExpressions(args.text);
  const paths = expressions.length > 0 ? expressions : [""];

  return { paths, warnings: [] };
}

function extractRequestMethods(annotation: Parser.SyntaxNode): HttpMethod[] {
  const args = annotation.childForFieldName("arguments");
  if (!args) {
    return ["GET"];
  }

  const methods = [
    ...new Set(
      descendants(args)
        .map((node) => requestMethodFromText(node.text))
        .filter((method): method is HttpMethod => method !== undefined)
    )
  ];

  return methods.length > 0 ? methods : ["GET"];
}

function extractPathExpressions(argumentText: string): string[] {
  const inner = argumentText.trim().replace(/^\(/, "").replace(/\)$/, "").trim();
  if (!inner) {
    return [""];
  }

  const named = /(?:value|path)\s*=\s*(\{[^)]*?\}|[^,)]*)/s.exec(inner)?.[1];
  const expression = named ?? splitTopLevel(inner)[0] ?? "";
  const trimmed = expression.trim();
  if (!trimmed || /^(method|consumes|produces)\s*=/.test(trimmed)) {
    return [""];
  }

  const arrayText = trimmed.startsWith("{") && trimmed.endsWith("}")
    ? trimmed.slice(1, -1)
    : trimmed;

  return splitTopLevel(arrayText)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(unquote);
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === "\"") {
      current += char;
      inString = !inString;
      continue;
    }
    if (!inString && char === "{") {
      depth += 1;
    }
    if (!inString && char === "}") {
      depth -= 1;
    }
    if (char === "," && !inString && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function requestMethodFromText(text: string): HttpMethod | undefined {
  const match = /RequestMethod\.([A-Z]+)/.exec(text);
  if (!match) {
    return undefined;
  }

  const method = match[1];
  if (!method) {
    return undefined;
  }

  return isHttpMethod(method) ? method : undefined;
}

function isHttpMethod(value: string): value is HttpMethod {
  return [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "TRACE"
  ].includes(value);
}

function extractRawParameters(methodNode: Parser.SyntaxNode): RawParameterInfo[] {
  const parameters = methodNode.childForFieldName("parameters");
  if (!parameters) {
    return [];
  }

  return parameters.namedChildren
    .filter((node) => node.type === "formal_parameter")
    .map((parameter) => {
      const name = parameter.childForFieldName("name")?.text ?? "";
      const type = parameter.childForFieldName("type")?.text ?? "";

      return {
        name,
        type,
        annotations: methodAnnotations(parameter).map((annotation) => annotation.text)
      };
    });
}

function methodAnnotations(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const modifiers = node.namedChildren.find((child) => child.type === "modifiers");
  if (!modifiers) {
    return [];
  }

  return modifiers.namedChildren.filter(
    (child) => child.type === "annotation" || child.type === "marker_annotation"
  );
}

function annotationName(annotation: Parser.SyntaxNode): string | undefined {
  return annotation.childForFieldName("name")?.text;
}

function descendantsOfType(
  node: Parser.SyntaxNode,
  type: string
): Parser.SyntaxNode[] {
  return descendants(node).filter((descendant) => descendant.type === type);
}

function descendants(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const all: Parser.SyntaxNode[] = [];

  for (const child of node.namedChildren) {
    all.push(child, ...descendants(child));
  }

  return all;
}

function unquote(value: string): string {
  return value.replace(/^"|"$/g, "");
}
