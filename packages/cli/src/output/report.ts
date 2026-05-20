import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { PipelineReport } from "@code-collection/core";

export async function writeJsonReport(
  report: PipelineReport,
  path: string
): Promise<void> {
  const warningsByCode = Object.fromEntries(
    [...new Set(report.warnings.map((warning) => warning.code))]
      .sort()
      .map((code) => [
        code,
        report.warnings.filter((warning) => warning.code === code)
      ])
  );
  const payload = {
    endpoints: report.ir.endpoints.map((endpoint) => ({
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      source: endpoint.source
    })),
    warningsByCode,
    metadata: report.ir.metadata,
    timings: report.timings
  };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
