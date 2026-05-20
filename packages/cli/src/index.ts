#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineCommand, runMain } from "citty";

import { extractCommand } from "./commands/extract.js";
import { exitCodeForError, formatError } from "./output/error-formatter.js";

const version = readPackageVersion();

const main = defineCommand({
  meta: {
    name: "code-collection",
    version,
    description: "Generate API collections from backend code"
  },
  subCommands: {
    extract: extractCommand
  }
});

try {
  await runMain(main);
} catch (error) {
  process.stderr.write(`${formatError(error)}\n`);
  process.exitCode = exitCodeForError(error);
}

function readPackageVersion(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packagePath = join(currentDir, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
    version?: string;
  };

  return packageJson.version ?? "0.0.0";
}
