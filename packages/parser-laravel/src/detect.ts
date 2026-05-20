import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DetectContext, DetectedStack } from "@code-collection/core";

export async function detect(ctx: DetectContext): Promise<DetectedStack[]> {
  const results: DetectedStack[] = [];
  const composerPath = join(ctx.repoPath, "composer.json");

  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, "utf8")) as {
      require?: Record<string, string>;
    };
    if (composer.require?.["laravel/framework"]) {
      results.push({
        name: "laravel",
        variant: "laravel",
        confidence: 1,
        markers: ["composer.json:laravel/framework"]
      });
    }
  }

  if (existsSync(join(ctx.repoPath, "artisan"))) {
    results.push({
      name: "laravel",
      variant: "laravel",
      confidence: 0.9,
      markers: ["artisan"]
    });
  }

  if (
    existsSync(join(ctx.repoPath, "routes", "web.php")) ||
    existsSync(join(ctx.repoPath, "routes", "api.php"))
  ) {
    results.push({
      name: "laravel",
      variant: "laravel",
      confidence: 0.5,
      markers: ["routes"]
    });
  }

  return results;
}
