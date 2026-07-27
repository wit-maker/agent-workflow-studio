---
name: fable5-harness
description: Coordinate Agent Workflow Studio work with task-shaped Codex execution, GPT-5.6 Sol/Terra/Luna role routing, durable handoffs, acceptance-linked evidence, and separate-session review records.
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
- Use a subagent for read-only work, a bounded serialized Luna writer for small
  changes, and an isolated Luna worktree for parallel, long-lived, or PR-scoped
  changes.
- Never let Luna merge its own PR or silently change an upstream contract.
- Never use concurrent write agents in one checkout.

Use the project custom agents in `.codex/agents/`. A shared-checkout writer is
allowed only when no other writer is active, scope is bounded, Terra owns final
diff/validation, and independent PR provenance is unnecessary.

## Record evidence

Run validations through:

```text
python tools/fable5_harness.py evidence run --task <TASK-ID> --actor luna \
  --acceptance-id <ID> --summary "<sanitized result>" -- <command>
```

Do not pass prompts, credentials, tokens, environment dumps, or provider payloads
to evidence commands or notes. The harness masks common secret shapes and stores
full sanitized logs under an ignored directory, but masking is a last defense.

## Review and finish

Terra reviews the exact Luna commit. If changes are required, keep the task
`doing`, send concrete findings back to the same Luna lane, and require new
evidence plus a new review. If approved, record the review, merge, validate the
base branch, regenerate state, then select the next task shape.

Before reporting completion, run `validate schema` and
`validate task --task <TASK-ID>` (or `validate program --manifest <JSON>`) plus
the repository-required commands. Session IDs are operational audit metadata,
not cryptographic model identity. A PR, status check, or `exit_code: 0` alone
does not prove acceptance.
