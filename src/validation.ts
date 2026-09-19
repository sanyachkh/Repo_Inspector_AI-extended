import { exec } from "node:child_process";
import { stripVTControlCharacters } from "node:util";
import type { ValidationResult } from "./types.js";

// Shell exit codes for "not executable" (126) and "command not found" (127).
const SHELL_INVOCATION_CODES = new Set([126, 127]);

// Tools like vitest colorize output; strip the escape codes so reports stay readable.
function clean(...streams: string[]): string {
  return stripVTControlCharacters(streams.filter(Boolean).join("\n"));
}

export function runValidation(command: string, cwd: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    exec(
      command,
      { cwd, timeout: 120_000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ command, status: "passed", output: clean(stdout, stderr) });
        } else if (
          typeof error.code === "number" &&
          !SHELL_INVOCATION_CODES.has(error.code) &&
          !error.killed &&
          !error.signal
        ) {
          // The command ran and exited non-zero: a problem with the repo.
          resolve({ command, status: "failed", output: clean(stdout, stderr) });
        } else {
          // Spawn failure, bad cwd, timeout, signal, or command not found/executable: a problem with the invocation.
          resolve({ command, status: "errored", output: clean(error.message) });
        }
      },
    );
  });
}

export async function runValidations(commands: string[], cwd: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const command of commands) {
    results.push(await runValidation(command, cwd));
  }
  return results;
}
