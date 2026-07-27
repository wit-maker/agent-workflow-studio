---
id: V2-02
schema_version: 1
title: Safe Evidence Projection MVP
status: review
role: implementation
actor: luna
branch: codex/v2-02-safe-evidence-projection-mvp
base_commit: 38e98f6efadb37c08ec5a93939e7a5befa7d586f
verified_commit: d3e52ef
depends: []
task_shape: isolated-lane
required_evidence: [diff-boundary, unit, typecheck, lint, build, browser-qa]
allowed_paths: [src, docs/project/ACTIVE_PLAN.md, PROJECT_STATE.md, docs/tasks, harness/state/tasks, harness/state/STATE.md]
forbidden_paths: [docs/source-specs, package.json, package-lock.json, src-tauri, .env]
created: 2026-07-27T19:28:11+00:00
updated: 2026-07-27T19:37:54+00:00
implementation_session_id: 019fa50d-b049-70e0-941d-f65b0c16e73f
---

# V2-02 Safe Evidence Projection MVP

## User outcome

A user can inspect an existing mock run through a compact safe evidence projection without exposing raw inputs or claiming durable V2 runtime support.

## Acceptance criteria

- Derive one compact user-visible evidence panel from existing mock-safe run trace metadata only.
- Show coverage and safe attention/briefing cues without raw prompt, payload, credential, artifact body, or provider response content.
- Preserve the existing mock/runtime/storage boundary: no RunEventEnvelope persistence, executor, Tauri/Rust/SQLite binding, process execution, dependency, backend/API, credential, or localStorage-key change.
- Keep Evidence-first as the sole selected active plan and advance `ACTIVE_PLAN.md` to V2-02 only when the delivered scope is represented accurately.
- Add focused unit coverage and Browser or headless QA evidence for the new visible projection state.

## Allowed paths

- `src/**` only for pure safe projection and its existing UI integration/tests.
- `docs/project/ACTIVE_PLAN.md`, `PROJECT_STATE.md`, and `docs/tasks/**` only for the V2-02 planning/state handoff.
- `harness/state/tasks/**` and `harness/state/STATE.md` only for this task's operational record.

## Required evidence

- `diff-boundary`: allowed/forbidden path and raw-data safety review.
- `unit`: focused projection tests, including safe field exclusion.
- `typecheck`, `lint`, and `build`.
- `browser-qa`: Browser or headless evidence of the compact user-visible projection; if unavailable, record the exact limitation and a reproducible alternative.

## Definition of ready

- Base is `38e98f6efadb37c08ec5a93939e7a5befa7d586f` with no unrelated product changes.
- V2-01 contract is reviewed as a docs-only specification; G2/G3/G4/G5 remain not approved/not crossed.
- The implementation stays on existing mock-safe metadata and needs no dependency, process, backend/API, credential, storage-key, Tauri, Rust, SQLite, or cross-runtime type binding work.

## Definition of done

- Every required evidence ID is recorded through the harness for the exact reviewed commit.
- A distinct Terra review session approves the exact Luna commit before merge.
- After merge, Terra validates `main`, regenerates `harness/state/STATE.md`, and records the base-validation outcome.
