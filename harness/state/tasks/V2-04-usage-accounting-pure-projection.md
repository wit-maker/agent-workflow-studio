---
id: V2-04
schema_version: 1
title: Usage Accounting Pure Projection
status: todo
role: implementation
actor: unassigned
branch: -
base_commit: 316358b53d00cabc1ff895cef086e7c30261cc18
verified_commit: -
depends: [V2-03]
task_shape: isolated-lane
required_evidence: [unit, diff-boundary, typecheck, lint, build]
allowed_paths: [src, scripts, docs/project/ACTIVE_PLAN.md, PROJECT_STATE.md, docs/tasks, harness/state]
forbidden_paths: [docs/source-specs, package.json, package-lock.json, src-tauri, .env]
created: 2026-07-27T20:01:33+00:00
updated: 2026-07-27T20:01:33+00:00
---

# V2-04 Usage Accounting Pure Projection

## User outcome

A dependency-free pure TypeScript projection reconstructs safe usage totals and measurement availability from V2 usage events without runtime, persistence, or provider integration.

## Acceptance criteria

- Implement only the dependency-free pure TypeScript reducer/projection authorized by the merged V2-03 contract.
- Preserve unavailable/estimated/provider-reported/runtime-measured distinctions and safe overflow, duplicate, migration, replay, retry, branch, cancel, and approval behavior.
- Do not add runtime execution, persistence, provider integration, Tauri/Rust/SQLite, dependency, storage key, API, connector, or raw payload handling.

## Definition of ready

- V2-03 is done and its exact contract is the sole implementation authority.

## Definition of done

- Focused contract tests, encoding check, typecheck, lint, build, diff boundary, and task validation pass.

## Allowed paths

- (define)

## Required evidence

- (define)
