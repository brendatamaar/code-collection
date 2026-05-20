import { createInterface } from "node:readline";

export interface InitPromptAnswers {
  format: "postman" | "bruno";
  stack: "auto" | "spring" | "laravel" | "go" | "node";
  output: string;
  splitByVersion: boolean;
  baseUrl: string;
  profile: string;
}

export const DEFAULT_INIT_ANSWERS: InitPromptAnswers = {
  format: "postman",
  stack: "auto",
  output: "./api-collection.json",
  splitByVersion: false,
  baseUrl: "http://localhost:8080",
  profile: ""
};

export async function promptForInitDefaults(): Promise<InitPromptAnswers> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });

  try {
    const stackRaw = await ask(
      `Stack [auto/spring/laravel/go/node] (${DEFAULT_INIT_ANSWERS.stack}): `
    );
    const stack = isValidStack(stackRaw) ? stackRaw : DEFAULT_INIT_ANSWERS.stack;

    const formatRaw = await ask(
      `Output format [postman/bruno] (${DEFAULT_INIT_ANSWERS.format}): `
    );
    const format = formatRaw === "postman" || formatRaw === "bruno"
      ? formatRaw
      : DEFAULT_INIT_ANSWERS.format;

    const outputRaw = await ask(`Output file (${DEFAULT_INIT_ANSWERS.output}): `);
    const output = outputRaw || DEFAULT_INIT_ANSWERS.output;

    const splitRaw = await ask("Split collections by version? [y/N] (N): ");
    const splitByVersion = /^y(es)?$/i.test(splitRaw);

    const baseUrl = await ask(`Base URL (${DEFAULT_INIT_ANSWERS.baseUrl}): `);
    const profile = await ask("Spring profile (leave blank for none): ");

    return {
      format,
      stack,
      output,
      splitByVersion,
      baseUrl: baseUrl || DEFAULT_INIT_ANSWERS.baseUrl,
      profile: profile || ""
    };
  } finally {
    rl.close();
  }
}

function isValidStack(value: string): value is InitPromptAnswers["stack"] {
  return ["auto", "spring", "laravel", "go", "node"].includes(value);
}
