import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseFile } from "../packages/parser-spring/src/tree-sitter.js";

const filePath = process.argv[2];

if (!filePath) {
  process.stderr.write("Usage: bun run dump:ast <file>\n");
  process.exitCode = 2;
} else {
  const source = await readFile(resolve(filePath), "utf8");
  const tree = parseFile(source);
  process.stdout.write(`${tree.rootNode.toString()}\n`);
}
