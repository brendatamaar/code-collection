import type Parser from "tree-sitter";

import type { Schema } from "@code-collection/core";

import { mapJavaType } from "./type-mapping.js";
import type { JavaTree } from "./tree-sitter.js";

const JAVA_PRIMITIVES = new Set([
  "byte",
  "short",
  "int",
  "long",
  "float",
  "double",
  "boolean",
  "char"
]);

const REQUIRED_ANNOTATIONS = new Set(["NotNull", "NotBlank", "NotEmpty"]);

export function inferDtoSchema(
  className: string,
  sourceTree: JavaTree,
  registry: Record<string, Schema> = {}
): Schema {
  const classNode = findClass(sourceTree.rootNode, className);
  if (!classNode) {
    registry[className] = { type: "object" };
    return registry[className];
  }

  const properties: Record<string, Schema> = {};
  const required: string[] = [];

  for (const field of fieldsForClass(classNode)) {
    const typeNode = field.childForFieldName("type");
    const nameNode = fieldName(field);
    if (!typeNode || !nameNode) {
      continue;
    }

    const mapped = mapJavaType(typeNode.text);
    properties[nameNode.text] = mapped.schema;

    if ("$ref" in mapped.schema) {
      registry[mapped.typeName] ??= { type: "object" };
    }

    if (isRequiredField(typeNode.text, field)) {
      required.push(nameNode.text);
    }
  }

  const schema: Schema = {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {})
  };
  registry[className] = schema;

  return schema;
}

function findClass(
  node: Parser.SyntaxNode,
  className: string
): Parser.SyntaxNode | undefined {
  if (
    node.type === "class_declaration" &&
    node.childForFieldName("name")?.text === className
  ) {
    return node;
  }

  for (const child of node.namedChildren) {
    const found = findClass(child, className);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function fieldsForClass(classNode: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const body = classNode.childForFieldName("body");
  if (!body) {
    return [];
  }

  return body.namedChildren.filter((child) => child.type === "field_declaration");
}

function fieldName(field: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  for (const child of field.namedChildren) {
    if (child.type === "variable_declarator") {
      return child.childForFieldName("name") ?? undefined;
    }
  }

  return undefined;
}

function isRequiredField(typeName: string, field: Parser.SyntaxNode): boolean {
  return isPrimitiveType(typeName) || fieldAnnotations(field).some((annotation) =>
    REQUIRED_ANNOTATIONS.has(annotationName(annotation) ?? "")
  );
}

function isPrimitiveType(typeName: string): boolean {
  return JAVA_PRIMITIVES.has(typeName.trim());
}

function fieldAnnotations(field: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const modifiers = field.namedChildren.find((child) => child.type === "modifiers");
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
