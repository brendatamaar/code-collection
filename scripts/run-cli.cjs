#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const bunCommand = process.env.npm_execpath ?? "bun";

const build = spawnSync(bunCommand, ["run", "build", "--", "--force"], {
  cwd: root,
  stdio: "inherit"
});

if (build.error) {
  throw build.error;
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const cli = spawnSync(
  process.execPath,
  [resolve(root, "packages", "cli", "dist", "index.js"), ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: "inherit"
  }
);

if (cli.error) {
  throw cli.error;
}

process.exit(cli.status ?? (cli.signal ? 1 : 0));
