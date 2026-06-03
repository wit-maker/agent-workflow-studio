# Runtime Audit Worktree Integration Plan

> Planning status: historical integration record. The landed Runtime Audit worktree phase is no longer the active project plan. Use `docs/project/ACTIVE_PLAN.md` for current next-slice selection.

## Purpose

This document is the integration captain checklist for the Runtime Audit parallel worktree phase.

The phase uses one Codex thread per worktree, branch, and PR. The local checkout is only for integration and final QA. Do not let multiple threads edit the same checkout or the same files.

## Flexibility Strategy

This phase should make future runtime changes easier by stabilizing boundaries, not by freezing the implementation.

Stable boundaries:

- Runtime Audit records safe metadata contracts, not raw execution data.
- Run Detail consumes normalized view models and safe summaries, not storage records directly.
- Edge HUD displays projected connection metadata and navigates by stable node/edge identifiers.
- QA defines repeatable acceptance checks that survive UI or browser-environment changes.

Flexible internals:

- Runtime event producers may evolve as long as they emit the shared safe contract.
- Audit persistence may add optional metadata under existing run history records without adding a new localStorage key.
- Run Detail UI may reorganize its display as long as it consumes safe derived data and keeps comparison state session-only.
- Edge HUD actions may expand from selection/focus into replay or policy inspection without exposing raw config, prompt, payload, or credential data.

Do not treat current labels, grouping, UI wording, or mock implementation details as permanent API. Treat the safe contract, storage boundary, and raw-data exclusion rules as the durable API.

## Extension Principles

Use these rules when adding future slices:

- Add optional fields before replacing existing fields.
- Normalize missing fields to safe defaults so old run history records keep loading.
- Keep user-facing summaries derived and bounded.
- Put reusable transformation logic in pure domain helpers before wiring it into UI or storage.
- Prefer session state for exploratory UI state such as comparison selection, focused edge, filters, and preview modes.
- Expand QA with direct code-path validation when Browser automation cannot cover file picker, download, or native dialog behavior.

## Base Branch

Integration base:

```text
codex/runtime-audit-integration-base
```

Expected creation source:

```text
codex/selection-overlay-minimal-hud @ 3946bec402c665b5df7e213ae5580720f177fa4d
```

Before any integration step:

```powershell
cd C:\dev\github\wit-maker\agent-workflow-studio
git fetch origin
git switch codex/runtime-audit-integration-base
git pull --ff-only origin codex/runtime-audit-integration-base
git status --short
```

If `git status --short` is not clean, stop and identify the owner of the change. Do not reset, rebase, or overwrite.

## Model Gate

Default model for all lanes:

```text
GPT-5.5 high
```

Do not propose or continue xhigh unless the user explicitly writes:

```text
ALLOW_XHIGH
```

If an API model identifier must be documented, use:

```text
gpt-5.5
```

## PR Order

Merge order:

1. `codex/runtime-audit-contract`
2. `codex/runtime-audit-integration-captain`
3. `codex/runtime-events-edge-observability`
4. `codex/durable-audit-route-events`
5. `codex/run-detail-replay-diff-focused`
6. `codex/edge-hud-deep-link-navigation`
7. `codex/runtime-audit-qa-docs`

Reason:

- Contract must land before Runtime Events and Durable Audit so both use the same safe event shape.
- Captain docs can land early because they do not touch `src`.
- Runtime Events produces safe derived events.
- Durable Audit persists safe metadata through existing `traceAudit`.
- Run Detail consumes durable audit summaries.
- Edge HUD deep links into the Run Detail focus path.
- QA/Docs should reflect the merged implementation, so it lands last.

## File Ownership

Common forbidden files:

```text
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

Lane ownership:

| Lane | Allowed files |
|---|---|
| Contract | `src/domain/runtimeAuditContract.ts` only |
| Runtime Events | `src/domain/runtimeEvents.ts`, `src/domain/runtimeEventSummary.ts`, `src/domain/runTrace.ts`, `src/domain/runEngine.ts`, `src/domain/nodeExecutors.ts`, `src/domain/runPlanner.ts` |
| Durable Audit | `src/domain/runAudit.ts`, `src/domain/runHistory.ts`, `src/storage/runHistoryStorage.ts`, optional `src/domain/runAuditRouteEvents.ts` |
| Run Detail | `src/domain/runDetail.ts`, `src/components/RunDetailPanel.tsx` |
| Edge HUD | `src/components/workspace/SelectedEdgeHud.tsx`, `src/components/workspace/CognitiveWorkflowCanvas.tsx`, `src/components/workspace/ReactFlowCanvas.tsx`, `src/domain/cognitiveHud.ts`, `src/domain/reactFlowAdapter.ts` |
| QA/Docs | `PROJECT_STATE.md`, `docs/audit/*.md`, `docs/implementation/runtime-audit-next-phase.md`, `docs/tasks/Codex_Task_Runtime_Audit_Worktree_QA.md`, optional QA script |
| Integration Captain | `docs/implementation/runtime-audit-integration-plan.md`, `docs/tasks/Codex_Task_Runtime_Audit_Integration_Captain.md` |

If a lane needs a forbidden or unowned file, stop and route the change through Integration Captain before editing.

## PR Acceptance Criteria

Every lane PR must be draft by default and include:

- Changed files.
- Validation results for `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build`.
- Browser QA result, or a clear note that Browser QA is not applicable.
- Raw data safety statement confirming no raw config, prompt, payload, artifact body, credential, token, or API key is stored, displayed, or copied.
- Storage statement confirming no new localStorage key.
- Flexibility statement confirming whether the PR changes a stable contract, adds optional metadata, or only changes an internal projection.
- Backward-compatibility statement for any run history, audit, or view-model shape touched by the PR.

Vite chunk-size warnings are acceptable only if there are no TypeScript, lint, build, or runtime errors.

## Integration Validation

After each PR merge:

```powershell
git fetch origin
git switch codex/runtime-audit-integration-base
git pull --ff-only origin codex/runtime-audit-integration-base
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git status --short
```

If validation fails, do not continue to the next PR. Open a fix PR against `codex/runtime-audit-integration-base` or return the failed PR to its lane owner.

## Final QA

Run static validation:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Start preview:

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4178
```

If the port is occupied, use the next free port and report the actual URL.

Browser QA checklist:

- Initial render.
- Canvas render.
- Run.
- Reset.
- Undo and redo.
- Run Detail open.
- Two run/audit snapshots selected.
- Safe metadata diff shown.
- Edge selected.
- Edge HUD shown.
- Select source.
- Select target.
- Open trace or Run Detail focus.
- Copy edge summary.
- No console errors.
- No external script, link, or image requests except localhost.
- No real API, AI, or credential traffic.
- No raw config, prompt, payload, artifact body, credential, token, or API key visible in UI or copied summaries.

If JSON import/export cannot be verified through Browser because downloads or file pickers are unavailable, run a direct code-path validation with a mocked `window.localStorage` and report that fallback.

## Stop Conditions

Stop integration and report if any of these occur:

- A worktree starts dirty.
- A PR edits files outside its lane without prior approval.
- A PR adds a new localStorage key.
- A PR replaces a stable runtime audit field without a compatibility path.
- A PR makes Run Detail, Edge HUD, or QA depend on raw storage records instead of safe derived data.
- A PR stores or displays raw config, prompt, payload, artifact body, credential, token, or API key.
- A PR adds backend/API/credential behavior or dependencies.
- Validation fails after merge.
- Browser QA finds runtime errors or unexpected external requests.
