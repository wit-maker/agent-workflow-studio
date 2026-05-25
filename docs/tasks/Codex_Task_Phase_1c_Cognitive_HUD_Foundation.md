# Codex Task: Phase 1c Cognitive HUD foundation

Repository:

```text
C:\dev\github\wit-maker\agent-workflow-studio
```

Branch:

```text
feat/cognitive-hud-foundation
```

Base:

```text
main @ 33ce074ca3fa72823b16943e0093b1fe71308148
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
この作業は Cognitive HUD / Risk State / 実行監視 / 将来の状況補佐官の土台に影響します。
```

## Goal

Implement the Phase 1c Cognitive HUD foundation.

This is not a large UI redesign. The goal is to add a small but real cognitive HUD layer that can derive, prioritize, and display the most important workflow state from the current workflow, execution graph, connector jobs, and run history.

The HUD must help the user answer:

```text
今、何を見るべきか？
どこが詰まっているか？
どこが危険か？
次に何をすべきか？
```

## Required Reading

Read first:

```text
PROJECT_STATE.md
src/domain/workflow.ts
src/domain/executionGraph.ts
src/domain/connectorQueue.ts
src/domain/runHistory.ts
src/components/AppShell.tsx
src/components/BottomMonitor.tsx
src/components/ExecutionGraphPanel.tsx
src/state/workflowSelectors.ts
docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md
docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md
docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md
```

Note: `src/domain/workflow.ts` already contains early vocabulary types such as `RiskState` and `HudState`. Reuse or align with them. Do not create conflicting duplicate vocabulary.

## Scope

Implement an additive foundation only.

Allowed:

- Add pure domain logic for Cognitive HUD signal derivation.
- Add selectors / helper functions.
- Add a small HUD panel in the bottom monitor.
- Add a compact always-visible HUD strip if low risk.
- Update CSS minimally.
- Update PROJECT_STATE.md.

Not allowed:

- Do not redesign the whole UI.
- Do not add external APIs.
- Do not store credentials, prompts, log body snapshots, artifact content, or node config in HUD state.
- Do not introduce Tauri, SQLite, IndexedDB, or new persistence.
- Do not start Trace Store in this PR.
- Do not change Run History schema unless absolutely necessary.
- Do not weaken PR #24 run lifecycle behavior.

## Required Implementation

### 1. Add Cognitive HUD domain module

Create:

```text
src/domain/cognitiveHud.ts
```

It should define a small vocabulary for HUD signals.

Suggested types:

```ts
export type HudAlertLevel = 0 | 1 | 2 | 3 | 4 | 5

export type HudPriority = 'normal' | 'watch' | 'alert' | 'critical'

export type HudSignalKind =
  | 'workflow_status'
  | 'node_failure'
  | 'review_required'
  | 'bottleneck'
  | 'queue_pressure'
  | 'connector_attention'
  | 'storage_notice'
  | 'safety_notice'
  | 'run_history'

export type HudTargetType =
  | 'workflow'
  | 'node'
  | 'connection'
  | 'execution_step'
  | 'connector_job'
  | 'storage'
  | 'run_history'

export type CognitiveHudSignal = {
  id: string
  kind: HudSignalKind
  level: HudAlertLevel
  priority: HudPriority
  title: string
  message: string
  targetType: HudTargetType
  targetId?: string
  recommendedAction?: string
}

export type CognitiveHudSnapshot = {
  alertLevel: HudAlertLevel
  priority: HudPriority
  summary: string
  focusTargetId?: string
  focusTargetType?: HudTargetType
  signals: CognitiveHudSignal[]
  counts: {
    failedNodes: number
    reviewRequiredNodes: number
    runningNodes: number
    queuedNodes: number
    connectorWarnings: number
    runHistoryCount: number
  }
}
```

Adjust names if necessary, but keep the intent.

### 2. Add pure HUD derivation function

In `src/domain/cognitiveHud.ts`, add a pure function such as:

```ts
export function createCognitiveHudSnapshot(input: {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: ConnectorJob[]
  runHistoryCount: number
}): CognitiveHudSnapshot
```

The function should derive signals from current state only. It must not read localStorage, browser state, or React state directly.

Priority rules, minimum:

