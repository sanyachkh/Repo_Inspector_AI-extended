1. validation.ts: a validation is passed through a harsh binary of "passed" or "failed", and "passed" is the only producable implementation. in reality, we need 3 outcomes:
    Outcome 1: commmand runs, exit code 0
    Outcome 2: command runs and exits non-zero, meaning the test suite has a failing test
    Outcome 3: command never runs meaningfully (binary not found, timeout, killed, cwd does not exist) --> tool invocation problem rather than repo health problem

2. mcp-server.ts: input: any allows for every passing undefined as the repo path, and the schema declares one thing (repo_path) while the handler is reading another (input.repoPath)

3. cli.ts: truncation of any repo path with a space, unnecessary

4. --format json silently produced markdown; either implement or remove from the type (do not advertise an option that is ignored)

5. git.ts: hardcodes main as the base, which will fail with no merge base; gives a raw execFileSync throw when the path is not a repo; has no maxBuffer; ignores renames (R100) and copies; never produces the untracked status its own type declares

6. report.ts: interpolates command output into ``` fence, so any output w/ the fence (command output) will break the document. also, never itself prints whether validation pass/fail (or for the planned changes, Outcome 1/2/3)