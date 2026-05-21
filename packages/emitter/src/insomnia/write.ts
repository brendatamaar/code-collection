import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeInsomnia(
  data: unknown,
  path: string
): Promise<{ path: string; bytes: number }> {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const tempPath = `${path}.tmp`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(tempPath, json, "utf8");
  await rename(tempPath, path);

  return { path, bytes: Buffer.byteLength(json) };
}
