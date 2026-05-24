# Codex Task: Goal / Plan v2 Source Specs and MVP Audit

Repository:

```text
C:\dev\github\wit-maker\agent-workflow-studio
```

Branch:

```text
docs/source-specs-goal-plan-v2
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
この作業は Agent Workflow Studio の長期Goal / Source of Truth / 実装ロードマップ / 安全境界に影響します。
```

## Goal

Align the repository with the new Goal / Plan v2 doctrine and audit the current MVP against the full Agent Workflow Studio goal.

Do not start large feature implementation in this task.

## Required Reading

Read these first:

```text
AGENTS.md
PROJECT_STATE.md
README.md
docs/source-specs/Agent_Workflow_Studio_Codex_Claude_Goal_Plan_計画書_v2.md
docs/source-specs/Agent_Workflow_Studio_長期ゴール運用ドクトリン_2026-05-24.md
docs/source-specs/00_ドキュメント体系_README.md
docs/source-specs/01_要件定義書_完全版.md
docs/source-specs/02_機能仕様書_完全版.md
docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md
docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md
docs/source-specs/05_AIエージェント運用設計書_完全版.md
docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md
docs/source-specs/07_実装ロードマップ_完全版.md
```

Do not delete, summarize, or rewrite the existing original AI Workflow Lab source specs.

## Create / Update

Create or update:

```text
docs/project/PROJECT_GOAL.md
docs/project/PLAN_PROTOCOL.md
docs/project/SOURCE_OF_TRUTH.md
docs/project/STOP_RULES.md
```

Create:

```text
docs/audit/current-implementation-map.md
docs/audit/spec-coverage-matrix.md
docs/audit/missing-systems.md
docs/audit/technical-debt.md
```

Update:

```text
AGENTS.md
PROJECT_STATE.md
```

## Audit Requirements

`current-implementation-map.md` must cover:

```text
screens
components
data model
save / load
execution
observability
templates
safety controls
mock connectors / adapters
```

`spec-coverage-matrix.md` must classify each area as:

```text
Done
Partial
Missing
Mismatch
Risk
```

Cover at least:

```text
UI-01 to UI-12
node categories
data types
edge types
run modes
metrics / trace / audit log
cognitive HUD
safety gates
templates / recipes / knowledge
external adapters
local-first / Tauri / file storage
```

`missing-systems.md` must use priorities:

```text
P0 = needed before the next implementation phase
P1 = needed soon
P2 = needed for the full product
```

`technical-debt.md` must include current limits that may block later work.

## Do Not

Do not implement large UI features, live external integrations, Tauri, SQLite, or credential value storage in this task.
Do not push directly to main or develop.
Do not use `git add .`.

## Validation

Run:

```bash
npm run build
npm run lint
npm run typecheck
```

If `typecheck` does not exist, report that and use `npm run build` as the TypeScript check substitute.

Browser QA minimum:

```text
1. app starts
2. initial workflow is visible
3. BottomMonitor is visible
4. Agent / Queue / Storage tabs still work
5. docs-only changes did not break UI
```

## Completion Report

Report:

```markdown
## 実施内容
## 追加・更新ファイル
## build / lint / typecheck
## Browser QA
## 分かったこと
## 最大構想との差分
## 次の推奨Phase
## 未解決リスク
```
