import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { defineConfig } from "@code-collection/core";
import { defineCommand } from "citty";

import { DEFAULT_INIT_ANSWERS, promptForInitDefaults } from "../prompts.js";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description:
      "Interactively create a code-collection.config.ts in the target repository. " +
      "Prompts for stack, output format, base URL, and split-by-version preference. " +
      "Use --yes to skip prompts and write defaults."
  },
  args: {
    path: {
      type: "positional",
      description:
        "Path to the repository root where the config file will be written. " +
        "Defaults to the current directory.",
      default: "."
    },
    yes: {
      type: "boolean",
      alias: "y",
      description:
        "Skip all interactive prompts and write a config file with sensible defaults: " +
        "stack=auto, format=postman, output=./api-collection.json, no split-by-version."
    },
    force: {
      type: "boolean",
      description:
        "Overwrite an existing code-collection.config.ts without prompting. " +
        "Without this flag the command exits with an error if the file already exists."
    },
    gitignore: {
      type: "boolean",
      description:
        "Append generated collection and environment file patterns to the " +
        "repository's .gitignore: api-collection.json, api-collections/, " +
        "*.postman_environment.json."
    }
  },
  async run({ args }) {
    const repoPath = typeof args.path === "string" ? args.path : ".";
    const answers = args.yes === true ? DEFAULT_INIT_ANSWERS : await promptForInitDefaults();
    const configPath = resolve(repoPath, "code-collection.config.ts");

    if (existsSync(configPath) && args.force !== true) {
      throw new Error(`Config already exists at ${configPath}. Use --force to overwrite.`);
    }

    const configOptions: Parameters<typeof defineConfig>[0] = {
      stack: answers.stack,
      output: {
        formats: [answers.format],
        file: answers.output,
        directory: "./api-collections",
        splitByVersion: answers.splitByVersion
      },
      ...(answers.baseUrl ? { servers: [{ url: answers.baseUrl }] } : {})
    };
    const config = `import { defineConfig } from "@code-collection/core";\n\nexport default defineConfig(${JSON.stringify(
      defineConfig(configOptions),
      null,
      2
    )});\n`;

    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, config, "utf8");

    if (args.gitignore === true) {
      await appendFile(
        resolve(repoPath, ".gitignore"),
        "\n# code-collection\napi-collection.json\napi-collections/\n*.postman_environment.json\n",
        "utf8"
      );
    }

    process.stdout.write(`Created ${configPath}\n`);
  }
});
