import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DetectContext, DetectedStack } from "@code-collection/core";

const FRAMEWORKS = ["express", "hono", "fastify", "koa"] as const;

export async function detect(ctx: DetectContext): Promise<DetectedStack[]> {
  for (const packageFile of findPackageFiles(ctx.repoPath)) {
    const packageJson = JSON.parse(readFileSync(join(ctx.repoPath, packageFile), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    const framework = FRAMEWORKS.find((candidate) => dependencies[candidate]);
    if (framework) {
      return [
        {
          name: "node",
          variant: framework,
          confidence: 1,
          markers: [`${packageFile}:${framework}`]
        }
      ];
    }
  }

  return [];
}

function findPackageFiles(repoPath: string): string[] {
  const found: string[] = [];

  function visit(relativeDir: string, depth: number): void {
    if (depth > 3) {
      return;
    }
    const absolute = join(repoPath, relativeDir);
    if (!existsSync(absolute)) {
      return;
    }

    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!["node_modules", "vendor", "dist", "build", ".git"].includes(entry.name)) {
          visit(relativePath, depth + 1);
        }
        continue;
      }
      if (entry.name === "package.json") {
        found.push(relativePath);
      }
    }
  }

  visit("", 0);
  return found;
}
