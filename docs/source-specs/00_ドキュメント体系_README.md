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
| `Codex_Task_Goal_Plan_v2_Source_Specs_Audit.md` | Codexへ渡す次作業指示 |

## 次作業

次にCodexへ渡す作業は以下。

```text
feat: audit current MVP against full Agent Workflow Studio goal
```
