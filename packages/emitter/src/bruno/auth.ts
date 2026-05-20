import type { AuthScheme } from "@code-collection/core";

import { dictionaryBlock } from "./bru-syntax.js";

export function emitBrunoAuth(auth: AuthScheme | undefined): string | undefined {
  if (!auth) {
    return undefined;
  }

  if (auth.type === "bearer") {
    return dictionaryBlock("auth:bearer", { token: "{{bearerToken}}" });
  }
  if (auth.type === "basic") {
    return dictionaryBlock("auth:basic", {
      username: "{{username}}",
      password: "{{password}}"
    });
  }
  if (auth.type === "apiKey") {
    return dictionaryBlock("auth:apikey", {
      key: auth.name,
      value: "{{apiKey}}",
      placement: auth.in
    });
  }

  return undefined;
}
