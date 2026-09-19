import { exec } from "node:child_process";
import type { ValidationResult } from "./types.js";

export function runValidation(command: string, cwd: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ command, status: "passed", output: stdout || stderr });
      } else if (typeof error.code === "number" && !error.killed && !error.signal) {
        // The command ran and exited non-zero: a problem with the repo.
        resolve({ command, status: "failed", output: [stdout, stderr].filter(Boolean).join("\n") });
      } else {
        // Spawn failure, bad cwd, timeout or signal: a problem with the invocation.
        resolve({ command, status: "errored", output: error.message });
      }
    });
  });
}

export async function runValidations(commands: string[], cwd: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const command of commands) {
    results.push(await runValidation(command, cwd));
  }
  return results;
}
