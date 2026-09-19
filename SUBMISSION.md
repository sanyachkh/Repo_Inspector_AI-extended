# Submission

## What did you investigate first, and why?
First, I investigated the type definitions. The type definitions declared states which the codebase implementation couldn't actually produce, and the mismatch led me to the concrete bugs. ```"failed"``` was unreachable; ```untracked``` was never emitted; ```format``` was carried and misprocessed/ignored. This was all found by first inspection in ```types.ts```.

## What did you choose to implement or fix?
I chose to fix and implement based on what needed to be fixed so intended functionality could occur upon implementation. In other words, I looked at 4 categories:
1. Correctness: conversion of three test outcomes to accurately reflect what different failures mean rather than a vague binary; stderr is no longer consumed; validation no longer crashed the review when a command would fail
2. Contract (Original Codebase State to Anticipated Task Mapping): MCP tool was dead on arrival; ```--format``` is now real; repo paths with spaces are no longer unnecessarily truncated
3. Git specificity: base-ref resolution, merge-base, file renames/copies, untracked, ```-z``` parsing, and clear errors. 
4. Output integrity: dynamic fence sizing, per-validation status, and most importantly, a summary line.

## What did you intentionally not do?
### JSON envelope gap: JSON error envelope
- The point of a JSON envelope is for the caller to parse output unconditionally, including with errors. The tool currently continues to emit JSON only on success, and a bare stack trace on failure, which does force the caller to do string-sniffing. However, partial mitigation is already in place: under `--format json`, stdout carries the
JSON document and nothing else, all diagnostics go to stderr, and the exit code is non-zero on failure. A caller can therefore detect failure reliably; what it cannot do is distinguish a usage error from a missing repository from an unknown
base ref without reading prose. The gap is a typed error code, not parseability.

Deprioritized because the competing item was correctness: `runValidation`
rejected on any non-zero exit, so a failing test suite crashed the entire review and `"failed"` was unreachable. A tool that only works when everything already passes is broken for its primary use case; a tool with untyped errors is usable
but awkward. With a fixed budget I took the crash.

### I intentionally made a one-interface over hybrid-interface decision. I went CLI-first, with MCP as a capability-restricted adapter over the same core. The motivation was that I would develop prioritizing CLI feasibility foremost, so that adaptation with MCP moving forward would reach more robust levels.


## Interface decision

### Decision: ### 
- CLI-first

### Primary user and execution environment: ###
- a developer or a CI job on a machine where they already have a shell; the agent case is an agent invoking that CLI through a shell it already has.

### Trust boundary and allowed capabilities: ###
- A CLI-supplied --validate string grants the user nothing they didn't already have. A model-supplied command string is different in kind, because the model may have just read the repo's README and package.json — content you don't control — so the tool is driven by untrusted input.
- ```validationCommands``` was removed from the MCP schema, so the MCP is read-only inspection.

### Reliability, discoverability, latency/context, and output tradeoffs: ###
- MCP hands a model a typed schema, a CLI hands it ```--help```. I recovered this with ```--format json``` and real usage output, but didn't get to an exit-code table and JSON error envelope.
- Output size: a CLI writes to a file and nobody cares; an MCP response lands in a context window, so unbounded output is a real failure mode I'd have to solve on the MCP path.

### How supported interfaces remain consistent: ###
```core.ts``` returns ```ReviewResult```, both adapters call ```renderReport``` over the same value.

### Evidence that would change this decision: ###
If validation commands in practice were always a small fixed set, an allowlist keyed by name would make MCP safe without a sandbox.

## How did you use an AI coding agent?

I used an AI coding agent to implement technical solutions to aspects of the codebase while I was plotting how to do parts of technical implementation I could complete myself in parallel. In other words, I had my written scratchpad, Claude Code for technical implementation parallel to my written scratchpad, and a new Claude chat for prompting all at once.

## Where did you check, correct, or reject an AI suggestion? (required)

I checked, corrected, or rejected AI suggestions when I couldn't understand the baseline reasoning of what the suggestion would lead to, OR I didn't feel as though the direction the AI was going in was feasible to the time constraint. 

## Commands used to verify the result, with outcomes
- npm run typecheck → clean
- npm test → 2 files, 18 tests passing (report 6, git 12)
- Manual: inspector review --repo <this repo> --format markdown
  → review-report.md written; 1 untracked file; npm test passed
- Manual: inspector review --repo "/path/with space" → resolves correctly (was truncated before)
- Manual: --repo /tmp/not-a-repo → "Not a git repository", exit 1
- Manual: --format xml → usage message, exit 1

## A blocker you hit and how you approached it
A blocker I hit was actually documentation. I knew what I was doing when I got into the flow of things between an AI agent fluent with the codebase and an AI chatbot to discuss theoretical + design decisions with, and my cognitive thought process. However, articulating this was a blocker. 

I approached this with the ```NOTES_DEV.md``` file; having a "scratchpad" which I gave myself permission to refine and refer to besides just this submission markdown document was a gamechanger.

## Known limitations and the next three things you would do

### 1.  Keeping ```exec``` rather than rewriting to ```spawn```
While ```spawn``` allows accumulation of output in memory within a personalized cap, buffering all output to memory that we as devs could desire, allowing us to keep both the useful head and tail, killing the shell does not kill its grandchildren. ```npm test``` spawning a node process could leave an orphan on timeout, as specified in backlog in the previous section, and untangling the cross-platform mess within the time constraint wasn't my top priority. It wasn't my top priority because aspects like stripping ANSI in my review-report.md are imperative for my CLI solid foundation to MCP feasibility of implementation prior to cross-platform nuances.

### 2. Keeping ```output: string```
Keeping ```output: string``` was a chosen limitation, not an oversight. This was for richness of VAlidationResult.


### 3. Removing ```format``` from ```ReviewRequest``` rather than implementation into the core
I removed ```format``` from ```ReviewRequest``` rather than prioritizing implementation within the time constraint because ```--format``` in its original state was a lie, parsed by th eCLI but never read by ``` core.ts```, while ```--format json``` was thereby silently producing markdown. I didn't want to advertise an option I couldn't get to in light of time/resource constraints, so I opted to remove the flag all together.
## Approximate focused-work time

- Start: 09/18 8:30 PM PST - 9:15 PM PST
- Finish: 09/19 12:30 PM PST - 1:15 PM PST