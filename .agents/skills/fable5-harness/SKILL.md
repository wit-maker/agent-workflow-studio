---
name: fable5-harness
description: Coordinate Agent Workflow Studio work with isolated Codex lanes, GPT-5.6 Sol/Terra/Luna role routing, durable handoffs, validation evidence, and independent PR review. Use when planning or assigning project tasks, opening an implementation lane, handing work between sessions, reviewing a Luna PR, deciding whether to merge, or auditing completion claims.
---

# Fable5 Harness

Use the repository harness as the control plane. Keep product decisions, project
management, implementation, and review in separate responsibility layers.

## Start

1. Read `harness/HARNESS.md`.
2. Run `python tools/fable5_harness.py doctor`.
3. Read `harness/state/STATE.md` and the assigned task.
4. Verify the current HEAD, branch, and dirty state before changing files.

## Route work

- Route product architecture, success criteria, and owner gates to Sol.
- Route project management, dependency ordering, lane creation, PR review,
  correction routing, merge, and base validation to Terra.
- Route bounded implementation, tests, commit, push, and PR creation to Luna.
- Create a fresh Luna task and isolated worktree for each implementation lane.
- Never let Luna merge its own PR or silently change an upstream contract.
- Never use concurrent write agents in one checkout.

Use the project custom agents in `.codex/agents/` when spawning a bounded
subagent is appropriate. Use a new Codex task/worktree when the work changes
files or must survive beyond the parent turn.

## Record evidence

Run validations through:

```text
python tools/fable5_harness.py evidence run --task <TASK-ID> --actor luna -- <command>
```

Do not pass prompts, credentials, tokens, environment dumps, or provider payloads
to evidence commands or notes. The harness masks common secret shapes and stores
full sanitized logs under an ignored directory, but masking is a last defense.

## Review and finish

Terra reviews the exact Luna commit. If changes are required, keep the task
`doing`, send concrete findings back to the same Luna lane, and require new
evidence plus a new review. If approved, record the review, merge, validate the
base branch, regenerate state, then create the next fresh Luna lane.

Before reporting completion, run `python tools/fable5_harness.py validate` and
the repository-required validation commands. A PR, passing status check, or
`exit_code: 0` alone is not proof that the user-visible acceptance criteria
were met.
