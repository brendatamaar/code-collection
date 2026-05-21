import { basename, extname, join } from "node:path";

import type { Emitter, EmitOptions, IR } from "@code-collection/core";

import { emitBaseEnvironment, emitNamedEnvironment } from "./environment.js";
import { groupEndpoints } from "./grouping.js";
import { emitWorkspace } from "./info.js";
import type { InsomniaExport, InsomniaResource } from "./types.js";
import { writeInsomnia } from "./write.js";

export function assembleExport(ir: IR, options: EmitOptions): InsomniaExport {
  const workspace = emitWorkspace(ir);
  const baseEnv = emitBaseEnvironment(workspace._id, ir, options);

  const namedEnvs = options.environments
    ? Object.entries(options.environments)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, env], index) =>
          emitNamedEnvironment(baseEnv._id, ir.info.title, name, env.baseUrl, index + 2)
        )
    : [];

  const groups = groupEndpoints(
    workspace._id,
    ir.info.title,
    ir.endpoints,
    ir.schemas,
    ir.auth,
    ir.tags
  );

  const resources: InsomniaResource[] = [
    workspace,
    baseEnv,
    ...namedEnvs,
    ...groups.map((g) => g.group),
    ...groups.flatMap((g) => g.requests)
  ];

  return {
    __export_format: 4,
    __export_date: "1970-01-01T00:00:00.000Z",
    __export_source: "code-collection",
    resources
  };
}

function resolveOutputPath(outputPath: string, repoName: string): string {
  if (outputPath.endsWith(".json")) {
    return outputPath;
  }

  return join(outputPath, `${repoName}.insomnia.json`);
}

export const insomniaEmitter: Emitter = {
  name: "insomnia",
  async emit(ir: IR, options: EmitOptions) {
    const ext = extname(options.outputPath);
    const repoName = ext
      ? basename(options.outputPath, ext)
      : basename(options.outputPath);

    const filePath = resolveOutputPath(options.outputPath, repoName);
    const exportData = assembleExport(ir, options);
    const file = await writeInsomnia(exportData, filePath);

    return { files: [file], warnings: [] };
  }
};

export type * from "./types.js";
