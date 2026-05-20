import type { Emitter, IR } from "@code-collection/core";

import { brunoJson, type BrunoFile, writeBrunoCollection } from "./file-format.js";
import { folderMeta } from "./folder-meta.js";
import { emitEnvironmentBru } from "./environment.js";
import { folderForEndpoint, requestFileName } from "./grouping.js";
import { emitBruRequest } from "./request.js";

export function emitCollectionFiles(ir: IR): BrunoFile[] {
  const files: BrunoFile[] = [
    {
      relativePath: "bruno.json",
      content: brunoJson(ir.info.title)
    }
  ];
  const authById = new Map(ir.auth.map((scheme) => [scheme.id, scheme]));
  const folders = new Set<string>();

  for (const endpoint of [...ir.endpoints].sort((left, right) =>
    `${left.tags[0] ?? ""}:${left.method}:${left.path}`.localeCompare(
      `${right.tags[0] ?? ""}:${right.method}:${right.path}`
    )
  )) {
    const folder = folderForEndpoint(endpoint).join("/");
    folders.add(folder);
    files.push({
      relativePath: relativePath(folder, requestFileName(endpoint)),
      content: emitBruRequest(endpoint, ir.schemas, authById)
    });
  }

  for (const folder of [...folders].sort()) {
    files.push({
      relativePath: relativePath(folder, "folder.bru"),
      content: folderMeta(folder, ir.tags)
    });
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export const brunoEmitter: Emitter = {
  name: "bruno",
  async emit(ir, options) {
    const files = emitCollectionFiles(ir);
    for (const [name, environment] of Object.entries(options.environments ?? {}).sort(
      ([left], [right]) => left.localeCompare(right)
    )) {
      files.push({
        relativePath: relativePath("environments", `${name}.bru`),
        content: emitEnvironmentBru(environment.baseUrl)
      });
    }

    return {
      files: await writeBrunoCollection(options.outputPath, files),
      warnings: []
    };
  }
};

export * from "./auth.js";
export * from "./bru-syntax.js";
export * from "./environment.js";
export * from "./file-format.js";
export * from "./folder-meta.js";
export * from "./grouping.js";
export * from "./request.js";

function relativePath(...parts: string[]): string {
  return parts.filter(Boolean).join("/");
}
