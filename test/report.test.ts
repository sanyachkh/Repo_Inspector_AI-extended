import { describe, expect, it } from "vitest";
import { isReportFormat, markdownReport, renderReport } from "../src/report.js";
import type { ReviewResult } from "../src/types.js";

const sample: ReviewResult = {
  repositoryPath: "/work/sample",
  baseRef: "main",
  headRef: "HEAD",
  changedFiles: [{ path: "src/index.ts", status: "modified" }],
  validations: [{ command: "npm test", status: "passed", output: "ok" }],
  summary: { filesChanged: 1, validationsRun: 1, validationsFailed: 0, validationsErrored: 0 },
};

describe("markdownReport", () => {
  it("lists changed files and validation output", () => {
    const report = markdownReport(sample);

    expect(report).toContain("src/index.ts (modified)");
    expect(report).toContain("npm test (passed)");
    expect(report).toContain("ok");
  });

  it("uses a fence longer than any backtick run in the output", () => {
    const output = "before\n```\ninjected\n```\nafter";
    const report = markdownReport({
      ...sample,
      validations: [{ command: "npm test", status: "failed", output }],
    });

    expect(report).toContain(`\`\`\`\`\n${output}\n\`\`\`\``);
  });

  it("shows the outcome of each validation and the summary counts", () => {
    const report = markdownReport({
      ...sample,
      validations: [
        { command: "a", status: "passed", output: "" },
        { command: "b", status: "failed", output: "" },
        { command: "c", status: "errored", output: "" },
      ],
      summary: { filesChanged: 1, validationsRun: 3, validationsFailed: 1, validationsErrored: 1 },
    });

    expect(report).toContain("### a (passed)");
    expect(report).toContain("### b (failed)");
    expect(report).toContain("### c (errored)");
    expect(report).toContain("3 validation(s) run, 1 failed, 1 errored");
  });
});

describe("renderReport", () => {
  it("renders the result as JSON that round-trips", () => {
    expect(JSON.parse(renderReport(sample, "json"))).toEqual(sample);
  });

  it("renders markdown", () => {
    expect(renderReport(sample, "markdown")).toBe(markdownReport(sample));
  });
});

describe("isReportFormat", () => {
  it("accepts only known formats", () => {
    expect(isReportFormat("json")).toBe(true);
    expect(isReportFormat("markdown")).toBe(true);
    expect(isReportFormat("xml")).toBe(false);
  });
});
