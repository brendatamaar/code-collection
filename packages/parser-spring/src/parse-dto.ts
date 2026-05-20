import type Parser from "tree-sitter";

import type { Schema, Warning } from "@code-collection/core";
import { WarningCode } from "@code-collection/core";

import { hasLombokAnnotation } from "./lombok.js";
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
  registry: Record<string, Schema> = {},
  warnings: Warning[] = [],
  seen: Set<string> = new Set()
): Schema {
  if (seen.has(className)) {
    warnings.push({
      level: "info",
      code: WarningCode.CYCLIC_SCHEMA_REFERENCE,
      message: `Cyclic schema reference detected for ${className}`
    });
    registry[className] = { type: "object" };
    return registry[className];
  }

  const classNode = findClass(sourceTree.rootNode, className);
  if (!classNode) {
    registry[className] = { type: "object" };
    return registry[className];
  }

  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  const fieldNodes = [
    ...superclassFields(sourceTree.rootNode, classNode, warnings),
    ...fieldsForClass(classNode)
  ];

  if (hasLombokAnnotation(classNode)) {
    warnings.push({
      level: "info",
      code: WarningCode.LOMBOK_INFERRED,
      message: `Inferred Lombok DTO fields for ${className}`
    });
  }

  for (const field of fieldNodes) {
    const typeNode = field.childForFieldName("type");
    const nameNode = fieldName(field);
    if (!typeNode || !nameNode) {
      continue;
    }

    const mapped = mapJavaType(typeNode.text);
    properties[nameNode.text] = mapped.schema;

    if ("$ref" in mapped.schema) {
      if (mapped.typeName === className || seen.has(mapped.typeName)) {
        warnings.push({
          level: "info",
          code: WarningCode.CYCLIC_SCHEMA_REFERENCE,
          message: `Cyclic schema reference detected for ${className}.${nameNode.text}`
        });
        registry[mapped.typeName] ??= { type: "object" };
      } else if (registry[mapped.typeName] === undefined) {
        inferDtoSchema(
          mapped.typeName,
          sourceTree,
          registry,
          warnings,
          new Set([...seen, className])
        );
      }
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

function superclassFields(
  rootNode: Parser.SyntaxNode,
  classNode: Parser.SyntaxNode,
  warnings: Warning[]
): Parser.SyntaxNode[] {
  const superclassName = /\bextends\s+([A-Za-z_]\w*)/.exec(classNode.text)?.[1];
  if (!superclassName) {
    return [];
  }

  const superclass = findClass(rootNode, superclassName);
  if (!superclass) {
    warnings.push({
      level: "info",
      code: WarningCode.UNSUPPORTED_DTO_FEATURE,
      message: `External superclass ${superclassName} was not available for DTO inference`
    });
    return [];
  }

  return fieldsForClass(superclass);
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
