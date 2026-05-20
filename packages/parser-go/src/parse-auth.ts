import type { AuthRequirement, AuthScheme } from "@code-collection/core";

export const GO_AUTH_SCHEME: AuthScheme = {
  id: "go-auth",
  type: "bearer",
  bearerFormat: "JWT",
  description: "Go middleware bearer authentication"
};

export function detectGoAuth(text: string): AuthRequirement[] {
  return /\b(AuthRequired|JWTAuth|RequireAuth|Authenticate)\b/.test(text)
    ? [{ schemeId: GO_AUTH_SCHEME.id, description: "Go auth middleware detected" }]
    : [];
}
