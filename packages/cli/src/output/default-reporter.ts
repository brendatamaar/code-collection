import type { PipelineReport } from "@code-collection/core";

export interface ReporterOptions {
  verbose: boolean;
  quiet: boolean;
}

export function formatDefaultReport(
  report: PipelineReport,
  options: ReporterOptions
): string {
  if (options.quiet) {
    return "";
  }

  const lines = [
    `Detected stack: ${report.ir.metadata.stack}${report.ir.metadata.stackVariant ? ` (${report.ir.metadata.stackVariant})` : ""}`,
    `Parsed ${report.ir.endpoints.length} endpoints`,
    report.warningCount > 0
      ? `${report.warningCount} warnings`
      : "0 warnings",
    report.dryRun
      ? "Dry run: no files emitted"
      : emittedSummary(report),
    options.verbose ? timingSummary(report) : undefined
  ];

  return `${lines.filter((line): line is string => Boolean(line)).join("\n")}\n`;
}

function emittedSummary(report: PipelineReport): string {
  if (report.emittedFiles.length === 0) {
    return "No files emitted";
  }

  return report.emittedFiles
    .map((file) => `Emitted ${file.path} (${file.bytes} bytes)`)
    .join("\n");
}

function timingSummary(report: PipelineReport): string {
  return report.timings
    .map((timing) => `[${timing.step}] ${timing.durationMs}ms`)
    .join("\n");
}
