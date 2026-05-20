import type { Logger } from "../logger.js";

export type StackName = "spring" | "laravel" | "go" | "node";

export interface DetectContext {
  repoPath: string;
  logger: Logger;
}

export interface DetectedStack {
  name: StackName;
  variant?: string;
  confidence: number;
  markers: string[];
}

export interface Detector {
  detect(ctx: DetectContext): Promise<DetectedStack[]>;
}

export async function detectStacks(
  parsers: Detector[],
  ctx: DetectContext
): Promise<DetectedStack[]> {
  const detectedStacks = await Promise.all(
    parsers.map((parser) => parser.detect(ctx))
  );

  return detectedStacks
    .flat()
    .filter((stack) => stack.confidence >= 0.5)
    .sort((left, right) => right.confidence - left.confidence);
}
