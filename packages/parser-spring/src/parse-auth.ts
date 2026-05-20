import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AuthRequirement, AuthScheme } from "@code-collection/core";

const AUTH_ANNOTATION_PATTERN = /^@(PreAuthorize|PostAuthorize|Secured|RolesAllowed)\b/;

export const SPRING_SECURITY_AUTH_SCHEME: AuthScheme = {
  id: "spring-security",
  type: "bearer",
  bearerFormat: "JWT",
  description: "Spring Security bearer authentication"
};

export function extractAuthAnnotations(annotationTexts: string[]): string[] {
  return annotationTexts.filter((annotation) =>
    AUTH_ANNOTATION_PATTERN.test(annotation.trim())
  );
}

export function endpointSecurity(
  classAnnotations: string[],
  methodAnnotations: string[]
): AuthRequirement[] {
  const effective =
    methodAnnotations.length > 0 ? methodAnnotations : classAnnotations;
  if (effective.length === 0) {
    return [];
  }

  return [
    {
      schemeId: SPRING_SECURITY_AUTH_SCHEME.id,
      description: effective.map(describeAuthAnnotation).join("; ")
    }
  ];
}

export async function sourceTreeHasSecurityFilterChain(
  repoPath: string,
  files: string[]
): Promise<boolean> {
  for (const file of files.filter((candidate) => candidate.endsWith(".java"))) {
    const content = await readFile(join(repoPath, file), "utf8").catch(() => undefined);
    if (content === undefined) {
      continue;
    }
    if (
      /SecurityFilterChain\s+[A-Za-z_]\w*\s*\(/.test(content) &&
      /@Bean\b/.test(content)
    ) {
      return true;
    }
  }

  return false;
}

function describeAuthAnnotation(annotation: string): string {
  return annotation.replace(/\s+/g, " ").trim();
}
