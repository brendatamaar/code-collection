import type Parser from "tree-sitter";

import type { HttpMethod, SourceLocation, Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import type { SourceFile } from "./parse-controller.js";

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
  warnings: Warning[];
  node: Parser.SyntaxNode;
}

export function extractMethods(
  controllerNode: Parser.SyntaxNode,
  source: SourceFile
): MethodInfo[] {
  return descendantsOfType(controllerNode, "method_declaration")
    .map((methodNode) => extractMethod(methodNode, source))
    .filter((method): method is MethodInfo => method !== undefined);
}

function extractMethod(
  methodNode: Parser.SyntaxNode,
  source: SourceFile
): MethodInfo | undefined {
  const mapping = extractMapping(methodNode);
  const methodNameNode = methodNode.childForFieldName("name");
  const returnTypeNode = methodNode.childForFieldName("type");

  if (!mapping || !methodNameNode || !returnTypeNode) {
    return undefined;
  }

  return {
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
    warnings: mapping.warnings,
    node: methodNode
  };
}

function extractMapping(
  methodNode: Parser.SyntaxNode
): { httpMethod: HttpMethod; path: string; warnings: Warning[] } | undefined {
  const annotations = methodAnnotations(methodNode);

  for (const annotation of annotations) {
    const name = annotationName(annotation);
    if (!name) {
      continue;
    }

    if (name in MAPPING_ANNOTATIONS) {
      const { path, warnings } = extractPath(annotation);
      return {
        httpMethod: MAPPING_ANNOTATIONS[name] as HttpMethod,
        path,
        warnings
      };
    }

    if (name === "RequestMapping") {
      const methods = extractRequestMethods(annotation);
      const { path, warnings } = extractPath(annotation);
      return {
        httpMethod: methods[0] ?? "GET",
        path,
        warnings:
          methods.length > 1
            ? [
                ...warnings,
                {
                  level: "warning",
                  code: WarningCode.UNSUPPORTED_MULTIPLE_PATHS,
                  message:
                    "Multiple RequestMapping methods are not fully expanded in alpha; using the first method"
                }
              ]
            : warnings
      };
    }
  }

  return undefined;
}

function extractPath(annotation: Parser.SyntaxNode): {
  path: string;
  warnings: Warning[];
} {
  const args = annotation.childForFieldName("arguments");
  if (!args) {
    return { path: "", warnings: [] };
  }

  const stringLiterals = descendantsOfType(args, "string_literal").map((node) =>
    unquote(node.text)
  );
  const path = stringLiterals[0] ?? "";
  const warnings =
    stringLiterals.length > 1
      ? [
          {
            level: "warning" as const,
            code: WarningCode.UNSUPPORTED_MULTIPLE_PATHS,
            message:
              "Multiple mapping paths are not fully expanded in alpha; using the first path"
          }
        ]
      : [];

  return { path, warnings };
}

function extractRequestMethods(annotation: Parser.SyntaxNode): HttpMethod[] {
  const args = annotation.childForFieldName("arguments");
  if (!args) {
    return ["GET"];
  }

  const methods = descendants(args)
    .map((node) => requestMethodFromText(node.text))
    .filter((method): method is HttpMethod => method !== undefined);

  return methods.length > 0 ? methods : ["GET"];
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
