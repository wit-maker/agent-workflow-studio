# Plan Protocol

Last updated: 2026-06-03

## Purpose

This protocol keeps implementation work aligned with the long-term goal while still allowing small, shippable phases.

Every non-trivial task should separate:

- Goal: why the product exists and what must remain true
- Plan: what this phase will do and not do
- Task: the specific branch-sized unit of work
- Prompt: the current instruction passed to an AI coding agent

## Single Active Plan Rule

Use `docs/project/ACTIVE_PLAN.md` as the only active plan selector.

- Do not create a second current-plan document when updating direction.
- If a detailed lane plan is needed, create or update the detail document, then link it from `ACTIVE_PLAN.md`.
- If an old task prompt or next-phase document is no longer the active plan, mark it as historical/detail rather than deleting source context.
- Keep GitHub issue operations separate from repository document cleanup unless the user explicitly asks to touch GitHub issues.

## Before Implementation

For each task:

1. Confirm the active model and record any mismatch when the task touches Goal, Plan, Source of Truth, safety, credentials, or architecture.
2. Read `docs/project/ACTIVE_PLAN.md`, `PROJECT_STATE.md`, `AGENTS.md`, `docs/project/SOURCE_OF_TRUTH.md`, `docs/project/CONCEPT_CHECKLIST.md`, and the relevant source specs.
3. Check `git status --short --branch`.
4. Confirm the branch is not `main` or `develop`.
5. Identify whether the task is docs-only, UI, domain model, execution, storage, connector, or safety work.
6. Define validation before editing.

## Plan Contents

A decision-complete plan should state:

- current state and source specs consulted
- in-scope and out-of-scope changes
- public interfaces or document contracts affected
- file groups to change
- data model impact
- UI impact
- safety and credential impact
- validation steps
- Browser QA scenarios
- unresolved risks

## Implementation Rules

- Prefer small, reviewable phases.
- Preserve source specs as reference documents.
- Keep docs, code, and `PROJECT_STATE.md` in sync.
- Keep `docs/project/ACTIVE_PLAN.md` in sync when the next-slice order changes.
- When a change touches Cognitive HUD, Situation Assistant, Situation Narration, Upload Labs-style observability, n8n-style automation, or Scratch-style operation, record the `CONCEPT_CHECKLIST.md` classification in the plan, PR body, or `PROJECT_STATE.md`.
- Add abstractions only when they protect future phases or remove real duplication.
- Keep mock connectors clearly marked as mock.
- Treat localStorage as MVP persistence, not the final storage architecture.

## Completion Rules

A task is complete only when the report includes:

- implemented changes
- changed files
- build, lint, and typecheck result
- Browser QA result
- save/load or persistence impact when relevant
- known gaps against the full product goal
- next recommended phase
- unresolved risks
