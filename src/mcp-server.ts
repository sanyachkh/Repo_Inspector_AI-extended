#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { reviewRepository } from "./core.js";
import { REPORT_FORMATS, renderReport } from "./report.js";

const server = new McpServer({ name: "repository-inspector", version: "2.0.0" });

server.tool(
  "review_repository",
  "Inspects a Git repository and returns a review report.",
  {
    repo_path: z.string().describe("Repository path to inspect."),
    baseRef: z.string().optional(),
    validationCommands: z.array(z.string()).optional(),
    format: z
      .enum(REPORT_FORMATS)
      .optional()
      .describe("Output format: a markdown report (default) or the raw result as JSON."),
  },
  async (input) => {
    const result = await reviewRepository({
      repositoryPath: input.repo_path,
      baseRef: input.baseRef,
      validationCommands: input.validationCommands,
    });
    return { content: [{ type: "text", text: renderReport(result, input.format ?? "markdown") }] };
  },
);

await server.connect(new StdioServerTransport());