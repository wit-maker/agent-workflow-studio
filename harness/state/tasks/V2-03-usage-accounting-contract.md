---
id: V2-03
schema_version: 1
title: Usage Accounting Contract
status: todo
role: implementation
actor: unassigned
branch: -
base_commit: 316358b53d00cabc1ff895cef086e7c30261cc18
verified_commit: -
depends: [V2-02, ENCODING-01]
task_shape: isolated-lane
required_evidence: [diff-boundary, docs-review, typecheck, lint, build]
allowed_paths: [docs/architecture, docs/project/ACTIVE_PLAN.md, PROJECT_STATE.md, docs/tasks, harness/state]
forbidden_paths: [docs/source-specs, package.json, package-lock.json, src, src-tauri, .env]
created: 2026-07-27T20:01:33+00:00
updated: 2026-07-27T20:01:33+00:00
---

# V2-03 Usage Accounting Contract

## User outcome

The V2 public contract defines safe, replayable token accounting and labels legacy Cognitive HUD material as historical rather than an active product authority.

## Acceptance criteria

- Extend the public V2 contract with versioned `UsageRecorded` and explicit `UsageMeasurementUnavailable` events, stable `usageId` deduplication, run/step/adapter-call scope, and source discrimination (`provider_reported`, `runtime_measured`, `estimated`).
- Define optional non-negative usage fields without fabricated zeroes; basic total is `inputTokens + outputTokens`, never double-counting cached/reasoning values. Profiles are opaque safe references and raw provider payload is forbidden.
- Specify deterministic replay of Snapshot, Attention, Briefing, Comparison, and Recipe projections from event data, including retry/branch/cancel/approval consumption, duplicate/missing/old-schema/overflow cases, and separation of estimated from measured values.
- Reclassify the old Cognitive HUD completion section as a Historical v1 milestone and point all current v2 priority/gates to Evidence-first ADR/current v2 section only.
- Remain docs-only: no dependency, TypeScript/Rust binding, Tauri, SQLite, storage, process, connector, source-spec, or product-code changes.

## Definition of ready

- `V2-02` and `ENCODING-01` are done; this task uses the encoding guard.

## Definition of done

- Contract and historical-authority review, encoding check, typecheck, lint, build, diff boundary, and task validation pass. V2-04 remains blocked until this docs contract merges.

## Allowed paths

- (define)

## Required evidence

- (define)
