import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { defineConfig } from "@code-collection/core";
import { defineCommand } from "citty";

import { DEFAULT_INIT_ANSWERS, promptForInitDefaults } from "../prompts.js";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Create a code-collection config file"
  },
  args: {
    path: {
      type: "positional",
      description: "Repository root",
      default: "."
    },
    yes: {
      type: "boolean",
      description: "Write defaults without prompts"
    },
    force: {
      type: "boolean",
      description: "Overwrite an existing config"
    },
    gitignore: {
      type: "boolean",
      description: "Append generated collection files to .gitignore"
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
