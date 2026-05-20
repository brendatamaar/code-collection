import type { AuthRequirement, AuthScheme } from "@code-collection/core";

export const NODE_AUTH_SCHEME: AuthScheme = {
  id: "node-auth",
  type: "bearer",
  bearerFormat: "JWT",
  description: "Node middleware bearer authentication"
};

export function detectNodeAuth(text: string): AuthRequirement[] {
  return /\b(requireAuth|authMiddleware|passport\.authenticate|jwt\.verify)\b/.test(
    text
  )
    ? [{ schemeId: NODE_AUTH_SCHEME.id, description: "Node auth middleware detected" }]
    : [];
}
