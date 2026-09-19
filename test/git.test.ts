import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { changedFiles, resolveBaseRef } from "../src/git.js";

const dirs: string[] = [];

function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "inspector-git-")));
  dirs.push(dir);
  return dir;
}

function git(cwd: string, ...args: string[]): void {
  execFileSync(
    "git",
    ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
    { cwd, stdio: "ignore" },
  );
}

function write(repo: string, path: string, content: string): void {
  writeFileSync(join(repo, path), content);
}

function commitAll(repo: string, message: string): void {
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", message);
}

// A repo with one commit on `branch` containing keep.txt, gone.txt and "old name.txt".
function makeRepo(branch = "main"): string {
  const repo = tempDir();
  git(repo, "init", "-q", "-b", branch);
  write(repo, "keep.txt", "keep\n");
  write(repo, "gone.txt", "gone\n");
  write(repo, "old name.txt", "a rename needs enough content to be detected as similar\n".repeat(5));
  commitAll(repo, "base");
  return repo;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("changedFiles", () => {
  it("reports added, modified, deleted, renamed and untracked files", () => {
    const repo = makeRepo();
    git(repo, "checkout", "-q", "-b", "feature");
    write(repo, "keep.txt", "changed\n");
    write(repo, "added.txt", "new\n");
    rmSync(join(repo, "gone.txt"));
    git(repo, "mv", "old name.txt", "new name.txt");
    commitAll(repo, "feature");
    write(repo, "scratch.txt", "not committed\n");

    const files = changedFiles(repo, resolveBaseRef(repo));

    expect(files).toEqual(
      expect.arrayContaining([
        { path: "keep.txt", status: "modified" },
        { path: "added.txt", status: "added" },
        { path: "gone.txt", status: "deleted" },
        { path: "new name.txt", status: "renamed", oldPath: "old name.txt" },
        { path: "scratch.txt", status: "untracked" },
      ]),
    );
    expect(files).toHaveLength(5);
  });

  it("keeps unusual file names intact", () => {
    const repo = makeRepo();
    git(repo, "checkout", "-q", "-b", "feature");
    write(repo, "café \"quoted\".txt", "x\n");
    commitAll(repo, "odd name");

    expect(changedFiles(repo, "main")).toEqual([{ path: "café \"quoted\".txt", status: "added" }]);
  });

  it("reports repo-root-relative paths when given a subdirectory", () => {
    const repo = makeRepo();
    git(repo, "checkout", "-q", "-b", "feature");
    mkdirSync(join(repo, "sub"));
    write(repo, "sub/inner.txt", "x\n");
    commitAll(repo, "inner");

    expect(changedFiles(join(repo, "sub"), "main")).toEqual([
      { path: "sub/inner.txt", status: "added" },
    ]);
  });

  it("fails clearly when the histories share no merge base", () => {
    const repo = makeRepo();
    git(repo, "checkout", "-q", "--orphan", "unrelated");
    write(repo, "other.txt", "x\n");
    commitAll(repo, "orphan");

    expect(() => changedFiles(repo, "main")).toThrow(/No merge base/);
  });

  it("fails clearly when the path is not a git repository", () => {
    expect(() => changedFiles(tempDir(), "main")).toThrow(/Not a git repository/);
  });

  it("fails clearly when the path does not exist", () => {
    expect(() => changedFiles(join(tempDir(), "missing"), "main")).toThrow(/does not exist/);
  });
});

describe("resolveBaseRef", () => {
  it("returns an explicit ref that exists", () => {
    const repo = makeRepo();
    expect(resolveBaseRef(repo, "main")).toBe("main");
  });

  it("rejects an unknown ref", () => {
    expect(() => resolveBaseRef(makeRepo(), "nope")).toThrow(/does not exist/);
  });

  it("rejects a ref that looks like a git option", () => {
    expect(() => resolveBaseRef(makeRepo(), "--output=/tmp/x")).toThrow(/does not exist/);
  });

  it("defaults to main", () => {
    expect(resolveBaseRef(makeRepo("main"))).toBe("main");
  });

  it("falls back to master when there is no main", () => {
    expect(resolveBaseRef(makeRepo("master"))).toBe("master");
  });

  it("asks for an explicit ref when no default branch exists", () => {
    expect(() => resolveBaseRef(makeRepo("trunk"))).toThrow(/pass a base ref explicitly/);
  });
});
