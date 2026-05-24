# Agent Workflow Studio Codex / Claude Code Goal・Plan 運用計画書 v2.0

作成日: 2026-05-24  
対象リポジトリ: `C:\dev\github\wit-maker\agent-workflow-studio`  
対象プロダクト: Agent Workflow Studio  
文書種別: Codex / Claude Code に渡すための長期Goal・段階Plan・実装運用計画書  
前提: 現在の実装はMVPであり、完成形ではなく「最大構想の入口」として扱う。

---

## 0. この計画書の目的

Agent Workflow Studio を単なるMVPノードアプリではなく、以下の完成形へ段階的に進めるための、Codex / Claude Code 共通の作業設計を固定する。

```text
Agent Workflow Studio
= ローカル優先AIエージェント・ワークフロー作業OS
= AI作業を、設計・実行・観測・検査・改善・再利用できる作業環境
```

この文書は、1回の修正指示ではない。以下を分離するための上位計画である。

```text
Goal = プロジェクトの北極星
Plan = 現在フェーズの実装計画
Task = 1PR / 1ブランチ / 1作業単位の具体指示
Prompt = AI coding agent に渡す実行文
```

---

## 1. 最重要結論

### 1.1 Goal と Plan を混ぜない

| 区分 | 役割 | 書く内容 | 書いてはいけない内容 |
|---|---|---|---|
| Goal | 長期の北極星 | 最終到達点、判断基準、禁止事項、安全原則、完成形 | このPRでこのファイルを直す |
| Plan | 現在フェーズの作戦 | 現状分析、実装順序、対象ファイル、リスク、完了条件 | 最終仕様の縮小、場当たりの仕様変更 |
| Task | 1作業単位 | 変更対象、受け入れ基準、検証手順 | プロジェクト全体の再定義 |
| Prompt | AIへの入力 | 今回だけの依頼、ブランチ、制約、完了報告形式 | 永続ルールの口頭依存 |

### 1.2 最終Goal

```text
Agent Workflow Studio の最終Goalは、
人間が複数AIエージェントを安全に編成し、
作業を設計し、
実行し、
観測し、
検査し、
改善し、
再利用できる、
ローカル優先のAIワークフロー作業OSにすること。
```

短く言うと、**AIエージェントを使うための作業OS**である。

### 1.3 MVPの扱い

現在のMVPは完成形ではない。MVPは以下を確認する入口である。

- ノードを置けるか
- 接続できるか
- JSON保存・復元できるか
- React Flow 操作が成立するか
- ローカル実行の入口があるか
- 実行状態・ログ・観測の表示ができるか
- テンプレ化の入口があるか

完成形では、ここに次を加える。

- 型付き接続
- 実行エンジン
- Mock / Dry / Partial / Full / Replay Run
- Safety Gate
- Human Approval
- Run History
- Artifact History
- Metrics / Trace / Audit Log
- Cognitive HUD
- Codex / Claude / Hermes / Gemini / GitHub / Local Shell Adapter
- Template / Recipe / Knowledge化
- Workflow migration
- ローカルDesktop化
- Credential安全境界

---

## 2. Source of Truth 階層

AI coding agent が迷わないように、仕様の優先順位を固定する。

| 優先順位 | 文書 | 役割 |
|---:|---|---|
| 1 | `docs/project/PROJECT_GOAL.md` | 最終Goal、北極星、判断基準 |
| 2 | `AGENTS.md` | 全AI coding agent の永続作業ルール |
| 3 | `docs/source-specs/01_要件定義書_完全版.md` | 何を作るか、何の問題を解くか |
| 4 | `docs/source-specs/02_機能仕様書_完全版.md` | 画面、部品、ノード、接続線、実行仕様 |
| 5 | `docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md` | UI/UX、認知HUD、4D空間 |
| 6 | `docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md` | データモデル、実行基盤、永続化 |
| 7 | `docs/source-specs/05_AIエージェント運用設計書_完全版.md` | AI役割、Git権限、モデル確認ゲート |
| 8 | `docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md` | QA、安全ゲート、受け入れ条件 |
| 9 | `docs/source-specs/07_実装ロードマップ_完全版.md` | 段階実装順序 |
| 10 | `PROJECT_STATE.md` | 現在状態、作業履歴、次作業 |
| 11 | Issue / PR / 現在Prompt | 今回だけの局所作業 |

### 禁止される仕様判断

- MVPの都合で最終Goalを縮小する
- 画面実装の都合でデータモデルを壊す
- 実装しやすさだけで安全ゲートを後回しにする
- AIエージェントの役割をモデル名だけで決める
- リサーチ結果を最終判断として扱う
- 実装者が単独で完了判定する
- `PROJECT_STATE.md` を更新せず次作業へ進む
- `git add .` を無条件に使う
- `.env` / APIキー / Credential を雑に扱う
- `main` / `develop` へ直接反映する

---

## 3. Codex / Claude Code の使い分け

| 用途 | 主担当 | 理由 |
|---|---|---|
| 長期Goalの保持 | Codex + AGENTS.md | リポジトリに永続ルールを置ける |
| 実装前のPlan作成 | Claude Code plan mode / Codex plan-first | 編集前に設計を確認できる |
| 連続実装 | Codex | リポジトリ内の作業継続・変更管理に向く |
| 複雑なレビュー | Claude Code / Codex | 別視点で仕様ズレとリスクを確認する |
| 大きな再設計 | GPT-5.5 xhigh / Claude Opus系 | 失敗時影響範囲が大きい |
| 通常実装 | GPT-5.5 high / Claude Sonnet系 | 実装速度と品質のバランス |
| 軽微な整形 | Gemini / GPT-5.2 / Claude Haiku | 高推論モデルを消費しない |

---

## 4. モデル確認ゲート

全AI coding agentは、作業開始前にモデル確認を行う。

確認優先順位:

```text
1. ユーザー明示情報
2. CLI /status
3. CLI /model
4. 設定ファイル
5. 起動オプション
6. 環境変数
```

推奨モデル:

```text
GPT-5.5 xhigh
```

許容モデル:

```text
GPT-5.5 high
```

不一致時の停止文:

```text
モデル変更が必要です。

現在モデル:
推奨モデル: GPT-5.5 xhigh
許容モデル: GPT-5.5 high

理由:
この作業は Agent Workflow Studio の長期Goal / 設計 / 安全境界に影響します。
推奨モデルまたは許容モデルが確認できるまで、作業を開始しません。
```

---

## 5. 次に最初に実行するべきPlan

現在のMVPから最大構想へ進める最初の正しい一歩は、実装追加ではなく棚卸しである。

第一タスク:

```text
feat: audit current MVP against full Agent Workflow Studio goal
```

作成物:

```text
docs/audit/current-implementation-map.md
docs/audit/spec-coverage-matrix.md
docs/audit/missing-systems.md
docs/audit/technical-debt.md
```

---

## 6. 固定原則

Agent Workflow Studio では、便利そうな機能を足すことより、次の3つを優先する。

```text
安全に使えること
見えること
再利用できること
```

すべての実装判断は、次の一文で判定する。

```text
この変更は、ユーザーがAIエージェント群をより安全に、より見える形で、より再利用可能に運用することに近づくか？
```

これに近づかない変更は、どれだけ面白くても後回しにする。
