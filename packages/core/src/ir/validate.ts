import { CodeCollectionError, WarningCode } from "../errors.js";
import type { IR, Schema } from "./schema.js";

const PATH_PARAMETER_PATTERN = /\{([^}:]+)(?::[^}]+)?\}/g;
const SERVER_VARIABLE_PATTERN = /(?<!\{)\{([^}]+)\}(?!\})/g;
const RESPONSE_STATUS_PATTERN = /^[1-5][0-9]{2}$/;

export function validateIR(ir: IR): IR {
  const errors: string[] = [];

  validatePathParameters(ir, errors);
  validateAuthReferences(ir, errors);
  validateSchemaReferences(ir, errors);
  validateEndpointIds(ir, errors);
  validateResponseStatusCodes(ir, errors);
  validateMethodBodyConsistency(ir);
  validateServerVariables(ir, errors);

  if (errors.length > 0) {
    throw new CodeCollectionError({
      code: "IR_VALIDATION_FAILED",
      message: `IR validation failed: ${errors.join("; ")}`
    });
  }

  return ir;
}

function validatePathParameters(ir: IR, errors: string[]): void {
  ir.endpoints.forEach((endpoint, endpointIndex) => {
    const pathParameters = new Set(extractPathParameters(endpoint.path));
    const declaredParameters = endpoint.parameters.filter(
      (parameter) => parameter.in === "path"
    );
    const declaredNames = new Set(declaredParameters.map((parameter) => parameter.name));

    for (const pathParameter of pathParameters) {
      const declaredParameter = declaredParameters.find(
        (parameter) => parameter.name === pathParameter
      );

      if (!declaredParameter) {
        errors.push(
          `endpoints[${endpointIndex}].parameters missing path parameter '${pathParameter}' for endpoints[${endpointIndex}].path`
        );
      } else if (!declaredParameter.required) {
        errors.push(
          `endpoints[${endpointIndex}].parameters['${pathParameter}'].required must be true`
        );
      }
    }

    for (const declaredName of declaredNames) {
      if (!pathParameters.has(declaredName)) {
        errors.push(
          `endpoints[${endpointIndex}].parameters['${declaredName}'] is not present in endpoints[${endpointIndex}].path`
        );
      }
    }
  });
}

function validateAuthReferences(ir: IR, errors: string[]): void {
  const authSchemeIds = new Set(ir.auth.map((scheme) => scheme.id));

  ir.endpoints.forEach((endpoint, endpointIndex) => {
    endpoint.security.forEach((requirement, securityIndex) => {
      if (!authSchemeIds.has(requirement.schemeId)) {
        errors.push(
          `endpoints[${endpointIndex}].security[${securityIndex}].schemeId references missing auth scheme '${requirement.schemeId}'`
        );
      }
    });
  });
}

function validateSchemaReferences(ir: IR, errors: string[]): void {
  const schemaNames = new Set(Object.keys(ir.schemas));

  Object.entries(ir.schemas).forEach(([schemaName, schema]) => {
    validateSchemaRef(schema, `schemas.${schemaName}`, schemaNames, errors);
  });

  ir.endpoints.forEach((endpoint, endpointIndex) => {
    endpoint.parameters.forEach((parameter, parameterIndex) => {
      validateSchemaRef(
        parameter.schema,
        `endpoints[${endpointIndex}].parameters[${parameterIndex}].schema`,
        schemaNames,
        errors
      );
    });

    if (endpoint.requestBody) {
      Object.entries(endpoint.requestBody.content).forEach(([contentType, mediaType]) => {
        validateSchemaRef(
          mediaType.schema,
          `endpoints[${endpointIndex}].requestBody.content['${contentType}'].schema`,
          schemaNames,
          errors
        );
      });
    }

    Object.entries(endpoint.responses).forEach(([statusCode, response]) => {
      if (response.content) {
        Object.entries(response.content).forEach(([contentType, mediaType]) => {
          validateSchemaRef(
            mediaType.schema,
            `endpoints[${endpointIndex}].responses['${statusCode}'].content['${contentType}'].schema`,
            schemaNames,
            errors
          );
        });
      }

      if (response.headers) {
        Object.entries(response.headers).forEach(([headerName, parameter]) => {
          validateSchemaRef(
            parameter.schema,
            `endpoints[${endpointIndex}].responses['${statusCode}'].headers['${headerName}'].schema`,
            schemaNames,
            errors
          );
        });
      }
    });
  });
}

