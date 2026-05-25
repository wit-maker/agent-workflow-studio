# Codex Task: Run History lifecycle hardening after PR #23

Repository:

```text
C:\dev\github\wit-maker\agent-workflow-studio
```

Branch:

```text
fix/run-history-lifecycle-hardening
```

Base:

```text
main @ 6161f71fde094b596c5afa7fc40e344a720debdc
```

## Mandatory Model Gate

Before starting, verify the active model.

Recommended model:

```text
GPT-5.5 xhigh
```

Allowed fallback:

```text
GPT-5.5 high
```

If the active model is unknown or different, stop and print only:

```text
モデル変更が必要です。

現在モデル:
推奨モデル: GPT-5.5 xhigh
許容モデル: GPT-5.5 high

理由:
この作業は Run History の実行ライフサイクル、保存整合性、将来の監査ログ / 認知HUD の土台に影響します。
```

## Goal

Fix the known post-merge issues from PR #23 so Run History does not record misleading success, premature review pause records, stale cancellation logs, or wrong scoped connection counts.

This is a hardening PR, not a feature expansion.

## Required Reading

Read first:

```text
PROJECT_STATE.md
src/components/AppShell.tsx
src/domain/runHistory.ts
src/storage/runHistoryStorage.ts
src/domain/runPlanner.ts
src/state/workflowReducer.ts
src/state/workflowActions.ts
```

Also read the post-merge follow-up comment on PR #23 if available.

## Required Fixes

### 1. Unknown terminal workflow state must not become success

File:

```text
src/components/AppShell.tsx
```

Current risk:

```ts
: 'success'
```

Unknown / unexpected terminal states are currently recorded as success. This is wrong.

Required:

- Use explicit status mapping.
- Fallback must be `failed` or another explicit non-success terminal status.
- Do not silently create a successful Run Record from an unknown state.

Preferred helper:

```ts
function mapWorkflowStatusToRunStatus(status: WorkflowStatus): WorkflowRunStatus {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'failed'
    case 'review_required': return 'review_required'
    case 'paused':
    case 'cancelled': return 'cancelled'
    default: return 'failed'
  }
}
```

Adjust exact typing to match the repo.

### 2. `review_required` must not finalize and clear pending run too early

Current risk:

`pendingRunRef.current = null` happens before checking whether the run is only paused for human review.

Required behavior:

- If the run transitions to `review_required`, do **not** clear `pendingRunRef` as if the run has ended forever.
- Keep the pending run open until final terminal state: `success`, `failed`, or `cancelled`.
- If a review_required record is useful, it must be replaceable by the same `runId` later, not duplicated.
- `appendRunRecord` already replaces by `runId`; use that behavior intentionally.

Acceptance:

- A run that pauses at review_required and later succeeds must end as one final `success` record, not a stale `review_required` record plus a second record.

### 3. Cancellation must stop late async step updates from corrupting Run History

Current risk:

After stop/cancel, an in-flight `executeNodeStep` / post-step dispatch path can append logs or transition jobs after Run History was already finalized.

Required:

- Guard every post-await dispatch / log append / connector job update path with the current `runToken`.
- After `await executeNodeStep(...)`, re-check the token before dispatching step completion, logs, artifacts, or connector updates.
- Cancelled runs should settle before final record creation, or final record creation should be robust against late updates.

Acceptance:

- Stop during active step records one final `cancelled` run.
- No late step completion logs are added to that run after finalization.

### 4. plannedConnectionCount must be scoped to the planned run

Current risk:

For selected/fromSelected/partial runs, `plannedConnectionCount` uses full `workflow.connections.length`.

Required:

- Count only the connections participating in `plan.nodes`.
- For all/full, count full planned graph.
- For selected/fromSelected, count edges where both endpoints are within the planned node set, unless `runPlanner` already exposes scoped connections.

Suggested implementation:

```ts
function countPlannedConnections(workflow: Workflow, plannedNodes: WorkflowNode[]): number {
  const plannedIds = new Set(plannedNodes.map((node) => node.id))
  return workflow.connections.filter(
    (connection) => plannedIds.has(connection.from.nodeId) && plannedIds.has(connection.to.nodeId),
  ).length
}
```

Adjust field names to match the repo.

### 5. localStorage write errors must not be silent

File:

```text
src/storage/runHistoryStorage.ts
```

Current risk:

`saveRunHistory` / `appendRunRecord` may silently ignore write failures.

Required:

- At minimum, `console.warn` with the original error.
- Preserve current UI behavior if no error surface exists yet.
- Do not throw in normal UI flow unless the existing storage adapter pattern already does.

Acceptance:

- Simulated localStorage setItem error is visible in console warning.

### 6. Unknown planner mode must not fallback to mock

File:

```text
src/domain/runHistory.ts
```

Current risk:

Unknown planner mode falls back to `mock`, masking the actual run mode.

Required:

- Prefer exhaustive mapping for known planner modes.
- For unknown input, return a non-masking fallback such as `full` only if justified, or introduce explicit `unknown` if widening the type is acceptable.
- Do not label unknown mode as `mock`.

Preferred minimal approach:

```ts
export function mapRunPlannerMode(mode: RunMode): WorkflowRunMode {
  switch (mode) {
    case 'all': return 'full'
    case 'selected':
    case 'fromSelected': return 'partial'
    case 'dryRun': return 'dryRun'
    case 'validate': return 'validate'
  }
}
```

If the current signature accepts `string`, tighten it if possible.

## Do Not

- Do not add a full Run History detail UI in this PR.
- Do not add Trace Store in this PR.
- Do not introduce Tauri / SQLite / IndexedDB.
- Do not store log body, prompt body, artifact content, credential, token, API key, or node config in Run History.
- Do not rewrite large unrelated parts of `AppShell.tsx`.
- Do not change the PR #23 storage schema unless required; if schema changes, document the migration impact.

## Validation

Run:

```bash
npm run build
npm run lint
npm run typecheck
```

If `typecheck` script does not exist, report it and use `npm run build` as the TypeScript check substitute.

Browser QA minimum:

```text
1. Full Run records failed/success correctly.
2. Stop during an active step records final cancelled state after quiescence.
3. No late step completion logs mutate the cancelled record.
4. review_required pause does not permanently clear pending run.
5. After approval/rejection path reaches a terminal state, the same runId record is replaced/updated, not duplicated.
6. selected/fromSelected run records scoped connectionCount.
7. Storage tab still shows run history count.
8. Reload preserves records.
9. Simulated or inspected localStorage write failure is no longer silent.
10. Console has no unexpected errors.
```

## Completion Report

Use this format:

```markdown
## 実施内容

## 変更ファイル

## 修正したPR #23残課題

## build / lint / typecheck

## Browser QA

## 保存データ安全性

## 未解決リスク

## 次の推奨Phase
```

## Next Phase After This PR

After this hardening PR passes, proceed to:

```text
Phase 1c: Cognitive HUD foundation
```

Do not start Phase 1c in this PR.
