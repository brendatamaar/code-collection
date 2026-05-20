import ts from "typescript";

export function extractMountPrefixes(content: string): Map<string, string> {
  return extractMountPrefixesFromSourceFile(
    ts.createSourceFile("routes.ts", content, ts.ScriptTarget.Latest, true)
  );
}

export function extractMountPrefixesFromSourceFile(
  sourceFile: ts.SourceFile
): Map<string, string> {
  const prefixes = new Map<string, string>();

  function visit(node: ts.Node): void {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
      ts.forEachChild(node, visit);
      return;
    }

    const receiver = node.expression.expression;
    const method = node.expression.name.text;
    const firstArgument = node.arguments[0];
    const secondArgument = node.arguments[1];

    if (
      (method === "use" || method === "route") &&
      ts.isIdentifier(receiver) &&
      (receiver.text === "app" || receiver.text === "server") &&
      isStringLiteralLike(firstArgument) &&
      secondArgument &&
      ts.isIdentifier(secondArgument)
    ) {
      prefixes.set(secondArgument.text, normalizePath(firstArgument.text));
    }

    if (
      method === "register" &&
      firstArgument &&
      ts.isIdentifier(firstArgument) &&
      secondArgument &&
      ts.isObjectLiteralExpression(secondArgument)
    ) {
      const prefix = prefixFromOptions(secondArgument);
      if (prefix) {
        prefixes.set(firstArgument.text, normalizePath(prefix));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return prefixes;
}

export function joinPaths(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const leading = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return leading.length > 1 ? leading.replace(/\/+$/g, "") : leading;
}

function prefixFromOptions(options: ts.ObjectLiteralExpression): string | undefined {
  for (const property of options.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      property.name.getText() === "prefix" &&
      isStringLiteralLike(property.initializer)
    ) {
      return property.initializer.text;
    }
  }

  return undefined;
}

function isStringLiteralLike(
  node: ts.Node | undefined
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return (
    node !== undefined &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  );
}