```text
Level 5 / critical:
- workflow.status === failed
- any failed node
- security / error log if used safely as aggregate signal only

Level 4 / critical or alert:
- review_required workflow / node / execution step
- blocked node

Level 3 / alert:
- bottleneck node exists
- connector job failed / needs_review
- retry candidates exist

Level 2 / watch:
- running nodes
- queued nodes
- high retry count

Level 1 / watch:
- run history exists
- storage notices

Level 0 / normal:
- no important signals
```

The snapshot should be deterministic and sorted by priority:

```text
higher alertLevel first
then critical > alert > watch > normal
then stable id order
```

### 3. Add tests through build-safe pure examples if no test framework exists

This repo currently may not have a test runner. Do not add a test framework in this PR.

Instead:

- Keep domain function pure and TypeScript-checkable.
- Add a few small helper functions if useful.
- If adding a small `*.spec.ts` would not run, do not add it.
- Use `npm run typecheck` / `npm run build` as validation.

### 4. Add a HUD tab to BottomMonitor

File:

```text
src/components/BottomMonitor.tsx
```

Add a new monitor tab:

```text
HUD / 認知HUD
```

Do not remove existing tabs.

The panel should show:

- snapshot summary
- current alert level
- focus target
- signal count
- top 3 to 5 signals
- recommended action for each signal

Create a dedicated component if cleaner:

```text
src/components/CognitiveHudPanel.tsx
```

The panel must be read-only in this PR.

### 5. Wire AppShell to derive the HUD snapshot

File:

```text
src/components/AppShell.tsx
```

Use `useMemo` to create the HUD snapshot from:

```text
workflow
executionGraph
connectorJobs
runHistory.records.length or runHistoryCount
```

Pass it to `BottomMonitor`.

Do not store HUD snapshot in localStorage in this PR.

### 6. Optional compact HUD strip

If it is small and safe, add a compact always-visible HUD strip near the top of the main shell:

```text
認知HUD: 正常 / 注意 / 確認待ち / 失敗
Focus: <node or workflow>
```

This is optional. If the CSS impact is too wide, skip it and keep only the BottomMonitor HUD tab.

### 7. Update PROJECT_STATE.md

Add a new top section:

```text
## Phase 1c: Cognitive HUD foundation
```

Include:

- branch
- files changed
- domain vocabulary added
- UI surface added
- what is intentionally not persisted
- build / lint / typecheck result
- Browser QA result
- unresolved risks
- next recommended phase

## Acceptance Criteria

Required:

- `npm run build` passes
- `npm run lint` passes
- `npm run typecheck` passes
- App starts
- BottomMonitor has the HUD tab
- HUD tab shows normal state before run
- Run All failed path shows high / critical signal
- REVIEW path shows review_required signal
- Stop / cancelled path does not create duplicate or stale HUD state
- Storage tab and Run History still work
- No console errors

## Browser QA Script

Minimum manual QA:

```text
1. Start app.
2. Confirm initial workflow renders.
3. Open BottomMonitor HUD tab.
4. Confirm HUD summary renders with current alert level.
5. Run All once and wait for failed result.
6. Confirm HUD shows failed workflow/node signal.
7. Run All again until review_required path appears.
8. Confirm HUD shows review_required signal.
9. Approve / skip / return review step and confirm HUD updates.
10. Open Storage tab and confirm run history count still works.
11. Reload and confirm app still loads.
12. Console has no unexpected errors.
```

## Completion Report

Use this format:

```markdown
## 実施内容

## 変更ファイル

## Cognitive HUD の設計

## build / lint / typecheck

## Browser QA

## 保存データ安全性

## 未解決リスク

## 次の推奨Phase
```

## Suggested PR

Branch:

```text
feat/cognitive-hud-foundation
```

Title:

```text
feat: add cognitive HUD foundation
```

PR summary:

```markdown
## Summary
- Add pure Cognitive HUD domain snapshot derivation
- Add HUD signals for failed, review_required, bottleneck, queue, connector, and storage states
- Add BottomMonitor HUD tab for summary and prioritized signals
- Keep HUD read-only and non-persistent for Phase 1c

## Validation
- npm run build
- npm run lint
- npm run typecheck
- Browser QA: initial, failed run, review_required, stop/cancel, storage tab
```

## Next Phase After This PR

After Phase 1c passes, recommended next phase:

```text
Phase 1d: Situation Assistant briefing MVP
```

Do not start Phase 1d in this PR.
