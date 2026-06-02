# Codex Task: Runtime Audit Worktree QA / Docs

## Repository

```text
C:\dev\github\wit-maker\agent-workflow-studio
```

## Branch

```text
codex/runtime-audit-qa-docs
```

## Base

```text
codex/runtime-audit-integration-base
```

## Model Gate

Use Codex Desktop operation label:

```text
GPT-5.5 high
```

ALLOW_XHIGH is not present. Do not propose or continue xhigh. If an API model id must be written, use `gpt-5.5`.

## Start Checks

Run before editing:

```powershell
git rev-parse HEAD
git branch --show-current
git status --short
```

Expected branch:

```text
codex/runtime-audit-qa-docs
```

If this worktree is dirty before work starts, stop and report the diff owner. Do not reset, rebase, or force overwrite.

## Goal

Update QA and audit documentation after the Runtime Audit worktree phase has merged Contract, Runtime Events, Durable Audit, Run Detail Replay / Diff, and Edge HUD Deep Link lanes.

## Allowed Files

```text
PROJECT_STATE.md
docs/audit/*.md
docs/implementation/runtime-audit-next-phase.md
docs/tasks/Codex_Task_Runtime_Audit_Worktree_QA.md
```

## Forbidden Files

```text
src/**
docs/source-specs/**
package.json
package-lock.json
vite.config.*
tsconfig*.json
src/storage/storageKeys.ts
src/storage/localStorageAdapter.ts
src/storage/localWorkflowState.ts
src/storage/localCanvasState.ts
src/storage/localAppSettings.ts
src/App.tsx
src/main.tsx
```

## Documentation Requirements

Record that these are implemented:

- Shared safe runtime/audit contract.
- Mock-run `RunTrace.runtimeEvents`.
- Durable `traceAudit.runtimeEvents` inside existing run history records.
- Old run history compatibility where missing `runtimeEvents` normalizes to `[]`.
- Run Detail two-audit comparison with runtime-event metadata diff.
- Selected Edge HUD deep link to Run Detail focused edge context.

Record that these remain gaps:

- Animated replay.
- Timeline scrubber.
- Runtime policy enforcement.
- Expression evaluator.
- Edge-level historical route reconstruction.
- Durable notification read / ack / pin state.
- Real adapter telemetry and credential-bearing integrations.

## Safety Requirements

Confirm in the docs:

- No raw config, prompt body, payload body, artifact body, credential, token, password, or API key is stored, displayed, or copied by the runtime audit path.
- No new localStorage key is introduced.
- The feature remains mock-only and derived from local workflow/run state.
- Browser QA limitations must be reported honestly, not hidden.

## Validation

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Vite chunk-size warning is acceptable if there are no TypeScript, lint, build, or runtime errors.

## Browser QA

This lane is docs-only, so interactive Browser QA is not required for the PR itself. The task must still document the final integration QA procedure:

- Initial render.
- Canvas render.
- Run.
- Reset.
- Undo / Redo.
- Run Detail open.
- Select two run/audit snapshots.
- Safe metadata diff shown.
- Runtime event count diff shown.
- Edge selected.
- Edge HUD shown.
- Select source / Select target.
- Open Run Detail focus from Edge HUD.
- Copy edge summary without raw data.
- No console errors.
- No external script/link/image request except localhost.
- No real API / AI / credential traffic.
- No new localStorage key.

If Browser cannot verify download/file picker or edge-click behavior, supplement with direct code-path validation and state that limitation in the PR body.

## Pull Request

After validation passes:

1. Stage only the allowed documentation files.
2. Commit with:

```text
docs: update runtime audit qa records
```

3. Push the branch.
4. Open a draft PR against:

```text
codex/runtime-audit-integration-base
```

PR body must include:

- Changed files.
- Validation results.
- Browser QA: docs-only, not run; final QA checklist documented.
- Raw data safety statement.
- Storage statement confirming no new localStorage key.
