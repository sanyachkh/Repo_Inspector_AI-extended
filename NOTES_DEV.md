# First 10 Minutes: Code Review
1. validation.ts: a validation is passed through a harsh binary of "passed" or "failed", and "passed" is the only producable implementation. in reality, we need 3 outcomes:
    Outcome 1: commmand runs, exit code 0
    Outcome 2: command runs and exits non-zero, meaning the test suite has a failing test
    Outcome 3: command never runs meaningfully (binary not found, timeout, killed, cwd does not exist) --> tool invocation problem rather than repo health problem

2. mcp-server.ts: input: any allows for every passing undefined as the repo path, and the schema declares one thing (repo_path) while the handler is reading another (input.repoPath)

3. cli.ts: truncation of any repo path with a space, unnecessary

4. --format json silently produced markdown; either implement or remove from the type (do not advertise an option that is ignored)

5. git.ts: hardcodes main as the base, which will fail with no merge base; gives a raw execFileSync throw when the path is not a repo; has no maxBuffer; ignores renames (R100) and copies; never produces the untracked status its own type declares

6. report.ts: interpolates command output into ``` fence, so any output w/ the fence (command output) will break the document. also, never itself prints whether validation pass/fail (or for the planned changes, Outcome 1/2/3)

# 10-40 Minutes: Corrections + Further Issues (Backlog)
## Corrections
I corrected the immediate fixes from the first 10 minutes of code review in order of the list; working scrupulously with Claude Code to refine technical fixes that I worked in a Claude chat to identify + verify.

## Backlog: 
1. Killing the shell doesn't kill the grandchildren, so ```npm test``` spawning a node process can leave an orphan on timeout; fix: ```detached: true``` AND ```process.kill(-child.pid)``` on POSIX, which is messy for cross-platform!!!
2. Capturing stdout and stderr separately loses interleaving order

# 40 - 60 Minutes: Untangling Backlog + Decision Log

## Decision Log from Addressing Backlog

### 1.  Keeping ```exec``` rather than rewriting to ```spawn```
While ```spawn``` allows accumulation of output in memory within a personalized cap, buffering all output to memory that we as devs could desire, allowing us to keep both the useful head and tail, killing the shell does not kill its grandchildren. ```npm test``` spawning a node process could leave an orphan on timeout, as specified in backlog in the previous section, and untangling the cross-platform mess within the time constraint wasn't my top priority. It wasn't my top priority because aspects like stripping ANSI in my review-report.md are imperative for my CLI solid foundation to MCP feasibility of implementation prior to cross-platform nuances.

### 2. Keeping ```output: string```
Keeping ```output: string``` was a chosen limitation, not an oversight. This was for richness of VAlidationResult.


### 3. Removing ```format``` from ```ReviewRequest``` rather than implementation into the core
I removed ```format``` from ```ReviewRequest``` rather than prioritizing implementation within the time constraint because ```--format``` in its original state was a lie, parsed by th eCLI but never read by ``` core.ts```, while ```--format json``` was thereby silently producing markdown. I didn't want to advertise an option I couldn't get to in light of time/resource constraints, so I opted to remove the flag all together.

# 60 - 90 Minutes: Testing + Verification, Documentation

## Testing + Verification
- npm run typecheck → clean
- npm test → 2 files, 18 tests passing (report 6, git 12)
- Manual: inspector review --repo <this repo> --format markdown
  → review-report.md written; 1 untracked file; npm test passed
- Manual: inspector review --repo "/path/with space" → resolves correctly (was truncated before)
- Manual: --repo /tmp/not-a-repo → "Not a git repository", exit 1
- Manual: --format xml → usage message, exit 1

## Documentation of Backlog (ranked by cost and effect)

### Contract Gaps, First Priority
1. JSON error envelope. `--format json` emits a bare ReviewResult on success but
   errors go to stderr as unstructured text. Intended: {ok, version, result} |
   {ok, version, error:{code, message}}, so a consumer can parse unconditionally.
2. Granular exit codes. Today: 1 for usage error, git error, and failing tests
   alike. Intended for the Future: 0 ok / 1 validations failed / 2 usage / 3 git / 4 validation
   could not run.
3. --out <path> with "-" for stdout. Markdown currently hardcodes
   review-report.md relative to *process* cwd, not the repo; JSON goes to
   stdout. The asymmetry is surprising.

### Result Specificity
4. Richer ValidationResult: exitCode, durationMs, separate stdout/stderr,
   truncated flag. Kept flat `output: string` deliberately, which limits failure contamination.
5. Distinguish timeout from maxBuffer overflow/overrun 
   (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" vs killed-by-timeout).
   Both land in `errored` correctly today, but the message isn't descriptive enough for long-term.
6. headRef is the literal "HEAD", so the report says "origin/HEAD...HEAD".
   Resolve to a short SHA or branch name.

### Robustness
7. Process-group kill on timeout (detached + process.kill(-pid)); messy
   cross-platform. [existing note]
8. stdout/stderr interleaving order is lost. [existing note]
9. parseArgs: a trailing `--validate` pushes undefined into string[];
    `--repo --format` silently takes "--format" as the path; not exported,
    so not testable.

### Hygiene
10. review-report.md is committed tool output → .gitignore.
11. Untracked files are mixed into a commit-range diff. Intentional for a
    review tool, but should be stated in the README.
