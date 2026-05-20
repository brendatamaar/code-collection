import type Parser from "tree-sitter";

const LOMBOK_ANNOTATIONS = new Set([
  "Data",
  "Getter",
  "Setter",
  "Value",
  "Builder",
  "AllArgsConstructor"
]);

export function hasLombokAnnotation(classNode: Parser.SyntaxNode): boolean {
  const modifiers = classNode.namedChildren.find(
    (child) => child.type === "modifiers"
  );
  if (!modifiers) {
    return false;
  }

  return modifiers.namedChildren.some((annotation) =>
    LOMBOK_ANNOTATIONS.has(annotation.childForFieldName("name")?.text ?? "")
  );
}