function validateSchemaRef(
  schema: Schema,
  path: string,
  schemaNames: Set<string>,
  errors: string[]
): void {
  if ("$ref" in schema) {
    const schemaName = schema.$ref.slice("#/schemas/".length);
    if (!schemaNames.has(schemaName)) {
      errors.push(`${path} references missing schema '${schema.$ref}'`);
    }
    return;
  }

  if (schema.type === "array") {
    validateSchemaRef(schema.items, `${path}.items`, schemaNames, errors);
    return;
  }

  if (schema.type === "object" && schema.properties) {
    Object.entries(schema.properties).forEach(([propertyName, propertySchema]) => {
      validateSchemaRef(
        propertySchema,
        `${path}.properties.${propertyName}`,
        schemaNames,
        errors
      );
    });
  }
}

function validateEndpointIds(ir: IR, errors: string[]): void {
  const seenEndpointIds = new Map<string, number>();

  ir.endpoints.forEach((endpoint, endpointIndex) => {
    const firstIndex = seenEndpointIds.get(endpoint.id);
    if (firstIndex !== undefined) {
      errors.push(
        `endpoints[${endpointIndex}].id duplicates endpoints[${firstIndex}].id '${endpoint.id}'`
      );
      return;
    }

    seenEndpointIds.set(endpoint.id, endpointIndex);
  });
}

function validateResponseStatusCodes(ir: IR, errors: string[]): void {
  ir.endpoints.forEach((endpoint, endpointIndex) => {
    Object.keys(endpoint.responses).forEach((statusCode) => {
      if (statusCode !== "default" && !RESPONSE_STATUS_PATTERN.test(statusCode)) {
        errors.push(
          `endpoints[${endpointIndex}].responses['${statusCode}'] must be an HTTP status code or 'default'`
        );
      }
    });
  });
}

function validateMethodBodyConsistency(ir: IR): void {
  ir.endpoints.forEach((endpoint) => {
    if (
      endpoint.requestBody &&
      (endpoint.method === "GET" || endpoint.method === "DELETE") &&
      !ir.warnings.some(
        (warning) =>
          warning.code === WarningCode.BODY_ON_GET_OR_DELETE &&
          warning.source?.file === endpoint.source.file &&
          warning.source.line === endpoint.source.line
      )
    ) {
      ir.warnings.push({
        level: "warning",
        code: WarningCode.BODY_ON_GET_OR_DELETE,
        message: `${endpoint.method} ${endpoint.path} declares a request body`,
        source: endpoint.source
      });
    }
  });
}

function validateServerVariables(ir: IR, errors: string[]): void {
  ir.servers.forEach((server, serverIndex) => {
    const variables = new Set(Object.keys(server.variables ?? {}));

    for (const variableName of extractServerVariables(server.url)) {
      if (!variables.has(variableName)) {
        errors.push(
          `servers[${serverIndex}].url references missing variable '${variableName}' in servers[${serverIndex}].variables`
        );
      }
    }
  });
}

function extractPathParameters(path: string): string[] {
  return [...path.matchAll(PATH_PARAMETER_PATTERN)].map((match) => match[1] ?? "");
}

function extractServerVariables(url: string): string[] {
  return [...url.matchAll(SERVER_VARIABLE_PATTERN)].map((match) => match[1] ?? "");
}
