import type { PipelineReport } from "@code-collection/core";

export function formatDryRunReport(report: PipelineReport): string {
  const lines = report.ir.endpoints.map(
    (endpoint) => `${endpoint.method.padEnd(7)} ${endpoint.path} ${endpoint.source.file}:${endpoint.source.line}`
  );

  return `${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`;
}
