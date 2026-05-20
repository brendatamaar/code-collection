import { describe, expect, it } from "vitest";

import { createLogger } from "../logger.js";
import type { DetectedStack, Detector } from "./index.js";
import { detectStacks } from "./index.js";

function mockParser(stacks: DetectedStack[]): Detector {
  return {
    async detect() {
      return stacks;
    }
  };
}

describe("detectStacks", () => {
  it("aggregates parser detections sorted by confidence descending", async () => {
    const logger = createLogger({ level: "silent", ci: true });
    const results = await detectStacks(
      [
        mockParser([
          {
            name: "spring",
            variant: "spring-boot",
            confidence: 0.9,
            markers: ["pom.xml"]
          }
        ]),
        mockParser([
          {
            name: "node",
            variant: "express",
            confidence: 0.7,
            markers: ["package.json"]
          },
          {
            name: "go",
            variant: "gin",
            confidence: 0.95,
            markers: ["go.mod"]
          }
        ])
      ],
      { repoPath: "/repo", logger }
    );

    expect(results.map((result) => result.name)).toEqual([
      "go",
      "spring",
      "node"
    ]);
  });

  it("filters out stacks below the confidence threshold", async () => {
    const logger = createLogger({ level: "silent", ci: true });
    const results = await detectStacks(
      [
        mockParser([
          {
            name: "spring",
            confidence: 0.49,
            markers: ["src/main/resources/application.yml"]
          },
          {
            name: "laravel",
            confidence: 0.5,
            markers: ["artisan"]
          }
        ])
      ],
      { repoPath: "/repo", logger }
    );

    expect(results).toEqual([
      {
        name: "laravel",
        confidence: 0.5,
        markers: ["artisan"]
      }
    ]);
  });

  it("returns an empty array when no parser detects a stack", async () => {
    const logger = createLogger({ level: "silent", ci: true });

    await expect(
      detectStacks([mockParser([]), mockParser([])], { repoPath: "/repo", logger })
    ).resolves.toEqual([]);
  });
});
