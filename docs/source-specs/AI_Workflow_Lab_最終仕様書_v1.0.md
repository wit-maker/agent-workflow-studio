# AI Workflow Lab 最終仕様書 v1.0
## 上流工程成果物から詳細設計まで

作成日: 2026-05-21  
対象: `ai-workflow-lab`  
位置づけ: GPT-5.5 xhigh / high Codex に渡して実装可能な最終仕様  
決定方針: 添付資料群の内容を統合し、上流工程成果物から詳細設計までを一つのマスタードキュメントに固定する。

---

## 0. 最終決定サマリー

AI Workflow Lab は、単なるチャットUIでも、単なるn8nクローンでも、単なるノードエディタでもない。

本システムは、**AIエージェント、外部情報取得、ファイル入力、コード生成、リサーチ、評価、検査、記録、観測、改善、テンプレート化を、キャンバス上の型付きワークフローとして設計・実行・再利用するローカル優先のAI作業OS**である。

最終仕様として、以下を固定する。

| 項目 | 最終決定 |
|---|---|
| 製品名 | AI Workflow Lab |
| 中核価値 | AI作業を「見える部品」「型付き接続」「実行ログ」「観測メーター」「改善ループ」として扱う |
| 設計思想 | Scratchの理解しやすさ、n8n系の外部連携、Upload Labsの流量・資源・詰まり管理を統合する |
| 実行単位 | ワークフロー |
| 最小構成 | 手動起点、テキスト入力、ファイル入力、整形、分岐、AI実行、外部接続、検査、集約、出力、実行ログ、テンプレ保存 |
| 独自性 | トークン量・コスト・遅延・詰まり・比率制御をMVPから可視化する |
| AI役割分担 | モデル名ではなく、責任範囲・判断レベル・Git権限・成果物・失敗時影響範囲で分ける |
| 実装対象 | まずはローカルアプリのMVP。将来、外部連携・自動実行・共有・クラウド化を拡張 |
| 非対象 | 基盤LLM自体の自動ファインチューニング、完全自律公開、無確認の危険操作、実サービスの課金最適化 |

---

# Part 1. 上流工程成果物

## 1. 企画書

### 1.1 背景

AI作業は、チャット単位では再現性が低い。  
一度うまくいった調査、実装、レビュー、記事作成、UI設計、画像生成、PR作成なども、次回また最初から組み立て直す必要がある。

また、AIエージェントが複数になるほど、以下の問題が増える。

| 問題 | 内容 |
|---|---|
| 作業の不可視化 | どのAIが何をしたか見えない |
| 責任混同 | 調査、判断、実装、レビュー、QA、記録が混ざる |
| 再現性不足 | 成功した手順を再利用できない |
| コスト不透明 | トークン、時間、遅延、失敗率が見えない |
| 安全リスク | APIキー、`.env`、機密情報、危険なGit操作が混入する |
| UI負荷 | 複雑なAI作業が文章だけで管理され、理解しづらい |

AI Workflow Lab は、これらを「キャンバス上の部品」として扱い、作業を再利用可能なワークフローに変換する。

### 1.2 目的

本システムの目的は、以下である。

1. AI作業を部品化する。
2. AI作業の流れを視覚化する。
3. AIエージェントの責任範囲を分離する。
4. 実行結果を検査・評価する。
5. 実行ログを残す。
6. トークン、コスト、遅延、成功率、詰まりを観測する。
7. 成功パターンをテンプレ化する。
8. 失敗パターンを作り直しに接続する。
9. Codex / Hermes / Grok / Claude / Gemini などを作業文脈に応じて使い分ける。
10. 将来的にAI作業の個人OS・研究所・記事製造ライン・開発支援母艦へ発展させる。

### 1.3 成功条件

| 成功条件 | 判定基準 |
|---|---|
| ワークフローを視覚的に作れる | キャンバスに部品を配置し、接続できる |
| 型違い接続を防げる | ポート型による接続可否判定がある |
| 最小ワークフローを実行できる | 入力→整形→AI実行→検査→出力→記録が通る |
| 実行状態が見える | 実行ログ、タイムライン、メーターが表示される |
| AI役割を分けられる | リサーチ、実装、QA、記録などの担当を設定できる |
| 成果物を保存できる | Markdown / JSON / Diff / Template として保存できる |
| 再利用できる | 成功したワークフローをテンプレートとして再実行できる |
| Upload Labs的独自性がある | トークン・コスト・遅延・詰まり・比率制御が見える |

---

## 2. 要件定義

### 2.1 業務要件

AI Workflow Lab が扱う主な業務は以下とする。

| 業務領域 | 代表ワークフロー |
|---|---|
| AI開発支援 | Codex実装依頼、差分確認、テスト、PR本文作成、レビュー統合 |
| リサーチ | Hermes / Grok / Web検索による情報収集、要約、出典整理 |
| X / Web調査 | X投稿取得、URL取得、反応確認、事実・推測・不確実性分離 |
| 仕様書作成 | ファイル読込、分解、構造化、仕様統合、Markdown出力 |
| コンテンツ作成 | 記事構成、執筆、校正、画像プロンプト、CMS投稿準備 |
| UI / UX設計 | UI案生成、情報設計、デザインシステム照合、画像生成指示 |
| QA / セキュリティ | 仕様照合、回帰確認、機密情報確認、公開前承認 |
| 記録 / 引き継ぎ | PROJECT_STATE、CHANGELOG、作業ログ、判断ログ |

### 2.2 機能要件

