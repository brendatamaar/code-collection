import type { PipelineReport } from "@code-collection/core";

export function formatCiEvents(report: PipelineReport, error?: Error): string {
  const events: object[] = [
    { type: "detect", stack: report.ir.metadata.stack, variant: report.ir.metadata.stackVariant },
    { type: "scan", fileCount: report.ir.metadata.fileCount },
    { type: "parse", endpointCount: report.ir.endpoints.length },
    { type: "emit", files: report.emittedFiles },
    ...report.warnings.map((warning) => ({ type: "warning", warning }))
  ];

  if (error) {
    events.push({ type: "error", message: error.message, code: (error as NodeJS.ErrnoException).code });
  }

  events.push({ type: "done", warningCount: report.warningCount });

  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}
