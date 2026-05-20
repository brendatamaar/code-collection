import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { DetectContext, DetectedStack } from "@code-collection/core";

const BUILD_FILES = ["pom.xml", "build.gradle", "build.gradle.kts"] as const;

export async function detect(ctx: DetectContext): Promise<DetectedStack[]> {
  const buildFiles = await findBuildFiles(ctx.repoPath);
  const detections = await Promise.all(
    buildFiles.map(async (fileName) => detectBuildFile(ctx.repoPath, fileName))
  );
  const detected = detections
    .filter((detection): detection is DetectedStack => detection !== undefined)
    .sort((left, right) => right.confidence - left.confidence);

  return detected.length > 0 ? [detected[0] as DetectedStack] : [];
}

async function findBuildFiles(repoPath: string): Promise<string[]> {
  const found: string[] = [];

  async function visit(relativeDir: string, depth: number): Promise<void> {
    if (depth > 3) {
      return;
    }

    const entries = await readdir(join(repoPath, relativeDir), {
      withFileTypes: true
    }).catch(() => []);
    for (const entry of entries) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!["node_modules", "vendor", "target", "build", ".git"].includes(entry.name)) {
          await visit(relativePath, depth + 1);
        }
        continue;
      }
      if ((BUILD_FILES as readonly string[]).includes(entry.name)) {
        found.push(relativePath);
      }
    }
  }

  await visit("", 0);
  return found;
}

async function detectBuildFile(
  repoPath: string,
  fileName: string
): Promise<DetectedStack | undefined> {
  let content: string;
  try {
    content = await readFile(join(repoPath, fileName), "utf8");
  } catch (error) {
    if (isFileNotFound(error)) {
      return undefined;
    }
    throw error;
  }

  if (isSpringBoot(content)) {
    return {
      name: "spring",
      variant: "spring-boot",
      confidence: 1,
      markers: [fileName]
    };
  }

  if (isSpringMvc(content)) {
    return {
      name: "spring",
      variant: "spring-mvc",
      confidence: 0.7,
      markers: [fileName]
    };
  }

  return undefined;
}

function isSpringBoot(content: string): boolean {
  return /spring-boot-starter|org\.springframework\.boot/.test(content);
}

function isSpringMvc(content: string): boolean {
  return /org\.springframework|spring-webmvc/.test(content);
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
