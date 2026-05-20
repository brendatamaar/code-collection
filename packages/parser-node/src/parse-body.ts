import type { RequestBody, Schema } from "@code-collection/core";
import ts from "typescript";

export function inferRequestBody(
  content: string,
  handlerText: string
): RequestBody | undefined {
  const typeName = /Request\s*<[^>]*body\s*:\s*([A-Za-z_]\w*)/i.exec(handlerText)?.[1]
    ?? /Request\s*<\s*[^,]+,\s*[^,]+,\s*([A-Za-z_]\w*)/i.exec(handlerText)?.[1];
  if (!typeName) {
    return undefined;
  }

  return requestBodyFromSchema(interfaceSchema(content, typeName));
}

export function inferRequestBodyFromHandler(
  handlerExpression: ts.Expression | undefined,
  checker: ts.TypeChecker | undefined,
  sourceFile: ts.SourceFile
): RequestBody | undefined {
  if (!handlerExpression || !checker) {
    return undefined;
  }

  const handler = resolveHandlerFunction(handlerExpression, checker);
  const requestParameter = handler?.parameters[0];
  if (!requestParameter) {
    return undefined;
  }

  const bodyType = bodyTypeFromRequestParameter(requestParameter, checker, sourceFile);
  if (!bodyType || isAnyLike(bodyType)) {
    return undefined;
  }

  return requestBodyFromSchema(schemaFromType(bodyType, checker, sourceFile, 0));
}

function interfaceSchema(content: string, typeName: string): Schema {
  const body = new RegExp(`(?:interface|type)\\s+${typeName}\\s*(?:=)?\\s*\\{([\\s\\S]*?)\\}`).exec(
    content
  )?.[1];
  if (!body) {
    return { type: "object" };
  }

  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  for (const match of body.matchAll(/([A-Za-z_]\w*)(\?)?\s*:\s*([^;\n]+)/g)) {
    const name = match[1];
    const optional = match[2] === "?";
    const type = match[3];
    if (!name || !type) {
      continue;
    }
    properties[name] = schemaForType(type);
    if (!optional) {
      required.push(name);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {})
  };
}

function resolveHandlerFunction(
  handlerExpression: ts.Expression,
  checker: ts.TypeChecker
): ts.FunctionLikeDeclaration | undefined {
  if (isFunctionLike(handlerExpression)) {
    return handlerExpression;
  }

  const symbol = checker.getSymbolAtLocation(handlerExpression);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (
    declaration &&
    (ts.isFunctionDeclaration(declaration) || isFunctionLike(declaration))
  ) {
    return declaration;
  }

  if (
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer &&
    isFunctionLike(declaration.initializer)
  ) {
    return declaration.initializer;
  }

  return undefined;
}

function bodyTypeFromRequestParameter(
  requestParameter: ts.ParameterDeclaration,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): ts.Type | undefined {
  const requestType = checker.getTypeAtLocation(requestParameter);
  const bodyProperty = checker.getPropertyOfType(requestType, "body");
  if (bodyProperty) {
    return checker.getTypeOfSymbolAtLocation(bodyProperty, sourceFile);
  }

  return requestParameter.type
    ? bodyTypeFromRequestTypeNode(requestParameter.type, checker, sourceFile)
    : undefined;
}

function bodyTypeFromRequestTypeNode(
  typeNode: ts.TypeNode,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): ts.Type | undefined {
  if (!ts.isTypeReferenceNode(typeNode) || !typeNode.typeArguments) {
    return undefined;
  }

  const typeName = typeNode.typeName.getText(sourceFile);
  if (!/(^|\.)Request$/.test(typeName)) {
    return undefined;
  }

  const expressBodyType = typeNode.typeArguments[2];
  if (expressBodyType) {
    return checker.getTypeFromTypeNode(expressBodyType);
  }

  const firstArgument = typeNode.typeArguments[0];
  if (!firstArgument) {
    return undefined;
  }

  const firstArgumentType = checker.getTypeFromTypeNode(firstArgument);
  const bodyProperty = checker.getPropertyOfType(firstArgumentType, "body");
  if (bodyProperty) {
    return checker.getTypeOfSymbolAtLocation(bodyProperty, sourceFile);
  }

  if (ts.isTypeLiteralNode(firstArgument)) {
    const bodyMember = firstArgument.members.find(
      (member): member is ts.PropertySignature =>
        ts.isPropertySignature(member) &&
        member.name.getText(sourceFile) === "body" &&
        member.type !== undefined
    );
    return bodyMember?.type ? checker.getTypeFromTypeNode(bodyMember.type) : undefined;
  }

  return undefined;
}

function requestBodyFromSchema(schema: Schema): RequestBody {
  return {
    required: true,
    content: {
      "application/json": {
        schema
      }
    }
  };
}

function schemaFromType(
  type: ts.Type,
  checker: ts.TypeChecker,
  location: ts.Node,
  depth: number
): Schema {
  const nonNullable = checker.getNonNullableType(type);

  if (isStringLike(nonNullable)) {
    return { type: "string" };
  }
  if (isNumberLike(nonNullable)) {
    return { type: "number" };
  }
  if (isBooleanLike(nonNullable)) {
    return { type: "boolean" };
  }
  if (checker.isArrayType(nonNullable)) {
    const itemType = checker.getTypeArguments(nonNullable as ts.TypeReference)[0];
    return {
      type: "array",
      items: itemType
        ? schemaFromType(itemType, checker, location, depth + 1)
        : { type: "string" }
    };
  }

  const properties = checker.getPropertiesOfType(nonNullable);
  if (properties.length > 0) {
    if (depth >= 1) {
      return { type: "object" };
    }

    const objectProperties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const property of properties) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0];
      const propertyType = checker.getTypeOfSymbolAtLocation(
        property,
        declaration ?? location
      );
      objectProperties[property.name] = schemaFromType(
        propertyType,
        checker,
        declaration ?? location,
        depth + 1
      );
      if (!isOptionalProperty(property, propertyType)) {
        required.push(property.name);
      }
    }

    return {
      type: "object",
      properties: objectProperties,
      ...(required.length > 0 ? { required } : {})
    };
  }

  return { type: "string" };
}

function isOptionalProperty(property: ts.Symbol, type: ts.Type): boolean {
  return (
    (property.flags & ts.SymbolFlags.Optional) !== 0 ||
    (type.flags & ts.TypeFlags.Undefined) !== 0 ||
    (type.isUnion() &&
      type.types.some((part) => (part.flags & ts.TypeFlags.Undefined) !== 0))
  );
}

function isAnyLike(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0;
}

function isStringLike(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.StringLike) !== 0;
}

function isNumberLike(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.NumberLike) !== 0;
}

function isBooleanLike(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.BooleanLike) !== 0;
}

function isFunctionLike(node: unknown): node is ts.FunctionLikeDeclaration {
  return (
    typeof node === "object" &&
    node !== null &&
    (ts.isArrowFunction(node as ts.Node) ||
      ts.isFunctionExpression(node as ts.Node) ||
      ts.isFunctionDeclaration(node as ts.Node))
  );
}

function schemaForType(typeText: string): Schema {
  const type = typeText.trim();
  if (/number/.test(type)) {
    return { type: "number" };
  }
  if (/boolean/.test(type)) {
    return { type: "boolean" };
  }
  if (/\[\]|Array</.test(type)) {
    return { type: "array", items: { type: "string" } };
  }
  return { type: "string" };
}
