import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const fixtureRoot = join(process.cwd(), "packages", "cli", "tests", "fixtures", "spring-cli");
describe("extract command", () => {
    it("runs end-to-end against a Spring fixture", async () => {
        await prepareFixture();
        const outputPath = join(fixtureRoot, "api-collection.json");
        const { stdout, stderr, exitCode } = await runCli([
            "extract",
            fixtureRoot,
            "--stack",
            "spring",
            "--output",
            outputPath
        ]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe("");
        expect(stderr).toContain("Parsed 1 endpoints");
        const collection = JSON.parse(await readFile(outputPath, "utf8"));
        expect(collection.item[0]?.item).toHaveLength(1);
    });
});
async function prepareFixture() {
    await rm(fixtureRoot, { recursive: true, force: true });
    await mkdir(join(fixtureRoot, "src", "main", "java", "com", "example"), {
        recursive: true
    });
    await writeFile(join(fixtureRoot, "pom.xml"), "<project><artifactId>spring-boot-starter-web</artifactId></project>");
    await writeFile(join(fixtureRoot, "src", "main", "java", "com", "example", "UserController.java"), `
package com.example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
  @GetMapping("/users")
  public String users() {
    return "ok";
  }
}
`);
}
async function runCli(args) {
    const child = spawn("bun", ["run", "cli", "--", ...args], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    const exitCode = await new Promise((resolveExit) => {
        child.on("close", resolveExit);
    });
    return {
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode
    };
}
//# sourceMappingURL=extract.test.js.map