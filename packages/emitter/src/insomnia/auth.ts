import type { AuthScheme, Endpoint } from "@code-collection/core";

import type { InsomniaAuthentication } from "./types.js";

export function emitAuth(
  endpoint: Endpoint,
  authSchemes: AuthScheme[]
): InsomniaAuthentication {
  if (endpoint.security.length === 0) {
    return { type: "none" };
  }

  const schemeId = endpoint.security[0]?.schemeId;
  const scheme = authSchemes.find((s) => s.id === schemeId);

  if (!scheme) {
    return { type: "none" };
  }

  if (scheme.type === "bearer") {
    return {
      type: "bearer",
      token: "{{ _.bearerToken }}",
      prefix: "Bearer",
      disabled: false
    };
  }

  if (scheme.type === "basic") {
    return {
      type: "basic",
      username: "{{ _.username }}",
      password: "{{ _.password }}",
      disabled: false
    };
  }

  if (scheme.type === "apiKey") {
    return {
      type: "apikey",
      key: scheme.name,
      value: "{{ _.apiKey }}",
      addTo: scheme.in === "query" ? "queryParams" : "header",
      disabled: false
    };
  }

  if (scheme.type === "oauth2") {
    return { type: "oauth2" };
  }

  return { type: "none" };
}

export function baseEnvironmentAuthVars(
  authSchemes: AuthScheme[]
): Record<string, string> {
  const scheme = authSchemes[0];
  if (!scheme) {
    return {};
  }

  if (scheme.type === "bearer") {
    return { bearerToken: "" };
  }

  if (scheme.type === "basic") {
    return { username: "", password: "" };
  }

  if (scheme.type === "apiKey") {
    return { apiKey: "" };
  }

  return {};
}
