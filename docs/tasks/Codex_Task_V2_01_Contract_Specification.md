# Codex Task: V2-01 Contract Specification

## Repository and lane

```text
Repository: C:\dev\github\wit-maker\agent-workflow-studio
Branch: codex/v2-01-contract-specification
Base: origin/main d9b7ab75ac2db796e97b13006e3e971fcf321bff
```

## Goal

Create the canonical, linked V2-01 contract specification for the Evidence-first execution spine. Define stable names, public interfaces, ownership, lifecycle, invariants, versioning/identity, safe projections, approval semantics, future Tauri command boundaries, and read-only legacy compatibility. Keep V2-00 history intact and make V2-01 the current docs-only slice in `docs/project/ACTIVE_PLAN.md`.

## Allowed files

```text
docs/architecture/v2-01-contract-specification.md
docs/project/ACTIVE_PLAN.md
docs/tasks/Codex_Task_V2_01_Contract_Specification.md
PROJECT_STATE.md
```

## Non-goals and safety

- Do not edit `docs/source-specs/**`, product code, tests, package manifests/dependencies, localStorage keys, backend/API wiring, Tauri/Rust/SQLite/type bindings, connectors, credential storage, real process execution, or artifact bodies.
- Do not include raw prompt, raw payload, credential, token, password, provider body, or artifact body in event, HUD, briefing, audit, summary, copy, or example content.
- Do not imply G2/G3/G4/G5 approval or crossing. V1 remains available through an explicit future cutover decision.
- Do not use `git add .`, reset, rebase, clean, force push, or another worktree.

## Required validation and handoff

- `git diff --check`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --name-only origin/main...HEAD` must remain docs-only.
- Browser QA is not applicable because this task changes no UI or runtime behavior; report the static/build alternative evidence.
- Stage only explicit changed files, commit, push, and open a draft PR against `main`.
- PR body must start exactly with `この変更でユーザーは何ができるようになったか:` and include scope/non-goals, coverage, validation, safety review, Browser-QA rationale, DoR/DoD, gate status, base/head SHA, and Terra PM handoff.
