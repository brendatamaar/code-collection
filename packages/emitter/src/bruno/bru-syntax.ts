export type BruValue = string | number | boolean;

export function dictionaryBlock(
  name: string,
  values: Record<string, BruValue | undefined>
): string {
  const lines = Object.entries(values)
    .filter((entry): entry is [string, BruValue] => entry[1] !== undefined)
    .map(([key, value]) => `  ${key}: ${String(value)}`);

  return `${name} {\n${lines.join("\n")}\n}`;
}

export function textBlock(name: string, value: string): string {
  const indented = value
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");
  return `${name} {\n${indented}\n}`;
}

export function arrayBlock(name: string, values: string[]): string {
  return `${name} [\n${values.map((value) => `  ${value}`).join("\n")}\n]`;
}

export function serializeBru(blocks: Array<string | undefined>): string {
  return `${blocks.filter(Boolean).join("\n\n")}\n`;
}