| ID | 要件 | 優先度 |
|---|---|---|
| FR-001 | キャンバスに部品を配置できる | Must |
| FR-002 | 部品パレットから部品を検索・追加できる | Must |
| FR-003 | ノードに入力ポート・出力ポートを持たせる | Must |
| FR-004 | 型付き接続ルールで不正接続を防ぐ | Must |
| FR-005 | インスペクターで選択ノードの設定を編集できる | Must |
| FR-006 | 手動起点からワークフローを実行できる | Must |
| FR-007 | テキスト入力・ファイル入力を扱える | Must |
| FR-008 | 整形・分岐・AI実行・検査・集約・出力を扱える | Must |
| FR-009 | 実行ログと実行タイムラインを表示する | Must |
| FR-010 | トークン量・コスト・遅延・成功率・詰まりを表示する | Must |
| FR-011 | テンプレート保存・再利用ができる | Must |
| FR-012 | 外部接続の接続状態を表示できる | Should |
| FR-013 | Codex / Hermes / Grok / Claude / Gemini の役割表示を持つ | Should |
| FR-014 | エラー経路・リトライ経路を持つ | Should |
| FR-015 | 人間承認ゲートを置ける | Should |
| FR-016 | ワークフローをJSONで保存・読み込みできる | Must |
| FR-017 | 成果物をMarkdown / JSON / Diffとして保存できる | Must |
| FR-018 | 実行結果を検査し、PASS / REVIEW / FAIL を出せる | Should |
| FR-019 | 成功パターン・失敗パターンをテンプレ化できる | Should |
| FR-020 | 将来的にスケジュール・Webhook起点を扱える | Could |

### 2.3 非機能要件

| 分類 | 要件 |
|---|---|
| 安全性 | APIキー、`.env`、機密情報、個人情報を外部出力前に検査する |
| 再現性 | 実行入力、設定、出力、ログ、使用モデル、実行時刻を記録する |
| 可観測性 | 成功率、失敗率、コスト、トークン、遅延、詰まりを表示する |
| 拡張性 | ノード種別、データ型、接続線、外部コネクタを追加できる |
| 操作性 | Scratch的に、見て分かる部品・ステージ・フィードバックを持つ |
| 耐障害性 | 失敗時にRetry、Error Route、人間確認へ送れる |
| 権限分離 | 実装、判断、レビュー、QA、セキュリティ、記録を分離する |
| ローカル優先 | 最初はローカルアプリとして成立させる |
| 実装容易性 | MVPでは巨大なクラウド基盤や複雑な自動実行を必須にしない |

---

## 3. スコープ定義

### 3.1 MVPスコープ

MVPで必ず作る部品は以下の12個とする。

| 分類 | MVP部品 | 最小機能 |
|---|---|---|
| 起点 | 手動起点 | 実行クリック、入力確認、実行開始 |
| 入力 | テキスト入力 | 文字列取得、空欄判定、入力保存 |
| 入力 | ファイル入力 | ファイル取得、種別判定、本文抽出 |
| 整形 | 整形 | 正規化、要点抽出、プロンプト化 |
| 分岐 | 分岐 | 作業種別判定、モデル選択、経路選択 |
| 実行 | AI実行 | プロンプト送信、出力取得、使用量取得 |
| 外部 | 外部接続 | 接続先選択、認証確認、データ取得 |
| 検査 | 検査 | 仕様照合、安全確認、不足確認 |
| 集約 | 集約 | 結果収集、重複除去、統合 |
| 出力 | 出力 | Markdown / JSON / Diff表示・保存 |
| 記録 | 実行ログ | 入力、出力、エラー、コスト、時刻記録 |
| 再利用 | テンプレ保存 | ワークフロー構造と設定を保存 |

MVPでも必ず入れる独自要素は以下である。

| 独自要素 | 理由 |
|---|---|
| トークン量表示 | AIワークフローの負荷を見える化する |
| コスト表示 | 高コスト化を早期に把握する |
| 遅延表示 | ボトルネックを見つける |
| 詰まり表示 | Upload Labs的な資源管理を成立させる |
| 比率制御 | 複数AI・複数経路への分配を設計できる |

### 3.2 MVPではやらないこと

| 除外項目 | 理由 |
|---|---|
| 完全自律公開 | 安全確認が不足すると危険 |
| 基盤LLMの自動Fine-tuning | 仕様として未確定で重すぎる |
| 複雑なRBAC | MVPではローカル利用を優先 |
| クラウドマルチユーザー | 初期実装が肥大化する |
| 決済・課金管理 | 本筋ではない |
| 大規模分散キュー | MVPの検証には不要 |
| すべての外部API実装 | まずは抽象コネクタとモックで成立させる |
| 画像生成の完全統合 | 後続フェーズでよい |

---

# Part 2. 基本設計

## 4. 共通生成式

最終仕様の共通生成式は以下で固定する。

```text
起点
↓
入力取得
↓
整形・前処理
↓
分岐・ルーティング
↓
実行
↓
検査
↓
集約
↓
出力
↓
記録
↓
観測
↓
改善
↓
テンプレ化 / 作り直し
```

### 4.1 各工程の定義

| # | 工程 | 役割 | 主な入力 | 主な出力 |
|---|---|---|---|---|
| 1 | 起点 | 作業開始条件を定義する | 手動操作、Webhook、スケジュール、Issue、ファイル追加 | 実行要求 |
| 2 | 入力取得 | 必要な材料を取得する | Text, File, URL, Issue, Post, Email | Raw Data |
| 3 | 整形・前処理 | 形式を揃え、AIに渡せる形へ変換する | Raw Data | Structured Data, Prompt, Context |
| 4 | 分岐・ルーティング | 条件、リスク、難易度、担当に応じて経路を選ぶ | Structured Data, Metric | Route, Assignment |
| 5 | 実行 | AI、CLI、外部API、ローカル処理を行う | Prompt, Context, File | Result, Diff, Artifact |
| 6 | 検査 | 仕様、安全、品質、機密、出典を確認する | Result, Artifact, Evidence | Pass / Review / Fail |
| 7 | 集約 | 複数結果を比較・統合する | Results | Integrated Result |
| 8 | 出力 | 成果物として表示・保存・公開準備する | Integrated Result | Markdown, JSON, Diff, Image, Report |
| 9 | 記録 | 入力、処理、判断、出力、失敗を保存する | All Runtime Data | Log, History |
| 10 | 観測 | コスト、遅延、詰まり、成功率を測る | Log, Metric | Dashboard, Alert |
| 11 | 改善 | 失敗原因と改善案を作る | Alert, Fail Reason | Retry Plan, Improvement Plan |
| 12 | テンプレ化 / 作り直し | 成功構造を保存し、失敗構造を再設計する | Workflow, Result, Log | Template, Recipe, Rebuild Plan |

