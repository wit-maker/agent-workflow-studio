# Source of Truth

Last updated: 2026-05-25

## Priority Order

When sources conflict, use this order:

| Priority | Source | Role |
|---:|---|---|
| 1 | `docs/project/PROJECT_GOAL.md` | final goal, product identity, judgment criteria |
| 2 | `AGENTS.md` | persistent AI coding-agent work rules |
| 3 | `docs/source-specs/01_要件定義書_完全版.md` | product requirements and problems to solve |
| 4 | `docs/source-specs/02_機能仕様書_完全版.md` | screens, node categories, edge types, run modes |
| 5 | `docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md` | UI/UX and cognitive HUD behavior |
| 6 | `docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md` | data model, execution, persistence, adapter boundaries |
| 7 | `docs/source-specs/05_AIエージェント運用設計書_完全版.md` | AI roles, model gate, git authority |
| 8 | `docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md` | QA, safety gates, acceptance criteria |
| 9 | `docs/source-specs/07_実装ロードマップ_完全版.md` | phased implementation order |
| 10 | `PROJECT_STATE.md` | current state, known limits, validation history |
| 11 | Issue / PR / current prompt | current local task instructions |

## Read-Only Reference Specs

These original AI Workflow Lab documents are preserved as source references. Do not delete, summarize in place, or rewrite them:

- `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md`
- `docs/source-specs/AI_Workflow_Lab_画面設計_詳細設計以降_v1.0.md`

New interpretation, audit, or implementation mapping belongs under `docs/project/`, `docs/audit/`, `docs/architecture/`, or `docs/implementation/`.

## Conflict Rules

- If MVP code conflicts with the full source specs, document the gap instead of shrinking the spec.
- If a prompt asks for a risky shortcut, apply `docs/project/STOP_RULES.md`.
- If source specs conflict with each other, stop and create a plan or decision note before implementation.
- If a behavior is not specified, prefer safe, visible, reusable operation.

## Current Audit Sources

The current MVP audit is maintained in:

- `docs/audit/current-implementation-map.md`
- `docs/audit/spec-coverage-matrix.md`
- `docs/audit/missing-systems.md`
- `docs/audit/technical-debt.md`
