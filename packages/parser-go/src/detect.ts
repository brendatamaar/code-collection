import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DetectContext, DetectedStack } from "@code-collection/core";

const VARIANTS: [string, string][] = [
  ["gin-gonic/gin", "gin"],
  ["labstack/echo", "echo"],
  ["gofiber/fiber", "fiber"],
  ["go-chi/chi", "chi"]
];

export async function detect(ctx: DetectContext): Promise<DetectedStack[]> {
  const goMod = join(ctx.repoPath, "go.mod");
  if (!existsSync(goMod)) {
    return [];
  }

  const content = readFileSync(goMod, "utf8");
  const variant =
    VARIANTS.find(([moduleName]) => content.includes(moduleName))?.[1] ??
    "stdlib";

  return [
    {
      name: "go",
      variant,
      confidence: 1,
      markers: ["go.mod"]
    }
  ];
}
