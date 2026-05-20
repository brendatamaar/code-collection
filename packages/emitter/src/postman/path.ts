import type { Parameter } from "@code-collection/core";

export interface PostmanUrl {
  raw: string;
  host: string[];
  path: string[];
  query?: PostmanQueryParam[];
  variable?: PostmanPathVariable[];
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanPathVariable {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export function pathToPostmanUrl(
  path: string,
  parameters: Parameter[],
  baseUrlVar = "{{baseUrl}}"
): PostmanUrl {
  const postmanPath = path.replace(/\{([^}:]+)(?::[^}]+)?\}/g, ":$1");
  const queryParameters = parameters
    .filter((parameter) => parameter.in === "query")
    .map((parameter) => ({
      key: parameter.name,
      value: exampleParameterValue(parameter),
      ...(parameter.description ? { description: parameter.description } : {}),
      ...(!parameter.required ? { disabled: true } : {})
    }));
  const pathVariables = parameters
    .filter((parameter) => parameter.in === "path")
    .map((parameter) => ({
      key: parameter.name,
      value: "",
      description: parameter.description ?? schemaDescription(parameter),
      ...(!parameter.required ? { disabled: true } : {})
    }));

  return {
    raw: `${baseUrlVar}${postmanPath}${
      queryParameters.length > 0
        ? `?${queryParameters.map((parameter) => `${parameter.key}=${parameter.value}`).join("&")}`
        : ""
    }`,
    host: [baseUrlVar],
    path: postmanPath.split("/").filter(Boolean),
    ...(queryParameters.length > 0 ? { query: queryParameters } : {}),
    ...(pathVariables.length > 0 ? { variable: pathVariables } : {})
  };
}

function exampleParameterValue(parameter: Parameter): string {
  if (parameter.example !== undefined) {
    return String(parameter.example);
  }

  if ("type" in parameter.schema) {
    if (parameter.schema.type === "integer" || parameter.schema.type === "number") {
      return "0";
    }
    if (parameter.schema.type === "boolean") {
      return "false";
    }
  }

  return "";
}

function schemaDescription(parameter: Parameter): string {
  if ("type" in parameter.schema) {
    return `${parameter.name} (${parameter.schema.type})`;
  }

  return parameter.name;
}
