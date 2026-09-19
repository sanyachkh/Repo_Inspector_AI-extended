import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import type { ChangedFile } from "./types.js";

export const HEAD_REF = "HEAD";

// Candidates for the base branch when the caller does not name one, in priority order.
const DEFAULT_BASE_CANDIDATES = ["origin/HEAD", "main", "master"];

const MAX_BUFFER = 64 * 1024 * 1024;

class GitCommandError extends Error {}

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: MAX_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { stderr?: string };
    if (failure.code === "ENOENT") {
      throw new Error("Could not run git; is it installed and on PATH?");
    }
    const detail = failure.stderr?.trim() || failure.message;
    throw new GitCommandError(`git ${args.join(" ")} failed: ${detail}`);
  }
}

function tryGit(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args);
  } catch (error) {
    if (error instanceof GitCommandError) return null;
    throw error;
  }
}

function repositoryRoot(repositoryPath: string): string {
  let isDirectory = false;
  try {
    isDirectory = statSync(repositoryPath).isDirectory();
  } catch {
    // Falls through to the error below.
  }
  if (!isDirectory) {
    throw new Error(`Repository path does not exist or is not a directory: ${repositoryPath}`);
  }
  const root = tryGit(repositoryPath, ["rev-parse", "--show-toplevel"]);
  if (root === null) {
    throw new Error(`Not a git repository: ${repositoryPath}`);
  }
  return root.trim();
}

function refExists(root: string, ref: string): boolean {
  return tryGit(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]) !== null;
}

/**
 * Returns the ref to compare HEAD against: the caller's ref if it resolves, otherwise the first
 * of origin/HEAD, main and master that exists.
 */
export function resolveBaseRef(repositoryPath: string, baseRef?: string): string {
  const root = repositoryRoot(repositoryPath);

  if (baseRef !== undefined) {
    // A leading "-" would be read by git as an option, not a ref.
    if (baseRef.startsWith("-") || !refExists(root, baseRef)) {
      throw new Error(`Base ref "${baseRef}" does not exist in ${repositoryPath}`);
    }
    return baseRef;
  }

  const found = DEFAULT_BASE_CANDIDATES.find((candidate) => refExists(root, candidate));
  if (found === undefined) {
    throw new Error(
      `Could not find a base branch (tried ${DEFAULT_BASE_CANDIDATES.join(", ")}) in ` +
        `${repositoryPath}; pass a base ref explicitly.`,
    );
  }
  return found;
}

function statusFor(code: string): ChangedFile["status"] {
  switch (code[0]) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    default:
      return "modified";
  }
}

/**
 * Files changed on HEAD since it diverged from baseRef, plus untracked files in the working tree.
 * Paths are relative to the repository root.
 */
export function changedFiles(repositoryPath: string, baseRef: string): ChangedFile[] {
  const root = repositoryRoot(repositoryPath);

  const mergeBase = tryGit(root, ["merge-base", baseRef, HEAD_REF])?.trim();
  if (!mergeBase) {
    throw new Error(`No merge base between "${baseRef}" and ${HEAD_REF} in ${repositoryPath}`);
  }

  // -z gives NUL-separated, unquoted output, so unusual file names survive intact.
  const diff = git(root, [
    "diff",
    "--name-status",
    "-z",
    "--find-renames",
    "--find-copies",
    mergeBase,
    HEAD_REF,
    "--",
  ]).split("\0");

  const files: ChangedFile[] = [];
  for (let index = 0; index < diff.length && diff[index]; ) {
    const code = diff[index++];
    if (code[0] === "R" || code[0] === "C") {
      const oldPath = diff[index++];
      files.push({ path: diff[index++], status: statusFor(code), oldPath });
    } else {
      files.push({ path: diff[index++], status: statusFor(code) });
    }
  }

  const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0");
  for (const path of untracked) {
    if (path) files.push({ path, status: "untracked" });
  }

  return files;
}
