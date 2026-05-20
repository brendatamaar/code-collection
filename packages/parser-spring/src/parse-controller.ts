import type Parser from "tree-sitter";

import type { SourceLocation } from "@code-collection/core";
import { createJavaQuery, type JavaTree } from "./tree-sitter.js";
import { CONTROLLER_CLASS_QUERY } from "./queries.js";

export interface SourceFile {
  file: string;
  content: string;
}

export interface ControllerInfo {
  name: string;
  source: SourceLocation;
  requestMapping?: string;
  authAnnotations: string[];
  node: Parser.SyntaxNode;
}

export function extractControllers(
  tree: JavaTree,
  source: SourceFile
): ControllerInfo[] {
  const query = createJavaQuery(CONTROLLER_CLASS_QUERY);
  const matches = query.matches(tree.rootNode);
  const controllers: ControllerInfo[] = [];
  const seenClassIds = new Set<string>();

  for (const match of matches) {
    const classNode = captureNode(match.captures, "class");
    const classNameNode = captureNode(match.captures, "class_name");

    if (!classNode || !classNameNode || seenClassIds.has(classId(classNode))) {
      continue;
    }

    seenClassIds.add(classId(classNode));
    const requestMapping = extractClassRequestMapping(classNode);
    controllers.push({
      name: classNameNode.text,
      source: {
        file: source.file.replace(/\\/g, "/"),
        line: classNode.startPosition.row + 1,
        column: classNode.startPosition.column
      },
      authAnnotations: extractClassAuthAnnotations(classNode),
      node: classNode,
      ...(requestMapping !== undefined ? { requestMapping } : {})
    });
  }

  return controllers;
}

function extractClassRequestMapping(
  classNode: Parser.SyntaxNode
): string | undefined {
  const annotation = classAnnotations(classNode).find(
    (candidate) => annotationName(candidate) === "RequestMapping"
  );
  const args = annotation?.childForFieldName("arguments");

  if (!args) {
    return undefined;
  }

  return firstStringLiteral(args)?.replace(/^"|"$/g, "") ?? trimArguments(args.text);
}

function extractClassAuthAnnotations(classNode: Parser.SyntaxNode): string[] {
  return classAnnotations(classNode)
    .filter((annotation) =>
      /^(PreAuthorize|PostAuthorize|Secured|RolesAllowed)$/.test(
        annotationName(annotation) ?? ""
      )
    )
    .map((annotation) => annotation.text);
}

function classAnnotations(classNode: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const modifiers = classNode.namedChildren.find(
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

function firstStringLiteral(node: Parser.SyntaxNode): string | undefined {
  if (node.type === "string_literal") {
    return node.text;
  }

  for (const child of node.namedChildren) {
    const literal = firstStringLiteral(child);
    if (literal !== undefined) {
      return literal;
    }
  }

  return undefined;
}

function trimArguments(text: string): string {
  return text.replace(/^\(/, "").replace(/\)$/, "");
}

function captureNode(
  captures: Parser.QueryCapture[],
  name: string
): Parser.SyntaxNode | undefined {
  return captures.find((capture) => capture.name === name)?.node;
}

function classId(node: Parser.SyntaxNode): string {
  return `${node.startIndex}:${node.endIndex}`;
}
