import type Parser from "tree-sitter";

import type { Parameter } from "@code-collection/core";

import type { SourceFile } from "./parse-controller.js";
import { mapJavaType } from "./type-mapping.js";

const PARAMETER_ANNOTATION_LOCATION = {
  PathVariable: "path",
  RequestParam: "query",
  RequestHeader: "header",
  CookieValue: "cookie"
} as const;

type ParameterAnnotationName = keyof typeof PARAMETER_ANNOTATION_LOCATION;

export function extractParameters(
  methodNode: Parser.SyntaxNode,
  source: SourceFile
): Parameter[] {
  void source;
  const parameters = methodNode.childForFieldName("parameters");
  if (!parameters) {
    return [];
  }

  return parameters.namedChildren
    .filter((node) => node.type === "formal_parameter")
    .map(extractParameter)
    .filter((parameter): parameter is Parameter => parameter !== undefined);
}

function extractParameter(
  parameterNode: Parser.SyntaxNode
): Parameter | undefined {
  const annotation = parameterAnnotations(parameterNode).find((candidate) =>
    isParameterAnnotation(annotationName(candidate))
  );

  if (!annotation) {
    return undefined;
  }

  const name = annotationName(annotation);
  if (name === "RequestBody") {
    return undefined;
  }

  if (!isReturnedParameterAnnotation(name)) {
    return undefined;
  }

  const parameterNameNode = parameterNode.childForFieldName("name");
  const parameterTypeNode = parameterNode.childForFieldName("type");
  if (!parameterNameNode || !parameterTypeNode) {
    return undefined;
  }

  const mapping = mapJavaType(parameterTypeNode.text);
  const location = PARAMETER_ANNOTATION_LOCATION[name];

  return {
    name: annotationParameterName(annotation.text) ?? parameterNameNode.text,
    in: location,
    required:
      location === "path"
        ? true
        : annotationRequired(annotation.text) && mapping.required,
    schema: mapping.schema
  };
}

function parameterAnnotations(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
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

function isParameterAnnotation(
  name: string | undefined
): name is ParameterAnnotationName | "RequestBody" {
  return (
    name === "PathVariable" ||
    name === "RequestParam" ||
    name === "RequestHeader" ||
    name === "CookieValue" ||
    name === "RequestBody"
  );
}

function isReturnedParameterAnnotation(
  name: string | undefined
): name is ParameterAnnotationName {
  return (
    name === "PathVariable" ||
    name === "RequestParam" ||
    name === "RequestHeader" ||
    name === "CookieValue"
  );
}

function annotationParameterName(annotationText: string): string | undefined {
  const named = /(?:name|value)\s*=\s*"([^"]+)"/.exec(annotationText);
  if (named?.[1]) {
    return named[1];
  }

  const positional = /\(\s*"([^"]+)"/.exec(annotationText);
  return positional?.[1];
}

function annotationRequired(annotationText: string): boolean {
  return !/required\s*=\s*false/.test(annotationText);
}
