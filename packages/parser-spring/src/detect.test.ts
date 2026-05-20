import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createLogger } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { detect } from "./detect.js";

async function fixture(content: string, fileName = "pom.xml"): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), "parser-spring-detect-"));
  await writeFile(join(repoPath, fileName), content);
  return repoPath;
}

const logger = createLogger({ level: "silent", ci: true });

describe("spring detect", () => {
  it("detects Spring Boot from pom.xml starter dependencies", async () => {
    const repoPath = await fixture(`
      <project>
        <dependency>
          <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
      </project>
    `);

    await expect(detect({ repoPath, logger })).resolves.toEqual([
      {
        name: "spring",
        variant: "spring-boot",
        confidence: 1,
        markers: ["pom.xml"]
      }
    ]);
  });

  it("detects Spring MVC from pom.xml org.springframework dependencies", async () => {
    const repoPath = await fixture(`
      <project>
        <dependency>
          <groupId>org.springframework</groupId>
          <artifactId>spring-webmvc</artifactId>
        </dependency>
      </project>
    `);

    await expect(detect({ repoPath, logger })).resolves.toEqual([
      {
        name: "spring",
        variant: "spring-mvc",
        confidence: 0.7,
        markers: ["pom.xml"]
      }
    ]);
  });

  it("detects Spring Boot from Gradle build files", async () => {
    const repoPath = await fixture(
      'plugins { id("org.springframework.boot") version "3.2.0" }',
      "build.gradle.kts"
    );

    await expect(detect({ repoPath, logger })).resolves.toEqual([
      {
        name: "spring",
        variant: "spring-boot",
        confidence: 1,
        markers: ["build.gradle.kts"]
      }
    ]);
  });

  it("detects Spring MVC from Gradle spring-webmvc dependencies", async () => {
    const repoPath = await fixture(
      "dependencies { implementation 'org.springframework:spring-webmvc:6.1.0' }",
      "build.gradle"
    );

    await expect(detect({ repoPath, logger })).resolves.toEqual([
      {
        name: "spring",
        variant: "spring-mvc",
        confidence: 0.7,
        markers: ["build.gradle"]
      }
    ]);
  });

  it("returns empty when no markers are found", async () => {
    const repoPath = await fixture("<project />");

    await expect(detect({ repoPath, logger })).resolves.toEqual([]);
  });
});