---

## 5. 3系統ハイブリッド設計

### 5.1 Scratch由来の要素

| Scratch要素 | AI Workflow Labでの置換 |
|---|---|
| ブロック | AI作業部品 |
| スプライト | AIエージェント |
| ステージ | 実行結果・成果物プレビュー |
| イベント | 作業開始条件 |
| メッセージ | エージェント間通信 |
| 変数 | ワークフロー内状態 |
| リスト | 複数結果・候補・ファイル集合 |
| 接続形状 | 型付きポート制約 |

### 5.2 n8n系由来の要素

| n8n系要素 | AI Workflow Labでの置換 |
|---|---|
| Trigger | 起点部品 |
| Action Node | 実行部品 |
| Router / Switch | 分岐部品 |
| Transform | 整形部品 |
| Integration | 外部接続部品 |
| Credential | 権限・安全部品 |
| Execution Log | 記録・観測部品 |
| Retry | 改善部品 |
| Error Route | 失敗経路 |

### 5.3 Upload Labs由来の要素

| Upload Labs要素 | AI Workflow Labでの置換 |
|---|---|
| Downloader | 入力取得 |
| Uploader | 出力 |
| Collector | 集約 |
| Scanner / Verifier | 検査 |
| Compressor | 圧縮・要約・トークン削減 |
| Splitter | 比率制御・ルーティング |
| CPU / GPU | 処理資源メーター |
| AI Trainer / Generator | AI実行部品 |
| Schematics | テンプレート |
| Portal / Prestige | 作り直し・再構築 |

---

## 6. 画面設計

### 6.1 画面一覧

| 画面ID | 画面名 | 目的 |
|---|---|---|
| UI-01 | 全体俯瞰 | ワークフロー全体、主要パス、メトリクス、ログを俯瞰 |
| UI-02 | 全部品ライブラリ | 部品の検索、確認、追加 |
| UI-03 | 入力・収集 | 入力ソース設定、正規化、プレビュー |
| UI-04 | 処理・制御フロー | 前処理、解析、分類、分岐、並列、リトライ、エラー処理 |
| UI-05 | 成果物ステージ | 成果物プレビュー、品質ゲート、公開準備 |
| UI-06 | 部品設定・ブロック編集 | ノード内部設定、プロンプト、入出力、テスト |
| UI-07 | 外部接続・AI連携 | Codex、Hermes、Grok、Claude、Gemini、Git、Drive等の接続管理 |
| UI-08 | 観測メーター・実行監視 | 実行中ジョブの状態、コスト、トークン、遅延、詰まり表示 |
| UI-09 | 回収・評価・再作成 | 評価、Diff、再作成、人間レビュー |
| UI-10 | 一周後の強化状態 | テンプレ、レシピ、ナレッジ、改善提案の確認 |

### 6.2 共通レイアウト

```text
┌──────────────────────────────────────────────┐
│ Top Bar: 実行 / 停止 / 再実行 / 保存 / スケジュール │
├──────────────┬───────────────────┬───────────┤
│ Left Palette │ Main Canvas / Stage │ Inspector │
│ 部品一覧       │ ノード・接続線・結果表示 │ 設定編集    │
├──────────────┴───────────────────┴───────────┤
│ Bottom Monitor: 実行ログ / タイムライン / メーター / キュー │
└──────────────────────────────────────────────┘
```

### 6.3 基盤UI部品

| UI部品 | 役割 |
|---|---|
| キャンバス | ノードを配置する編集空間 |
| 部品パレット | 利用可能部品の一覧 |
| ノードカード | 1つの処理単位 |
| ポート | 入力口・出力口 |
| 接続線 | データ、指示、結果、ログ、資源などの流れ |
| インスペクター | 選択部品の設定編集 |
| ステージ | 実行結果・成果物プレビュー |
| 実行ボタン | ワークフロー開始 |
| 停止ボタン | 実行停止 |
| 再実行ボタン | 前回条件で再実行 |
| ミニマップ | 大規模キャンバスの位置確認 |
| 下部メーター | コスト、時間、トークン、成功率、詰まり |
| 実行タイムライン | 実行順、開始時刻、終了時刻、状態 |
| エージェント表示 | 担当AI・権限・状態 |
| テンプレート棚 | 保存済みワークフロー |

---

# Part 3. 詳細設計

## 7. ドメインモデル

### 7.1 主要エンティティ

| エンティティ | 説明 |
|---|---|
| Workflow | ワークフロー全体 |
| Node | キャンバス上の部品 |
| Port | ノードの入力・出力口 |
| Edge | ノード間の接続線 |
| DataType | 接続可能性を制御する型 |
| Run | 1回の実行 |
| RunStep | 実行内の1ステップ |
| Artifact | 出力成果物 |
| LogEntry | 実行ログ |
| Metric | 観測値 |
| Template | 保存済みワークフロー |
| AgentRole | AIエージェントの役割 |
| Connector | 外部接続 |
| CredentialRef | 認証情報の参照 |
| Gate | 検査・承認ゲート |
| Review | 人間またはAIによるレビュー |
| ErrorEvent | 失敗情報 |
| ImprovementPlan | 改善案 |
| RebuildPlan | 作り直し案 |

