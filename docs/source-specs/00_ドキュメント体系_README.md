# Agent Workflow Studio Source Specs README

このディレクトリは、Agent Workflow Studio の参照仕様を保存する場所である。

## 方針

- 原文仕様は勝手に削除・要約・改変しない。
- 新しい計画書は、実装判断のためのSource of Truthとして追加する。
- MVP実装の都合で完全版Goalを縮小しない。
- Codex / Claude Code は、作業前にこのディレクトリの仕様と `PROJECT_STATE.md` を確認する。

## 主要文書

| 文書 | 役割 |
|---|---|
| `Agent_Workflow_Studio_Codex_Claude_Goal_Plan_計画書_v2.md` | Codex / Claude Code のGoal・Plan運用計画 |
| `Agent_Workflow_Studio_長期ゴール運用ドクトリン_2026-05-24.md` | 長期Goalと停止条件 |
| `01_要件定義書_完全版.md` | 何を作るか、何の問題を解くか |
| `02_機能仕様書_完全版.md` | 画面、部品、ノード、接続線、実行仕様 |
| `03_UI_UX_認知HUD設計書_完全版.md` | UI/UX、認知HUD、注意制御 |
| `04_システム設計書_データモデル_実行基盤_完全版.md` | データモデル、実行基盤、永続化 |
| `05_AIエージェント運用設計書_完全版.md` | AI役割、Git権限、モデル確認ゲート |
| `06_QA_セキュリティ_受け入れ基準_完全版.md` | QA、安全ゲート、受け入れ条件 |
| `07_実装ロードマップ_完全版.md` | 段階実装順序 |
| `Codex_Task_Goal_Plan_v2_Source_Specs_Audit.md` | Phase 0監査タスクの記録 |

## 状況補佐官 追加レイヤー仕様

`docs/source-specs/situation-assistant/` に「状況補佐官 / 状況説明生成 / 4Dワークフロー・ブリーフィング」の参照仕様が追加されている。

- 本体仕様（01〜07）を**上書きしない**追加レイヤーである。
- 状況補佐官の仕様ファイルは PR #20 で docs-only として main に追加済み。
- ただし、runtime / UI / 音声 / 動画 / アバター / real API 実装は PR #20 には含まれない。
- 最初の実装対象は Run Log / Metrics / HUD Signal からの text briefing MVP とする。
- 音声・動画・アバター実装は text briefing MVP の後続フェーズで扱う。

詳細は `docs/source-specs/situation-assistant/00_ドキュメント体系_README.md` を参照。

## 次作業

Phase 0 の Source of Truth 整備とMVP監査は完了済みである。次にCodexへ渡す作業は以下。

```text
feat: harden Workflow Domain Model (Phase 1)
```