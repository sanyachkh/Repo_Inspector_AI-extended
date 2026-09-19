#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { reviewRepository } from "./core.js";
import { isReportFormat, renderReport } from "./report.js";

const USAGE =
  "Usage: inspector review --repo <path> [--base-ref <ref>] [--validate <command>] " +
  "[--format markdown|json]";

type Args = {
  command: string;
  repositoryPath?: string;
  baseRef?: string;
  format?: string;
  validations: string[];
};

function parseArgs(argv: string[]): Args {
  const args: Args = { command: argv[0] ?? "", validations: [] };
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--repo") {
      args.repositoryPath = argv[++index];
    } else if (token === "--base-ref") {
      args.baseRef = argv[++index];
    } else if (token === "--format") {
      args.format = argv[++index];
    } else if (token === "--validate") {
      args.validations.push(argv[++index]);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const format = args.format ?? "markdown";
  if (args.command !== "review" || !args.repositoryPath || !isReportFormat(format)) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const result = await reviewRepository({
    repositoryPath: args.repositoryPath,
    baseRef: args.baseRef,
    validationCommands: args.validations,
  });

  if (format === "json") {
    // JSON goes to stdout so it can be piped; nothing else may be printed there.
    console.log(renderReport(result, format));
  } else {
    writeFileSync("review-report.md", renderReport(result, format), "utf8");
    console.log("Review report written to review-report.md");
  }

  // Non-zero when any validation failed or errored, so CI can gate on it.
  if (result.summary.validationsFailed + result.summary.validationsErrored > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});