### 7.2 Workflow

```ts
type Workflow = {
  id: string
  name: string
  description?: string
  version: number
  nodes: Node[]
  edges: Edge[]
  variables: WorkflowVariable[]
  templates?: TemplateRef[]
  createdAt: string
  updatedAt: string
}
```

### 7.3 Node

```ts
type Node = {
  id: string
  type: NodeType
  title: string
  category: NodeCategory
  position: { x: number; y: number }
  size?: { width: number; height: number }
  inputs: Port[]
  outputs: Port[]
  config: Record<string, unknown>
  status: NodeStatus
  agentRole?: AgentRoleId
}
```

### 7.4 Port

```ts
type Port = {
  id: string
  name: string
  direction: "input" | "output"
  dataType: DataTypeId
  required: boolean
  multiple: boolean
}
```

### 7.5 Edge

```ts
type Edge = {
  id: string
  fromNodeId: string
  fromPortId: string
  toNodeId: string
  toPortId: string
  edgeType: EdgeType
  status: EdgeStatus
  metrics?: EdgeMetric
}
```

### 7.6 Run

```ts
type Run = {
  id: string
  workflowId: string
  status: "queued" | "running" | "success" | "failed" | "cancelled" | "review_required"
  startedAt: string
  finishedAt?: string
  inputSnapshot: unknown
  outputSnapshot?: unknown
  steps: RunStep[]
  metrics: RunMetric
}
```

### 7.7 RunMetric

```ts
type RunMetric = {
  tokenIn: number
  tokenOut: number
  estimatedCost: number
  latencyMs: number
  successRate?: number
  errorCount: number
  bottleneckNodeIds: string[]
}
```

---

## 8. ノード分類

### 8.1 最終部品分類

```text
UI部品
入力部品
整形部品
分岐部品
実行部品
資源部品
検査部品
集約部品
出力部品
記録部品
観測部品
改善部品
テンプレ部品
作り直し部品
AIエージェント部品
権限・安全部品
データ型部品
接続線部品
```

### 8.2 起点部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| 手動起点 | ユーザー操作 | 実行可否判定 | Trigger |
| チャット依頼起点 | 発話 | 意図抽出 | Trigger + Text |
| ファイル追加起点 | File | 種別判定 | Trigger + File |
| URL入力起点 | URL | URL形式確認 | Trigger + URL |
| GitHub Issue起点 | Issue番号 | Issue取得 | Trigger + Issue |
| PR起点 | PR番号 | Diff取得 | Trigger + PR |
| X投稿検索起点 | 検索語 | 投稿取得 | Trigger + Post[] |
| Drive資料起点 | File ID | 権限確認・取得 | Trigger + File |
| スクショ起点 | Image | 画像取得 | Trigger + Image |
| 音声メモ起点 | Audio | 文字起こし | Trigger + Text |
| Webhook起点 | HTTP Request | 署名検証 | Trigger + Payload |
| 定期実行起点 | Cron | 時刻一致判定 | Trigger |
| 失敗復旧起点 | Error | 復旧条件確認 | Retry Trigger |

### 8.3 入力取得部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| テキスト入力 | Text | 空欄判定・保存 | Text |
| URL取得 | URL | HTTP取得 | Text / HTML |
| ファイル読込 | File | 本文抽出 | Text / File |
| Markdown読込 | Markdown | パース | Markdown AST / Text |
| PDF読込 | PDF | テキスト抽出 | Text |
| 画像読込 | Image | メタ情報取得 | Image / Text |
| 音声読込 | Audio | 文字起こし | Text |
| Drive取得 | Drive ID | ファイル取得 | File |
| GitHub取得 | Repo / Issue / PR | API取得 | Issue / PR / Diff |
| X検索取得 | Query | 投稿取得 | Post[] |
| Gmail取得 | Query | メール取得 | Email[] |
| ローカルファイル取得 | Path | 読込 | File |
| クリップボード取得 | Clipboard | 読込 | Text |
| コマンド出力取得 | Command | 実行・取得 | Text |
| 履歴取得 | Run ID | 過去ログ取得 | Log / Result |

### 8.4 整形・前処理部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| 正規化 | Any | 形式統一 | Structured Data |
| ノイズ除去 | Text | 不要情報削除 | Text |
| Markdown整形 | Markdown | 見出し・箇条書き整形 | Markdown |
| 要約 | Text | 要点圧縮 | Summary |
| 抽出 | Text | 指定情報抽出 | Extracted Data |
| 分解 | Text | 主題・目的・条件へ分解 | Structured Data |
| 構造化 | Text | JSON / 表 / ツリー化 | JSON |
| タグ付け | Any | 種別・重要度付与 | Tagged Data |
| 圧縮 | Context | トークン削減 | Context |
| 翻訳 | Text | 言語変換 | Text |
| 用語統一 | Text | 表記ゆれ修正 | Text |
| チャンク化 | Long Text | 分割 | Chunk[] |
| コンテキスト組立 | Data[] | 文脈構築 | Context |
| プロンプト化 | Context | 指示化 | Prompt |

### 8.5 分岐・ルーティング部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| 作業種別判定 | Text / Context | 調査・実装・UI等へ分類 | Route |
| 難易度判定 | Task | 軽作業・中難度・高難度判定 | Route |
| リスク判定 | Task / Artifact | 危険度判定 | Risk |
| モデル選択 | Task + Risk | モデル候補選択 | Agent Assignment |
| 役割選択 | Task | 担当職能選択 | AgentRole |
| 条件分岐 | Boolean / Condition | if / switch | Route |
| 並列分配 | Any | 複数経路へ分配 | Branch[] |
| 比率制御 | Any + Ratio | 80:20等で分配 | Weighted Branch[] |
| キュー投入 | Task | 待機列へ投入 | Queue Item |
| 優先度制御 | Task | 優先順位付与 | Priority |
| 人間確認分岐 | Risk / Review | 承認待ちへ送る | Approval Request |
| 失敗時分岐 | Error | 成功/失敗経路分離 | Error Route |

