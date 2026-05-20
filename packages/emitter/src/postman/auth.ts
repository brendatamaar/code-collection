import type { IR } from "@code-collection/core";

import type { PostmanAuth } from "./types.js";

export function emitAuth(ir: IR): PostmanAuth | undefined {
  const scheme = ir.auth[0];
  if (!scheme) {
    return undefined;
  }

  if (scheme.type === "bearer") {
    return {
      type: "bearer",
      bearer: [{ key: "token", value: "{{bearerToken}}", type: "string" }]
    };
  }

  if (scheme.type === "basic") {
    return {
      type: "basic",
      basic: [
        { key: "username", value: "{{username}}", type: "string" },
        { key: "password", value: "{{password}}", type: "string" }
      ]
    };
  }

  if (scheme.type === "apiKey") {
    return {
      type: "apikey",
      apikey: [
        { key: "key", value: scheme.name, type: "string" },
        { key: "value", value: "{{apiKey}}", type: "string" },
        { key: "in", value: scheme.in, type: "string" }
      ]
    };
  }

  if (scheme.type === "oauth2") {
    return {
      type: "oauth2",
      oauth2: []
    };
  }

  return { type: "noauth" };
}
