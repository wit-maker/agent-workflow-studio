# Source of Truth

Last updated: 2026-06-03

## Concept Layer Correction (Issue #31)

`docs/project/concept-layer-correction.md` は、認知HUD / 状況説明生成レイヤー / 状況補佐官 / text briefing MVP に関する**補助 Source of Truth** である。Priority 1〜2（PROJECT_GOAL / AGENTS）の次、本体 source-specs（Priority 3〜9）と並ぶ位置で参照する。

`docs/project/CONCEPT_CHECKLIST.md` は、この概念定義を実装・PR・QAで使うための軽量チェックリストである。新しい表示面や安全な投影を追加するときは、final layer / MVP surface / safe projection / detail-history / out of scope のどれかを明記する。

正しい概念関係（短縮形）:

```text
ワークフロー実行状態
  → 観測
    → 認知HUDによる注意配分
      → 状況説明生成
        → テキスト / 音声 / アバター / 動画 / 次アクション
```

ドキュメントを書くときは、次の対応関係を必ず守る。

- **認知HUD**: HUDタブではなく、注意配分編集レイヤー / 状況認識編集レイヤー / 意思決定支援レイヤーである。Critical 短音通知などの音を含む表現チャネル群を扱う。
- **状況説明生成レイヤー**: ワークフロー状態を過去・現在・未来の時間軸で説明する後段レイヤー。
- **状況補佐官**: 状況説明生成レイヤーを人間向けの役割として表現したもの。
- **text briefing MVP**: 状況補佐官の全体ではなく、状況説明生成レイヤーの最小出力チャネルの 1 つ。4D ブリーフィングは音声 / アバター / 動画 / 次アクションと並ぶ出力チャネルの 1 つに過ぎない。
- **音声・アバター・動画**: 状況補佐官の本質そのものではないが、当初発想（自動ニュース動画生成の要領で状況を解説する）として必ず保持する応用先である。
- 単純な「補佐官 ＞ 認知HUD」ではなく、**ワークフロー実行状態 → 観測 → 認知HUD → 状況説明生成 → 出力チャネル** という変換パイプラインとして説明する。

詳細は `docs/project/concept-layer-correction.md` を参照する。本体 source-specs と概念修正文書が衝突する場合は、概念修正文書の定義を優先し、本体 source-specs 側を再定義する（縮小・削除ではなく書き直し）。

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
| 10 | `docs/project/ACTIVE_PLAN.md` | current plan selector and next-slice order |
| 11 | `docs/project/CONCEPT_CHECKLIST.md` | concept classification checklist for implementation and review |
| 12 | `PROJECT_STATE.md` | current state, known limits, validation history |
| 13 | Issue / PR / current prompt | current local task instructions |

## Read-Only Reference Specs

These original AI Workflow Lab documents are preserved as source references. Do not delete, summarize in place, or rewrite them:

- `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md`
- `docs/source-specs/AI_Workflow_Lab_画面設計_詳細設計以降_v1.0.md`

New interpretation, audit, or implementation mapping belongs under `docs/project/`, `docs/audit/`, `docs/architecture/`, or `docs/implementation/`.

## Active Plan Boundary

`docs/project/ACTIVE_PLAN.md` is the single current planning entrypoint.

- Use it to choose the next implementation slice.
- Treat `PROJECT_STATE.md` as chronological state and validation history, not as a competing plan list.
- Treat `docs/tasks/**` as task records or handoff prompts unless `ACTIVE_PLAN.md` explicitly marks a task as active.
- Treat `docs/implementation/*next*` files as detail backlogs subordinate to `ACTIVE_PLAN.md`.
- Repository docs may reference GitHub issue numbers for context, but updating repository docs does not change GitHub issue state.

## Conflict Rules

- If MVP code conflicts with the full source specs, document the gap instead of shrinking the spec.
- If a prompt asks for a risky shortcut, apply `docs/project/STOP_RULES.md`.
- If source specs conflict with each other, stop and create a plan or decision note before implementation.
- If a behavior is not specified, prefer safe, visible, reusable operation.

## 状況補佐官 追加レイヤー

`docs/source-specs/situation-assistant/` は Agent Workflow Studio 本体仕様の**追加レイヤー**である。

- 本体仕様（Priority 3〜9）を上書きしない。
- 衝突が発生した場合は、本体仕様を優先し、差分ノートを `docs/project/` に追加する。ただし、上記 "Concept Layer Correction" による定義（認知HUD / 状況説明生成レイヤー / 状況補佐官の意味）は本体仕様より優先する（本体仕様側を書き直す）。
- 状況補佐官は、状況説明生成レイヤーを人間向けの役割として表現したものであり、ブリーフィングタブ / TTS / アバター / 動画生成のいずれか単独ではない。
- 現時点の実装対象（text briefing MVP）は、状況説明生成レイヤーの**最小出力チャネル**であり、状況補佐官の最終定義ではない。
- 音声・動画・アバターは MVP スコープ外だが、当初発想の重要な応用先として削除・縮小しない。

| Priority | Source | Role |
|---:|---|---|
| 2.5 | `docs/project/concept-layer-correction.md` | 認知HUD / 状況説明生成 / 状況補佐官の概念定義（補助 SoT） |
| 3a | `docs/source-specs/situation-assistant/01_要件定義書_状況補佐官_完全版.md` | 状況補佐官 要件（本体仕様の追加） |
| 3b | `docs/source-specs/situation-assistant/02〜07` | 状況補佐官 機能・設計・QA・ロードマップ |

## Current Audit Sources

The current MVP audit is maintained in:

- `docs/audit/current-implementation-map.md`
- `docs/audit/spec-coverage-matrix.md`
- `docs/audit/missing-systems.md`
- `docs/audit/technical-debt.md`