### 8.6 実行部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| AI実行 | Prompt + Context | LLM呼び出し | Result |
| Codex実行 | Prompt + Repo Context | 実装・修正 | Diff / Patch |
| Hermes実行 | Query | 調査・X検索補助 | Findings |
| Grok / X検索実行 | Query | X投稿検索 | Post[] / Summary |
| Claudeレビュー実行 | Artifact | レビュー | Review |
| Gemini実行 | Prompt | 軽作業・補助 | Result |
| Web検索実行 | Query | Web検索 | Evidence[] |
| GitHub操作 | Issue / PR / Diff | API操作 | GitHub Result |
| Drive操作 | File | 取得・保存 | File Result |
| Gmail操作 | Email | 読込・下書き | Email Result |
| ローカルCLI実行 | Command | コマンド実行 | Command Output |
| テスト実行 | Test Command | テスト実行 | Test Result |
| ビルド実行 | Build Command | ビルド | Build Result |
| 画像生成 | Image Prompt | 画像生成 | Image |
| 文書生成 | Prompt | 記事・仕様書生成 | Markdown |
| UI生成 | Prompt | モック生成 | UI Spec |

### 8.7 検査部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| 仕様照合 | Artifact + Spec | 要件一致確認 | Pass / Review / Fail |
| 安全確認 | Artifact | 危険表現・危険操作確認 | Safety Result |
| 機密確認 | Artifact / File | APIキー・`.env`・秘密情報確認 | Secret Scan Result |
| 出典確認 | Evidence | URL・引用確認 | Evidence Result |
| 幻覚確認 | Text | 不確実・存在しない主張確認 | Hallucination Risk |
| 型確認 | Data | 型一致確認 | Type Result |
| スキーマ確認 | JSON | Schema Validation | Schema Result |
| テスト確認 | Code / Test | テスト結果確認 | Test Result |
| 回帰確認 | Diff / Test | 既存機能破壊確認 | Regression Result |
| 品質確認 | Artifact | 網羅性・有用性・一貫性確認 | Quality Score |
| セキュリティ確認 | Code / Config | 脆弱性・権限確認 | Security Result |
| 公開前確認 | Artifact | 外部公開可否確認 | Approval Needed |
| 人間承認 | Review Request | 承認 / 差戻し | Approval Result |
| 失敗理由抽出 | Error / Result | 失敗原因分類 | Fail Reason |
| 不足確認 | Artifact + Spec | 欠落検出 | Missing Items |

### 8.8 集約部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| Collector | Branch Results | 収集 | Result[] |
| 比較 | Result[] | 差分比較 | Diff |
| 重複除去 | Result[] | 重複削除 | Result[] |
| 矛盾検出 | Result[] | 矛盾抽出 | Conflict[] |
| 優先順位付け | Item[] | 重要度順に並べる | Ranked Items |
| 統合 | Result[] | 統合成果物生成 | Integrated Result |
| レビュー統合 | Review[] | 指摘統合 | Review Summary |
| 調査統合 | Evidence[] | 出典付き統合 | Research Summary |
| 実装案統合 | Proposal[] | 最適案選定 | Decision |
| UI案統合 | UI Proposal[] | 推奨仕様化 | UI Spec |
| 判断材料化 | Data[] | 意思決定用要約 | Decision Brief |

### 8.9 出力部品

| 部品 | 入力 | 処理 | 出力 |
|---|---|---|---|
| Markdown出力 | Result | Markdown整形 | `.md` |
| JSON出力 | Data | JSON整形 | `.json` |
| Diff出力 | Code Change | Diff化 | `.diff` |
| レポート出力 | Result | レポート化 | Report |
| 画像出力 | Image | 保存 | `.png` |
| PR本文出力 | Diff + Summary | PR本文生成 | PR Body |
| Issue出力 | Task | Issue本文生成 | Issue Body |
| PROJECT_STATE更新案 | Log | 状態更新案生成 | Markdown |
| CHANGELOG更新案 | Diff / Log | 変更履歴生成 | Markdown |
| クリップボード出力 | Text | コピー | Clipboard |
| ローカル保存 | Artifact | ファイル保存 | File |
| 外部保存 | Artifact | Drive / GitHub等へ保存 | Save Result |
| パッケージ出力 | Artifact[] | ZIP化 | Package |
| ステージ表示 | Artifact | プレビュー | Preview |
| 公開準備 | Artifact | 公開前確認へ送る | Publish Candidate |
| テンプレ出力 | Workflow | 再利用形式化 | Template |

### 8.10 記録・観測・改善・テンプレ部品

| 分類 | 部品 | 役割 |
|---|---|---|
| 記録 | 実行履歴 | Run単位で履歴保存 |
| 記録 | 入出力ログ | 入力・出力の再現性を保持 |
| 記録 | 判断ログ | 分岐・承認・却下理由を保持 |
| 記録 | エラーログ | 失敗箇所と原因を保持 |
| 観測 | トークンメーター | 入出力トークン表示 |
| 観測 | コストメーター | 推定コスト表示 |
| 観測 | 遅延メーター | レイテンシ表示 |
| 観測 | 詰まりメーター | ボトルネック表示 |
| 観測 | 成功率メーター | 成功 / 失敗比率表示 |
| 改善 | Retry | 再試行 |
| 改善 | Error Route | 失敗経路 |
| 改善 | 別AI再ルーティング | 担当モデル変更 |
| 改善 | Compressor追加 | コンテキスト圧縮 |
| 改善 | Splitter比率変更 | 配分最適化 |
| テンプレ | Schematics保存 | ワークフロー保存 |
| テンプレ | レシピ化 | 成功手順を再利用形式にする |
| 作り直し | 最小構成復帰 | 複雑化した構成を戻す |
| 作り直し | 再設計 | 失敗構造を再生成する |

