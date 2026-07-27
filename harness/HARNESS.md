---
name: fable5-harness
type: canonical
version: 2.0.0-codex
upstream_commit: 62f4882dcea83c24522db92959b17a5b46b90486
---

# Fable5 Harness — Codex / GPT-5.6 control plane

This directory is the canonical operating contract for agent-driven repository
work. `AGENTS.md`, `.codex/agents/`, and `.agents/skills/` are thin executable
entrypoints into this contract.

## Outcome

Every material change must be traceable from an approved product outcome to an
isolated task, immutable commit, validation evidence, independent review, merge,
and post-merge validation. Conversation history is never the source of truth.

## Responsibility stack

| Layer | Model | Owns | Must not do |
|---|---|---|---|
| Upstream | GPT-5.6 Sol | product outcome, architecture, public contracts, acceptance, owner gates | backlog management, coding, PR merge |
| Middle | GPT-5.6 Terra | task graph, dependency order, assignments, PR review, correction loop, merge, base validation | implementation coding, self-approval |
| Downstream | GPT-5.6 Luna | one bounded implementation lane, tests, commit, push, PR | architecture redesign, task management, merge |

The model family is selected by workload role, not by a blind model-name
replacement. Reasoning is pinned per project agent and must be changed only
after representative evaluation.

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
2. Each writing task gets one fresh Luna session, one worktree, one
   `codex/<task-id>-<slug>` branch, and one PR.
3. Luna records relevant tests through `evidence run`; UI work also records
   Browser or headless QA evidence.
4. Architecture changes return to Sol. Dependency, backend, API, credential,
   storage-key, paid, destructive, or external-write gates return to the owner.

At completion:

1. Luna pushes the exact validated commit and opens or updates the PR.
2. Terra reviews that commit. `changes_requested` returns to the same Luna lane.
3. `approved` permits Terra to merge only after required checks pass.
4. Terra validates the updated base branch, regenerates `STATE.md`, and then
   creates the next fresh Luna lane.

## Evidence rules

- Record command, exit code, start/end time, commit, branch, dirty state, and a
  SHA-256 hash of the sanitized log.
- Keep full sanitized logs in `harness/state/evidence/logs/`; git ignores them.
- Never include raw prompts, provider payloads, artifact bodies, credentials,
  tokens, environment dumps, or personal home paths in tracked evidence.
- Passing commands prove only those commands. User-visible behavior needs the
  acceptance-specific QA named in the task.
- A done implementation task requires successful evidence for the exact
  verified commit and Terra approval of that same Luna commit.

## Canonical references

- Lane and worktree rules: `harness/policies/lanes.md`
- Evidence and review rules: `harness/policies/evidence-review.md`
- Model routing and prompt policy: `harness/policies/model-routing.md`
- Upstream provenance: `harness/UPSTREAM.md`
