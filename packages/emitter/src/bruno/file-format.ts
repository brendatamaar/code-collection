import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface BrunoFile {
  relativePath: string;
  content: string;
}

export async function writeBrunoCollection(
  outputPath: string,
  files: BrunoFile[]
): Promise<{ path: string; bytes: number }[]> {
  const tempPath = `${outputPath}.tmp`;
  await rm(tempPath, { recursive: true, force: true });
  await mkdir(tempPath, { recursive: true });

  for (const file of files) {
    const path = join(tempPath, file.relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content, "utf8");
  }

  await rm(outputPath, { recursive: true, force: true });
  await rename(tempPath, outputPath);

  return files.map((file) => ({
    path: join(outputPath, file.relativePath),
    bytes: Buffer.byteLength(file.content)
  }));
}

export function brunoJson(name: string): string {
  return `${JSON.stringify(
    {
      version: "1",
      name,
      type: "collection",
      uid: deterministicId(name)
    },
    null,
    2
  )}\n`;
}

export function deterministicId(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}