---

## 9. データ型仕様

| 型 | 内容 |
|---|---|
| Text | 通常テキスト |
| URL | Webリンク |
| File | 添付ファイル |
| Markdown | md文書 |
| PDF | PDF資料 |
| Image | 画像・スクショ |
| Audio | 音声メモ |
| Issue | GitHub Issue |
| PR | Pull Request |
| Diff | コード差分 |
| Post | X投稿 |
| Email | メール |
| Prompt | AI指示 |
| Context | AIに渡す文脈 |
| Result | 実行結果 |
| Evidence | 出典・根拠 |
| Decision | 判断結果 |
| Artifact | 成果物 |
| Log | 実行記録 |
| Template | 再利用構造 |
| Metric | 観測値 |
| Error | 失敗情報 |
| JSON | 構造化データ |
| Boolean | 真偽値 |
| Number | 数値 |
| DateTime | 日時 |
| Command | CLI命令 |
| Review | レビュー結果 |

---

## 10. 接続線仕様

| 線 | 流れるもの | 主な用途 |
|---|---|---|
| データ線 | 入力・ファイル・本文 | 通常データ受け渡し |
| 指示線 | プロンプト・命令 | AI実行への指示 |
| 結果線 | AI出力・成果物 | 実行結果の受け渡し |
| 判断線 | 条件・真偽値・リスク値 | 分岐・承認 |
| 証拠線 | URL・引用・根拠 | 出典管理 |
| ログ線 | 実行履歴・判断履歴 | 記録 |
| エラー線 | 失敗情報 | Error Route |
| 再試行線 | Retry対象・条件・回数 | 再実行 |
| 承認線 | 承認対象・結果・承認者 | 人間確認 |
| 資源線 | トークン・時間・コスト・負荷 | 観測 |
| テンプレ線 | 保存構造・可変項目 | 再利用 |
| 改善線 | 観測値・問題箇所・改善案 | 改善循環 |

### 10.1 接続可能性ルール

| ルール | 内容 |
|---|---|
| 型一致 | 出力ポート型と入力ポート型が一致する場合のみ接続可 |
| 互換型 | Text→Prompt、Text→Contextなど明示互換のみ許可 |
| 危険型 | Credential、Secret、`.env`は通常データ線に流さない |
| 承認必須 | 公開、削除、Git main反映、外部送信は承認線を要求 |
| 検査必須 | 出力前には検査ノードを通過する |
| ログ必須 | 実行ノードは記録ノードへログ線を持つ |
| 資源観測 | AI実行ノードは資源線でメーターへ接続する |
| エラー経路 | 外部接続・AI実行・ファイル処理はエラー線を持つ |

---

## 11. AIエージェント役割分担仕様

### 11.1 役割分担原理

AIの役割は、モデル名ではなく以下で決める。

1. 責任範囲
2. Git権限
3. 判断レベル
4. 成果物
5. 失敗時影響範囲
6. 必要な推論深度
7. 安全リスク

### 11.2 役割一覧

| 役割 | 主な責任 | 主担当候補 | 禁止事項 |
|---|---|---|---|
| リサーチ担当 | 外部情報収集、出典整理、事実/推測/不確実性分離 | Gemini Deep Research, Perplexity, Hermes, Grok | 最終判断、コード変更、Git操作 |
| 軽作業担当 | Markdown整形、ログ整理、単純分類 | Gemini, GPT-5.2, Claude Haiku | 仕様変更、大規模リファクタ、削除 |
| 開発リーダー | 目的確認、仕様方針、リスク判断、最終判断 | GPT-5.5 xhigh/high, Claude Opus系 | 常用実装担当化、専門分担破壊 |
| 開発サブリーダー | タスク分解、仕様翻訳、PRレビュー、develop統合 | GPT-5.x high, Claude Sonnet系 | main判断、独断リリース |
| プログラマー | feature/fix実装、テスト、技術制約報告 | Codex, Claude Code, GPT-5.x | 仕様外変更、無断main操作 |
| デザイナー | UI/UX、情報設計、認知負荷低減 | GPT-5.x, Claude, GPT Images | 技術実装の独断変更 |
| QA / テスト担当 | 仕様照合、回帰確認、テストケース | GPT-5.x, Claude | 実装完了の独断承認 |
| セキュリティ担当 | 機密、権限、公開前リスク確認 | GPT-5.5 high/xhigh, Claude Opus系 | 通常レビューとの混同 |
| 記録担当 | 作業ログ、決定事項、引き継ぎ | Gemini, GPT-5.2, Claude Haiku | 未記録終了 |
| 人間 | 最終承認、危険操作承認、方針確定 | User | 丸投げではなく承認点を持つ |

### 11.3 Git権限

