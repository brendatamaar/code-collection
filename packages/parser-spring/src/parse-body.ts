import type Parser from "tree-sitter";

import type { RequestBody, Response } from "@code-collection/core";

import { mapJavaType } from "./type-mapping.js";

export function extractRequestBody(
  methodNode: Parser.SyntaxNode,
  source: string
): RequestBody | undefined {
  void source;
  const requestBodyParameter = formalParameters(methodNode).find((parameter) =>
    parameterAnnotations(parameter).some(
      (annotation) => annotationName(annotation) === "RequestBody"
    )
  );

  if (!requestBodyParameter) {
    return undefined;
  }

  const typeNode = requestBodyParameter.childForFieldName("type");
  if (!typeNode) {
    return undefined;
  }

  const requestBodyAnnotation = parameterAnnotations(requestBodyParameter).find(
    (annotation) => annotationName(annotation) === "RequestBody"
  );

  return {
    required: requestBodyAnnotation
      ? annotationRequired(requestBodyAnnotation.text)
      : true,
    content: {
      [extractConsumes(methodNode) ?? "application/json"]: {
        schema: mapJavaType(typeNode.text).schema
      }
    }
  };
}

export function extractResponse(
  methodNode: Parser.SyntaxNode,
  source: string
): Record<string, Response> {
  void source;
  const returnTypeNode = methodNode.childForFieldName("type");
  if (!returnTypeNode) {
    return {};
  }

  const returnType = unwrapResponseEntity(returnTypeNode.text);
  if (returnType === "void" || returnType === "Void") {
    return {
      "200": {
        description: "No content"
      }
    };
  }

  return {
    "200": {
      content: {
        [extractProduces(methodNode) ?? "application/json"]: {
          schema: mapJavaType(returnType).schema
        }
      }
    }
  };
}

function formalParameters(methodNode: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return (
    methodNode
      .childForFieldName("parameters")
      ?.namedChildren.filter((node) => node.type === "formal_parameter") ?? []
  );
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

function methodAnnotations(methodNode: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const modifiers = methodNode.namedChildren.find(
    (child) => child.type === "modifiers"
  );
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

function annotationRequired(annotationText: string): boolean {
  return !/required\s*=\s*false/.test(annotationText);
}

function extractConsumes(methodNode: Parser.SyntaxNode): string | undefined {
  return extractAnnotationStringValue(methodNode, "consumes");
}

function extractProduces(methodNode: Parser.SyntaxNode): string | undefined {
  return extractAnnotationStringValue(methodNode, "produces");
}

function extractAnnotationStringValue(
  methodNode: Parser.SyntaxNode,
  key: string
): string | undefined {
  for (const annotation of methodAnnotations(methodNode)) {
    const args = annotation.childForFieldName("arguments");
    if (!args || !args.text.includes(key)) {
      continue;
    }

    const match = new RegExp(`${key}\\s*=\\s*"([^"]+)"`).exec(args.text);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

function unwrapResponseEntity(type: string): string {
  const trimmed = type.trim();
  const match = /^ResponseEntity\s*<(.+)>$/.exec(trimmed);
  if (!match?.[1]) {
    return trimmed;
  }

  return match[1].trim();
}
