import type { IR } from "@code-collection/core";

import type { PostmanVariable } from "./types.js";

export interface EmitVariablesOptions {
  baseUrl?: string;
}

export function emitVariables(
  ir: IR,
  options: EmitVariablesOptions = {}
): PostmanVariable[] {
  const variables: PostmanVariable[] = [
    {
      key: "baseUrl",
      value: options.baseUrl ?? ir.servers[0]?.url ?? "https://api.example.com"
    }
  ];

  const auth = ir.auth[0];
  if (auth?.type === "bearer") {
    variables.push({ key: "bearerToken", value: "" });
  } else if (auth?.type === "apiKey") {
    variables.push({ key: "apiKey", value: "" });
  } else if (auth?.type === "basic") {
    variables.push({ key: "username", value: "" });
    variables.push({ key: "password", value: "" });
  }

  for (const placeholder of serverPlaceholders(variables[0]?.value ?? "")) {
    if (!variables.some((variable) => variable.key === placeholder)) {
      variables.push({ key: placeholder, value: "" });
    }
  }

  return variables;
}

function serverPlaceholders(url: string): string[] {
  return [...url.matchAll(/(?<!\{)\{([^}]+)\}(?!\})/g)]
    .map((match) => match[1])
    .filter((match): match is string => match !== undefined);
}