| ブランチ | 主担当 | ルール |
|---|---|---|
| feature/* | プログラマー | 小規模実装・通常実装 |
| fix/* | プログラマー | バグ修正 |
| develop | 開発サブリーダー | 統合判断対象。直接操作制限 |
| main | 開発リーダー + 人間承認 | リリース判断対象。直接操作禁止に近い扱い |

### 11.4 判断フロー

```text
リサーチ担当
↓ 調査結果
開発リーダー
↓ 方針判断
開発サブリーダー
↓ 作業分解
プログラマー / デザイナー
↓ 実装・UI案
QA / セキュリティ
↓ 品質・リスク判断
開発リーダー
↓ 最終判断
人間承認
```

---

## 12. 権限・安全仕様

### 12.1 禁止操作

| 禁止 | 理由 |
|---|---|
| `git add .` の無断使用 | 意図しないファイル混入を防ぐ |
| `.env` の公開 | 機密漏洩防止 |
| APIキーのログ出力 | 機密漏洩防止 |
| main直接変更 | リリース事故防止 |
| develop直接変更 | 統合事故防止 |
| 削除操作の無確認実行 | データ喪失防止 |
| 危険な自動化の無確認承認 | 外部被害防止 |
| 調査結果を最終判断にする | 誤判断防止 |
| 実装者だけで完了判定する | 品質事故防止 |

### 12.2 検査ゲート

| ゲート | 必須条件 |
|---|---|
| 出力前ゲート | 品質確認、仕様照合、不足確認 |
| 公開前ゲート | 機密確認、出典確認、人間承認 |
| Git操作ゲート | 差分確認、対象ファイル確認、ブランチ確認 |
| 外部接続ゲート | 認証確認、レート制限確認、ログ確認 |
| AI実行ゲート | モデル確認、入力サイズ確認、危険命令確認 |

---

## 13. 実行設計

### 13.1 実行状態

| 状態 | 意味 |
|---|---|
| idle | 未実行 |
| ready | 実行可能 |
| queued | キュー待ち |
| running | 実行中 |
| success | 成功 |
| failed | 失敗 |
| review_required | 人間確認待ち |
| retrying | 再試行中 |
| cancelled | 中断 |
| skipped | 条件によりスキップ |

### 13.2 実行順序

1. ワークフロー妥当性検査
2. 必須入力確認
3. 型付き接続検査
4. 危険接続検査
5. 実行計画生成
6. トポロジカルソート
7. 起点実行
8. 入力取得
9. 整形
10. 分岐
11. 実行
12. 検査
13. 集約
14. 出力
15. 記録
16. 観測
17. 改善提案
18. テンプレ保存候補提示

### 13.3 エラー処理

| エラー | 処理 |
|---|---|
| 入力不足 | 実行前に停止 |
| 型不一致 | 接続不可として表示 |
| 認証失敗 | 外部接続エラーとして停止 |
| AI実行失敗 | Retryまたは別AI再ルーティング |
| 検査不合格 | REVIEW / FAILへ送る |
| 出力失敗 | 保存先変更または再試行 |
| コスト過多 | 人間確認へ送る |
| トークン過多 | 圧縮ノード追加提案 |
| 遅延過多 | 軽量モデル分流または比率変更提案 |

---

## 14. 保存設計

### 14.1 ローカル保存対象

| 対象 | 形式 |
|---|---|
| Workflow | JSON |
| Template | JSON |
| Run Log | JSONL |
| Artifact | Markdown / JSON / Diff / PNG |
| Metric | JSON |
| Decision Log | Markdown / JSON |
| Error Log | JSONL |
| Project State | Markdown |

### 14.2 推奨ディレクトリ

```text
ai-workflow-lab/
  workflows/
    *.workflow.json
  templates/
    *.template.json
  runs/
    YYYY-MM-DD/
      run-*.json
      run-*.log.jsonl
  artifacts/
    run-id/
      output.md
      output.json
      patch.diff
  docs/
    PROJECT_STATE.md
    CHANGELOG.md
    agent-roles.md
    security-rules.md
```

---

# Part 4. 実装方針

## 15. 推奨実装順序

### Phase 0: 土台

| 項目 | 内容 |
|---|---|
| 型定義 | Workflow, Node, Port, Edge, Run, Metric |
| サンプルデータ | MVPワークフローJSON |
| UI骨格 | 左パレット、中央キャンバス、右インスペクター、下部ログ |
| 保存 | JSON保存・読込 |

### Phase 1: MVPワークフロー

| 項目 | 内容 |
|---|---|
| 手動起点 | 実行ボタン |
| テキスト入力 | 入力フォーム |
| ファイル入力 | ファイル読込 |
| 整形 | ダミー整形 / 実整形 |
| AI実行 | モックまたはローカルCLI連携 |
| 検査 | 仕様照合・安全確認の簡易版 |
| 出力 | Markdown / JSON表示 |
| 実行ログ | タイムライン表示 |
| メーター | トークン / コスト / 遅延 / 詰まり表示 |
| テンプレ保存 | ワークフロー保存 |

### Phase 2: AIエージェント連携

| 項目 | 内容 |
|---|---|
| Codex | 実装依頼プロンプト生成・CLI連携候補 |
| Hermes | 調査プロンプト生成・コマンド連携候補 |
| Grok / X | X検索取得結果の入力 |
| Claude / Gemini | レビュー・軽作業担当 |
| Agent Role | 役割・権限・禁止事項のUI表示 |

### Phase 3: 評価・改善

| 項目 | 内容 |
|---|---|
| PASS / REVIEW / FAIL | 評価状態 |
| Diff | バージョン比較 |
| Retry | 再試行 |
| Error Route | 失敗経路 |
| Compressor提案 | トークン過多時 |
| Splitter比率変更 | 詰まり・コスト過多時 |
| Template化 | 成功パターン保存 |
| Rebuild | 作り直し案生成 |

---

## 16. Codex実装指示用の受け入れ基準

Codexに渡すときの完了条件は以下。

### 16.1 機能完了条件

- [ ] `Workflow`, `Node`, `Port`, `Edge`, `Run`, `Metric` の型定義がある。
- [ ] サンプルMVPワークフローJSONがある。
- [ ] 左パレット、中央キャンバス、右インスペクター、下部ログが表示される。
- [ ] ノードを追加できる。
- [ ] ノードを選択すると設定が右側に表示される。
- [ ] ポート型に基づく接続可否判定がある。
- [ ] 手動起点→テキスト入力→整形→AI実行→検査→出力→記録のサンプル実行ができる。
- [ ] 実行タイムラインが表示される。
- [ ] トークン、コスト、遅延、詰まりのメーターが表示される。
- [ ] ワークフローをJSON保存・読込できる。
- [ ] テンプレート保存ができる。
- [ ] エラー時にログが残る。
- [ ] 検査ノードを通らない外部出力には警告が出る。
- [ ] `git add .` を使わない。
- [ ] `.env` やAPIキーをコミット対象にしない。

### 16.2 実装禁止

- [ ] 仕様外の巨大機能を追加しない。
- [ ] 実外部APIを無断で呼ばない。
- [ ] main / develop へ直接反映しない。
- [ ] 保存済みファイルを無断削除しない。
- [ ] UIを過度に装飾しない。
- [ ] MVPに不要なクラウド認証を必須化しない。
- [ ] モデル名だけで役割分担を固定しない。

---

## 17. 未確定事項

以下は、最終仕様書v1.0では「決めない」。実装しながら検証して決める。

| 未確定項目 | 理由 |
|---|---|
| 実DB | MVPはJSON保存で成立する |
| 外部APIの正式認証方式 | 実接続前に安全設計が必要 |
| クラウド化 | 初期スコープ外 |
| 複数ユーザー権限 | ローカル優先のため後回し |
| 自動Fine-tuning | テンプレ改善と混同しない |
| 課金計算の正式式 | まずは推定表示 |
| 画像生成統合 | 後続フェーズ |
| Webhook公開 | セキュリティ設計後 |
| 完全自動PR作成 | 人間承認ゲート後 |
| 自動公開 | MVPでは禁止 |

---

# Part 5. Codexへ渡す実装プロンプト

以下を GPT-5.5 xhigh / high Codex に渡す。

```markdown
# Role

あなたは優秀なAI coding agentです。
対象リポジトリ `ai-workflow-lab` を、AI作業を視覚的ワークフローとして設計・実行・観測・再利用できるローカルアプリへ実装してください。

# Mission

添付の `AI Workflow Lab 最終仕様書 v1.0` に従い、まずMVPを実装してください。

このアプリは、単なるチャットUIでも、n8nクローンでもありません。
AIエージェント作業を、型付きノード、接続線、実行ログ、観測メーター、検査ゲート、テンプレート保存で扱うAI作業OSです。

# Critical Principle

実装前に必ず現在モデルと推奨モデルを確認してください。

推奨:
- GPT-5.5 xhigh: 仕様判断、アーキテクチャ、難所、リスク判断
- GPT-5.5 high: 通常実装、UI実装、型定義、レビュー

現在モデルが不明、または推奨と異なる場合は、作業を開始せず「モデル変更が必要」と報告して停止してください。

# MVP Scope

必ず実装する部品:

1. 手動起点
2. テキスト入力
3. ファイル入力
4. 整形
5. 分岐
6. AI実行
7. 外部接続
8. 検査
9. 集約
10. 出力
11. 実行ログ
12. テンプレ保存

MVPでも必ず表示する観測要素:

- トークン量
- コスト
- 遅延
- 詰まり
- 成功率
- 実行ログ
- 実行タイムライン

# Required UI

画面は以下の構造にしてください。

- 左: 部品パレット
- 中央: キャンバス / ステージ
- 右: インスペクター
- 下: 実行ログ / タイムライン / メーター

# Required Domain Types

少なくとも以下を型定義してください。

- Workflow
- Node
- Port
- Edge
- DataType
- Run
- RunStep
- RunMetric
- Artifact
- LogEntry
- Template
- AgentRole
- Connector

# Required Behavior

- ノードを追加できる
- ノードを選択できる
- インスペクターで設定を見られる
- ポート型に基づき接続可否を判定できる
- サンプルMVPワークフローを実行できる
- 実行結果をステージに表示できる
- 実行ログを保存できる
- ワークフローをJSON保存・読込できる
- テンプレート保存できる
- 検査ノードを通らない外部出力には警告を出す
- AI実行は最初はモックでもよいが、将来のCodex / Hermes / Grok / Claude / Gemini接続を前提に抽象化する

# Safety Rules

- `git add .` は使わない
- `.env` やAPIキーをコミットしない
- main / develop へ直接反映しない
- 削除操作は事前に対象を列挙する
- 実外部APIを無断で呼ばない
- 仕様外の巨大機能を追加しない
- 実装者だけで完了判定しない
- 検査、記録、観測を省略しない

# Acceptance Criteria

- MVPワークフローが画面上で確認できる
- ノード、ポート、接続線、インスペクター、ステージ、ログ、メーターが存在する
- サンプルワークフローJSONがある
- ワークフロー保存・読込ができる
- 実行タイムラインに各ステップの状態が出る
- トークン・コスト・遅延・詰まり・成功率が表示される
- テンプレート保存ができる
- 型付き接続の基本ルールが実装されている
- READMEに実行方法とMVP範囲が書かれている
- PROJECT_STATE.mdに実装状況、未実装、次の作業が記録されている

# Output

作業後、以下を報告してください。

1. 変更ファイル一覧
2. 実装した機能
3. 仕様に対する達成状況
4. 未実装の理由
5. テスト結果
6. 次にGPT-5.5 xhighへ判断を戻すべき論点
```

---

# 18. 結論

AI Workflow Lab v1.0 の最終仕様は、以下の一文に集約できる。

**AI作業を、起点から入力取得、整形、分岐、実行、検査、集約、出力、記録、観測、改善、テンプレ化 / 作り直しまでの型付きワークフローとして扱い、AIエージェントの責任範囲と実行資源を見える化するローカル優先のAI作業OS。**

この仕様を最終基準として、GPT-5.5 xhigh / high Codex には、まずMVP実装を依頼する。
