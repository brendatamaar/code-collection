#!/usr/bin/env tsx

/**
 * Build standalone binaries for all target platforms using `bun build --compile`.
 * Outputs to dist/binaries/<platform>/.
 *
 * Usage:
 *   bun run scripts/build-binaries.ts
 *   bun run scripts/build-binaries.ts --platform bun-linux-x64
 */

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const TARGETS = [
  { target: "bun-linux-x64", binary: "code-collection-linux-x64" },
  { target: "bun-darwin-arm64", binary: "code-collection-darwin-arm64" },
  { target: "bun-darwin-x64", binary: "code-collection-darwin-x64" },
  { target: "bun-windows-x64", binary: "code-collection-windows-x64.exe" }
];

const requestedPlatform = process.argv.find((a) => a.startsWith("--platform="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--platform") + 1];

const selected = requestedPlatform
  ? TARGETS.filter((t) => t.target === requestedPlatform)
  : TARGETS;

if (selected.length === 0) {
  console.error(`Unknown platform: ${requestedPlatform}`);
  console.error(`Available: ${TARGETS.map((t) => t.target).join(", ")}`);
  process.exit(1);
}

const entrypoint = join("packages", "cli", "src", "index.ts");
const outDir = join("dist", "binaries");

mkdirSync(outDir, { recursive: true });

for (const { target, binary } of selected) {
  const outPath = join(outDir, binary);
  const cmd = [
    "bun",
    "build",
    "--compile",
    `--target=${target}`,
    `--outfile=${outPath}`,
    entrypoint
  ].join(" ");

  console.log(`Building ${target} → ${outPath}`);
  console.log(`  $ ${cmd}`);

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`  ✔ ${binary}`);
  } catch (error) {
    console.error(`  ✗ Build failed for ${target}`);
    if (error instanceof Error) {
      console.error(`    ${error.message}`);
    }
    process.exit(1);
  }
}

console.log(`\nAll binaries written to ${outDir}/`);
