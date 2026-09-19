import type { ReviewResult } from "./types.js";

////a fence must be longer than any backtick run in the content, or the content can close it early.
function fenceFor(content: string): string {
  const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longestRun + 1));
}

export const REPORT_FORMATS = ["markdown", "json"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export function isReportFormat(value: string): value is ReportFormat {
  return (REPORT_FORMATS as readonly string[]).includes(value);
}

export function renderReport(result: ReviewResult, format: ReportFormat): string {
  return format === "json" ? JSON.stringify(result, null, 2) : markdownReport(result);
}

export function markdownReport(result: ReviewResult): string {
  const { summary } = result;
  const lines = [
    `# Review Report: ${result.repositoryPath}`,
    "",
    `Comparing ${result.baseRef}...${result.headRef}: ${summary.filesChanged} file(s) changed, ` +
      `${summary.validationsRun} validation(s) run, ${summary.validationsFailed} failed, ` +
      `${summary.validationsErrored} errored.`,
    "",
    "## Changed files",
  ];
  for (const file of result.changedFiles) {
    const from = file.oldPath === undefined ? "" : ` from ${file.oldPath}`;
    lines.push(`- ${file.path} (${file.status}${from})`);
  }
  lines.push("", "## Validation output");
  for (const validation of result.validations) {
    const fence = fenceFor(validation.output);
    lines.push(`### ${validation.command} (${validation.status})`, fence, validation.output, fence);
  }
  return lines.join("\n");
}
