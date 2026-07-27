---
name: fable5-harness
type: canonical
version: 2.0.0-codex
upstream_commit: 62f4882dcea83c24522db92959b17a5b46b90486
---

# Fable5 Harness — Codex / GPT-5.6 operational control plane

This directory is the canonical operating contract for agent-driven repository
work. `AGENTS.md`, `.codex/agents/`, and `.agents/skills/` are thin executable
entrypoints into this contract.

## Outcome

Every material change must be traceable from an approved product outcome to a
versioned task record, Git-anchored validation evidence, a separate-session
review record, merge, and post-merge validation. The harness detects ordinary
workflow mistakes and inconsistent claims. It does not cryptographically prove
model identity or resist a malicious local administrator.

## Responsibility stack

| Layer | Model | Owns | Must not do |
|---|---|---|---|
| Upstream | GPT-5.6 Sol | product outcome, architecture, public contracts, acceptance, owner gates | backlog management, coding, PR merge |
| Middle | GPT-5.6 Terra | task graph, dependency order, assignments, PR review, correction loop, merge, base validation | implementation coding, self-approval |
| Downstream | GPT-5.6 Luna | one bounded implementation lane, tests, commit, push, PR | architecture redesign, task management, merge |

The model family is selected by workload role and task shape, not by a blind
model-name replacement. `medium` is the default for bounded work; use `high`
for architecture, concurrency, security boundaries, or measured quality gains.

## Session protocol

At session start:

1. Run `python tools/fable5_harness.py doctor`.
2. Read `harness/state/STATE.md`, the assigned task, and its latest handoff.
3. Run `git rev-parse HEAD`, `git branch --show-current`, and
   `git status --short`.
4. Stop if the assignment and checkout differ or if the checkout is
   unexpectedly dirty.

During work:

1. Terra is the only role that creates or reorders tasks.
2. Terra selects `read-only`, `shared-single-writer`, or `isolated-lane` from
   the task-shape policy. Concurrent writers never share a checkout.
3. Luna records each required acceptance ID through `evidence run`; UI work
   also records Browser or headless QA evidence.
4. Architecture changes return to Sol. Dependency, backend, API, credential,
   storage-key, paid, destructive, or external-write gates return to the owner.

At completion:

1. Luna pushes the exact validated commit and opens or updates the PR.
2. Terra reviews that commit. `changes_requested` returns to the same Luna lane.
3. `approved` permits Terra to merge only after required checks pass.
4. Terra validates the updated base branch, regenerates `STATE.md`, and then
   selects the next task's execution shape.

## Evidence rules

- Do not retain raw command arguments. Record the acceptance ID, sanitized
  summary, exit code, start/end time, commit, branch, dirty state, task
  specification hash, and a SHA-256 hash of the sanitized log.
- Keep full sanitized logs in `harness/state/evidence/logs/`; git ignores them.
- Never include raw prompts, provider payloads, artifact bodies, credentials,
  tokens, environment dumps, or personal home paths in tracked evidence.
- `validate schema` checks document integrity and may pass with no tasks.
- `validate task --task <ID>` is the completion gate for one declared task.
- `validate program --manifest <JSON>` is the completion gate for a declared
  non-empty task set.
- A done implementation task requires coverage of every `required_evidence`
  ID, unchanged task-spec hashes, base/allowed-path checks, and a separate
  Terra review record for the exact verified commit.

## Canonical references

- Lane and worktree rules: `harness/policies/lanes.md`
- Evidence and review rules: `harness/policies/evidence-review.md`
- Model routing and prompt policy: `harness/policies/model-routing.md`
- Upstream provenance: `harness/UPSTREAM.md`
