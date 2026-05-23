# AI Workflow Lab 画面設計・詳細設計以降仕様書 v1.0

## 0. この文書の位置づけ

本書は、`AI_Workflow_Lab_最終仕様書_v1.0.md` の次工程として、詳細設計以降に必要になる画面設計、UIコンポーネント設計、画面遷移、状態遷移、操作仕様、フロントエンド実装単位、受け入れ基準をまとめた実装用仕様書である。

対象は、AI Workflow Lab / Upload Labs 的なワークフロー設計UIである。
ここで扱う設計範囲は、要件定義・基本設計のさらに下流に位置する。

```text
上流工程成果物
  ↓
最終仕様書
  ↓
画面設計・詳細設計以降仕様書 ← 本書
  ↓
UI実装タスク分解
  ↓
Codex / Claude Code / Gemini 実装
  ↓
レビュー・QA・改善
```

本書では、未確定の外部API仕様、DB物理設計、課金仕様、認証基盤仕様は断定しない。
MVP実装では、実API接続ではなくローカルモック / シミュレーションを優先する。

---

## 1. 画面設計の確定方針

### 1.1 基本方針

AI Workflow Lab の画面は、単なるチャット画面ではなく、以下を同時に扱う作業環境として設計する。

| 領域 | 画面上の扱い |
|---|---|
| ワークフロー構造 | キャンバス上のノードと接続線で表示する |
| 作業部品 | 左側の部品パレットから追加する |
| ノード詳細 | 右側インスペクターで設定する |
| 実行結果 | ステージ / 出力エリアで確認する |
| 実行状態 | 下部メーター、タイムライン、ログで確認する |
| 改善循環 | 評価・再作成・テンプレ化画面で扱う |
| 外部接続 | 接続管理画面で状態、権限、制限、テスト結果を管理する |
| AI役割分担 | ノードまたは実行パスごとに担当AIを表示する |

### 1.2 画面設計で守ること

| 原則 | 内容 |
|---|---|
| 常時俯瞰 | どの画面でも現在のワークフロー、実行状態、選択対象を見失わせない |
| 情報階層の固定 | 左=部品、中央=作業領域、右=設定、下=観測を基本形にする |
| 型付き接続 | 接続できる / できない理由をUIで示す |
| 実行状態の可視化 | idle / running / success / failed / review_required を全画面で共通化する |
| 安全ゲート | 外部出力、公開、削除、Git操作、Credential操作には確認状態を出す |
| Upload Labs性 | トークン量、コスト、遅延、詰まり、比率制御をMVP段階から見える化する |
| Scratch性 | 操作結果をすぐ確認できるステージを持つ |
| n8n性 | 起点、外部接続、条件分岐、リトライ、エラールートを明示する |

---

## 2. 画面一覧

### 2.1 主要画面

| ID | 画面名 | 目的 | MVP | 画面種別 |
|---|---|---:|---|
| UI-01 | 全体俯瞰 / メインキャンバス | ワークフロー全体の作成・確認・実行 | 必須 | メイン作業画面 |
| UI-02 | 全部品ライブラリ | 部品検索、部品確認、キャンバス追加 | 必須 | 部品管理画面 |
| UI-03 | 入力・収集 | 入力ソース、取得設定、正規化状況を管理 | 必須 | 入力設計画面 |
| UI-04 | 処理・制御フロー | 前処理、分岐、並列、リトライを設計 | 必須 | フロー設計画面 |
| UI-05 | 成果物ステージ | 出力、プレビュー、承認、保存を管理 | 必須 | 出力確認画面 |
| UI-06 | 部品設定・ブロック編集 | 個別ノードの詳細設定・テスト実行 | 必須 | 詳細編集画面 |
| UI-07 | 外部接続・AI連携 | 外部サービス、AI、Credential、接続状態を管理 | 準必須 | 接続管理画面 |
| UI-08 | 観測メーター・実行監視 | 実行中ジョブのログ・メトリクスを監視 | 必須 | 監視画面 |
| UI-09 | 回収・評価・再作成 | 評価、レビュー、差分、再作成を管理 | 準必須 | 改善画面 |
| UI-10 | 一周後の強化状態 | テンプレ、レシピ、ナレッジ、改善提案を管理 | 準必須 | 再利用画面 |

### 2.2 MVPで最初に実装する画面

MVPでは、10画面すべてを独立画面として完成させるより、以下の5画面を優先する。

| 優先 | 画面 | 理由 |
|---:|---|---|
| 1 | UI-01 全体俯瞰 / メインキャンバス | 中核画面。ここがないとアプリの意味が成立しない |
| 2 | UI-06 部品設定・ブロック編集 | ノードを設定できないとワークフローが実行不能になる |
| 3 | UI-08 観測メーター・実行監視 | Upload Labs 的な独自性の核になる |
| 4 | UI-05 成果物ステージ | 出力確認・承認・保存が必要 |
| 5 | UI-02 全部品ライブラリ | 部品追加と理解の入口になる |

UI-03、UI-04、UI-07、UI-09、UI-10 は、MVPではメインキャンバス内のタブ / パネルとして簡略実装し、後から独立画面化する。

---

## 3. 共通レイアウト設計

### 3.1 デスクトップ標準レイアウト

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Bar: Project / Run / Stop / Test / Save / Schedule / Status     │
├───────────────┬──────────────────────────────────┬─────────────────┤
│ Left Sidebar  │ Main Work Area                    │ Right Inspector │
│               │                                  │                 │
│ Parts Palette │ Canvas / Flow / Stage             │ Selected Node   │
│ Categories    │                                  │ Config          │
│ Search        │ Nodes + Edges                     │ Input/Output    │
│ Templates     │                                  │ Metrics/Error   │
├───────────────┴──────────────────────────────────┴─────────────────┤
│ Bottom Bar: Metrics / Timeline / Queue / Logs / Output Preview      │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 推奨サイズ

| 領域 | 幅 / 高さ | 備考 |
|---|---:|---|
| Top Bar | 高さ 48px | 実行操作を常時表示 |
| Left Sidebar | 幅 280px | 折りたたみ時 64px |
| Right Inspector | 幅 360px | 折りたたみ時 0px |
| Bottom Bar | 高さ 220px | 最小 120px、最大 420px |
| Main Work Area | 可変 | キャンバス中心 |

### 3.3 情報の固定配置

| 情報 | 表示位置 |
|---|---|
| 使える部品 | 左 |
| 現在作っている流れ | 中央 |
| 選んだものの詳細 | 右 |
| 実行状態・メトリクス | 下 |
| 実行操作 | 上 |
| 最終成果物 | 中央ステージまたは下部プレビュー |
| エラー・警告 | ノード上、右Inspector、下部ログに同時表示 |

---

## 4. グローバルナビゲーション設計

### 4.1 Top Bar

| 要素 | 種別 | 機能 |
|---|---|---|
| Project Switcher | Select | プロジェクト切替 |
| Workflow Name | Text / Editable | 現在のワークフロー名表示・編集 |
| Save | Button | ワークフロー保存 |
| Run | Primary Button | 実行開始 |
| Stop | Button | 実行停止 |
| Test Run | Button | モック実行 / テスト実行 |
| Schedule | Button | 定期実行設定。MVPではdisabled可 |
| Status Badge | Badge | unsaved / saved / running / failed |
| Model Policy Badge | Badge | 推奨モデル確認状態を表示 |

### 4.2 Left Sidebar Navigation

| カテゴリ | 内容 |
|---|---|
| Workspace | 全体俯瞰、最近のワークフロー |
| Parts | 部品パレット、部品ライブラリ |
| Inputs | 入力・収集 |
| Flow | 処理・制御フロー |
| Agents | AIエージェント |
| Connectors | 外部接続 |
| Runs | 実行履歴、監視 |
| Evaluation | 評価、再作成 |
| Templates | テンプレート、レシピ、ナレッジ |
| Settings | 権限、安全、モデル確認ルール |

MVPでは、Left Sidebar は「部品パレット」と「画面切替ナビ」を兼ねてよい。

---

## 5. UI-01 全体俯瞰 / メインキャンバス 詳細設計

### 5.1 画面目的

ワークフロー全体を視覚的に作成、確認、実行する中核画面。
AI Workflow Lab の主画面であり、すべての部品、接続線、実行状態、成果物、観測メーターへアクセスできる。

### 5.2 画面構成

| 領域 | 内容 |
|---|---|
| 左 | 部品パレット、テンプレート棚 |
| 中央 | キャンバス、ノード、接続線、グループ |
| 右 | 選択ノードのInspector |
| 下 | 実行メトリクス、タイムライン、ログ、出力プレビュー |
| 上 | 実行・停止・保存・テスト実行 |

### 5.3 表示要素

| 要素 | 表示内容 |
|---|---|
| Node Card | タイトル、種別、担当AI、状態、入出力ポート、主要メトリクス |
| Edge | 線種、データ型、状態、流量、エラー |
| Group Lane | Codex開発パス、Hermesリサーチパス、X/Webリサーチパス、コンテンツ作成パス、フィードバックループ |
| Mini Map | キャンバス全体の縮小表示 |
| Canvas Toolbar | zoom, fit, align, auto layout, validate |
| Status Overlay | 実行中、エラー、承認待ち、レビュー待ち |

### 5.4 操作仕様

| 操作 | 挙動 |
|---|---|
| 部品クリック | 部品説明を表示 |
| 部品ドラッグ | キャンバスに仮配置 |
| 部品ドロップ | ノード生成 |
| ノードクリック | Inspectorを更新 |
| ノードダブルクリック | UI-06 部品設定・ブロック編集へ移動 |
| ポートドラッグ | 接続線作成開始 |
| ポートドロップ | 型検証後に接続作成 |
| 無効接続 | 接続せず理由を表示 |
| Run | 現在のワークフローを実行 |
| Stop | 実行中ジョブを停止 |
| Validate | 未接続、型不一致、安全ゲート不足を検査 |

### 5.5 MVP表示サンプルノード

| 順序 | ノード | 担当 | 入力 | 出力 |
|---:|---|---|---|---|
| 1 | Manual Trigger | 人間 | 操作 | Trigger |
| 2 | Text Input | 人間 | Text | Text |
| 3 | File Input | 人間 | File | File |
| 4 | Normalize | 軽作業AI | Text / File | Context |
| 5 | Route | 開発サブリーダーAI | Context | Decision |
| 6 | AI Execute | プログラマーAI / リサーチAI | Prompt / Context | Result |
| 7 | External Connector | リサーチAI | Query | Evidence |
| 8 | Check | QA AI / セキュリティAI | Result / Evidence | Decision / Error |
| 9 | Aggregate | 開発リーダーAI | Result / Evidence / Decision | Artifact |
| 10 | Output | 人間 / 記録AI | Artifact | Artifact |
| 11 | Run Log | 記録AI | Log | Log |
| 12 | Template Save | 記録AI | Artifact / Log / Metric | Template |

### 5.6 受け入れ基準

| ID | 条件 |
|---|---|
| UI01-AC-01 | 12個のMVPノードがキャンバスに表示される |
| UI01-AC-02 | ノードクリックでInspectorが更新される |
| UI01-AC-03 | 実行ボタンでノード状態が順番に変化する |
| UI01-AC-04 | 実行ログが下部に追加される |
| UI01-AC-05 | トークン量、コスト、遅延、詰まりが表示される |
| UI01-AC-06 | 型不一致接続のエラー理由が表示される |

---

## 6. UI-02 全部品ライブラリ 詳細設計

### 6.1 画面目的

利用可能な部品を検索、分類、確認し、キャンバスへ追加する。
MVPでは全412部品相当を実装しないが、分類構造は最終仕様と揃える。

### 6.2 部品カテゴリ

| カテゴリ | MVP表示 | 説明 |
|---|---:|---|
| 起点 | 必須 | 手動起動、Webhook、定期実行など |
| 入力 | 必須 | テキスト、ファイル、URLなど |
| 整形 | 必須 | 正規化、抽出、構造化など |
| 分岐 | 必須 | 条件分岐、ルーティング、比率制御など |
| 実行 | 必須 | AI、外部API、CLIなど |
| 検査 | 必須 | 品質、安全、整合性など |
| 集約 | 必須 | マージ、比較、統合など |
| 出力 | 必須 | Markdown、JSON、Diff、画像など |
| 記録 | 必須 | ログ、履歴、実行結果保存など |
| 観測 | 必須 | トークン、コスト、遅延、成功率など |
| 改善 | 準必須 | Retry、Error Route、再ルーティングなど |
| テンプレ | 必須 | テンプレ保存、レシピ化など |
| 外部接続 | 準必須 | Codex、Hermes、GitHub、Driveなど |
| AIエージェント | 準必須 | 役割別AI |
| 権限・安全 | 準必須 | Credential、承認、危険操作制限など |

### 6.3 部品カード仕様

| 表示項目 | 内容 |
|---|---|
| Icon | 部品種別アイコン |
| Name | 部品名 |
| Category | 所属カテゴリ |
| Summary | 1行説明 |
| Input Types | 受け取れる型 |
| Output Types | 出せる型 |
| Risk Badge | safe / caution / dangerous |
| MVP Badge | MVP対象かどうか |
| Agent Badge | 推奨担当AI |

### 6.4 検索・フィルタ

| 条件 | 内容 |
|---|---|
| keyword | 名前・説明・型から検索 |
| category | カテゴリ絞り込み |
| data type | 入出力型で絞り込み |
| risk | 危険度で絞り込み |
| agent role | 担当AIで絞り込み |
| mvp only | MVP部品のみ表示 |

---

## 7. UI-03 入力・収集 詳細設計

### 7.1 画面目的

ワークフローの材料となる入力源を管理し、入力データの形式、取得状態、信頼度、重複、正規化結果を確認する。

### 7.2 画面構成

| 領域 | 内容 |
|---|---|
| Source List | 入力ソース一覧 |
| Source Detail | 選択ソースの設定 |
| Preview Table | 取得データのプレビュー |
| Normalize Mapping | フィールド変換・正規化 |
| Source Quality | 信頼度、重複、欠損、取得失敗 |

### 7.3 MVP入力ソース

| 入力ソース | MVP扱い | 入力 | 出力 |
|---|---:|---|---|
| Manual Text | 必須 | Text | Text |
| File Upload | 必須 | File | File / Text |
| URL Fetch | 任意 | URL | Text / Evidence |
| Local Markdown | 任意 | File | Markdown / Text |
| Mock X Search | 任意 | Query | Post[] / Evidence |
| Mock GitHub Issue | 任意 | Issue ID | Issue / Context |

MVPでは外部APIを実行せず、モックデータまたは手動貼り付けで代替できる。

### 7.4 入力データ状態

| 状態 | 意味 |
|---|---|
| empty | 未入力 |
| loaded | 読み込み完了 |
| normalized | 正規化完了 |
| duplicated | 重複あり |
| invalid | 形式不正 |
| blocked | 権限または安全上の理由で使用不可 |

---

## 8. UI-04 処理・制御フロー 詳細設計

### 8.1 画面目的

前処理、解析、分類、分岐、並列、リトライ、エラー処理を設計する。

### 8.2 制御部品

| 部品 | 役割 | MVP |
|---|---|---:|
| Normalize | 形式統一 | 必須 |
| Parser | JSON / CSV / Regex等の解析 | 任意 |
| Classifier | 意図、作業種別、危険度分類 | 任意 |
| Route | 作業種別ごとの分岐 | 必須 |
| Switch | 値による分岐 | 任意 |
| Parallel | 並列実行 | 任意 |
| Merge | 複数結果の統合 | 必須 |
| Retry | 失敗時の再試行 | 任意 |
| Error Route | 失敗経路 | 任意 |
| Ratio Splitter | 比率制御 | 準必須 |

### 8.3 ルーティング判定軸

| 判定軸 | 例 |
|---|---|
| 作業種別 | research / coding / design / qa / docs |
| 難易度 | light / normal / hard |
| リスク | safe / caution / dangerous |
| 出力種別 | markdown / json / diff / image / prompt |
| 担当AI | Codex / Hermes / Claude / Gemini / Human |
| 実行可否 | allowed / approval_required / blocked |

---

## 9. UI-05 成果物ステージ 詳細設計

### 9.1 画面目的

検査済みの結果を成果物として表示し、保存、コピー、エクスポート、承認、再作成へつなげる。

### 9.2 ステージタブ

| タブ | 内容 |
|---|---|
| Preview | 人間向け表示 |
| Markdown | Markdown出力 |
| JSON | 構造化出力 |
| Diff | コード差分 |
| Package | 複数成果物のまとめ |
| Review | 承認・却下・コメント |
| Publish | 外部出力設定。MVPではdisabled可 |

### 9.3 成果物状態

| 状態 | 意味 |
|---|---|
| draft | 生成直後 |
| checked | 検査済み |
| review_required | 人間確認待ち |
| approved | 承認済み |
| rejected | 却下 |
| exported | 保存・出力済み |
| failed | 生成失敗 |

### 9.4 安全ゲート

| 操作 | ゲート |
|---|---|
| Copy | 警告なしで可。ただし機密検知時は警告 |
| Export File | 保存先確認 |
| Publish | 人間承認必須 |
| Git操作 | ブランチ確認・diff確認必須 |
| Credentialを含む出力 | ブロック |
| API Keyらしき文字列 | ブロックまたは強警告 |

---

## 10. UI-06 部品設定・ブロック編集 詳細設計

### 10.1 画面目的

選択ノードの設定、入出力マッピング、プロンプト、実行条件、テスト、履歴を編集する。

### 10.2 Inspector基本構成

| セクション | 内容 |
|---|---|
| Header | ノード名、ID、種類、状態 |
| Description | 役割説明 |
| Ports | 入力型、出力型、接続状態 |
| Config | ノード固有設定 |
| Prompt | AI実行ノード用の指示テンプレート |
| Tools | 使用可能ツール |
| Memory / Context | 参照する文脈 |
| Security | 権限、危険操作、承認要否 |
| Test | サンプル入力とテスト実行 |
| Last Run | 前回結果、エラー、メトリクス |
| History | 設定変更履歴 |

### 10.3 Config入力部品

| 型 | UI |
|---|---|
| string | TextInput |
| long text | Textarea / CodeEditor |
| number | NumberInput |
| boolean | Switch |
| enum | Select |
| array | ListEditor |
| object | JSON Editor |
| secret | SecretInput / masked |
| file | FilePicker |
| prompt | PromptEditor |
| condition | ConditionBuilder |

### 10.4 テスト実行

| 項目 | 内容 |
|---|---|
| Test Input | サンプル入力 |
| Validate Config | 設定検証 |
| Run Mock | モック実行 |
| Show Output | 結果表示 |
| Show Logs | 実行ログ表示 |
| Show Metrics | トークン、コスト、遅延表示 |

---

## 11. UI-07 外部接続・AI連携 詳細設計

### 11.1 画面目的

外部AI、検索、ストレージ、Git、メール、Webhookなどの接続状態を管理する。

### 11.2 接続カード

| 表示項目 | 内容 |
|---|---|
| Service Name | Codex, Hermes, Claude, Gemini, GitHub等 |
| Category | AI / Search / Storage / Git / Mail / Webhook |
| Status | connected / warning / disconnected / disabled |
| Auth Type | OAuth / API Key / Local CLI / None / Mock |
| Rate Limit | 表示例。MVPでは実値未確定として扱う |
| Latency | 直近テスト応答時間 |
| Last Test | 最終接続テスト時刻 |
| Risk | safe / caution / dangerous |

### 11.3 MVPでの扱い

MVPでは、外部接続は実APIを呼ばず、以下を実装する。

| 機能 | MVP仕様 |
|---|---|
| 接続一覧 | モックカード表示 |
| 接続テスト | モック成功 / 失敗を返す |
| Credential入力 | 入力UIのみ。保存はしない、またはローカル保存禁止 |
| Rate Limit | 表示枠のみ |
| Service Logs | モックログ |

---

## 12. UI-08 観測メーター・実行監視 詳細設計

### 12.1 画面目的

実行中または完了済みのワークフローについて、状態、進捗、詰まり、コスト、トークン、ログを確認する。

### 12.2 メーター

| メーター | 内容 | MVP |
|---|---|---:|
| Total Tokens | 入出力トークン推定 | 必須 |
| Estimated Cost | コスト推定 | 必須 |
| Latency | 実行時間 / 推定遅延 | 必須 |
| Success Rate | 成功率 | 必須 |
| Queue Count | 待機数 | 必須 |
| Retry Count | 再試行数 | 必須 |
| Bottleneck Node | 詰まりノード | 必須 |
| Error Rate | エラー率 | 任意 |
| Parallelism | 並列度 | 任意 |
| Resource Load | CPU/GPU/LLM負荷 | 任意 |

### 12.3 ログ分類

| レベル | 表示 |
|---|---|
| info | 通常ログ |
| warn | 警告 |
| error | エラー |
| security | 安全関連 |
| approval | 承認関連 |
| metric | メトリクス変化 |

### 12.4 詰まり判定

MVPでは以下の単純ロジックでよい。

```text
bottleneckScore = estimatedLatencyMs + retryCount * 1000 + errorCount * 3000
```

最も score が高いノードを `bottleneck node` として表示する。

---

## 13. UI-09 回収・評価・再作成 詳細設計

### 13.1 画面目的

出力結果を評価し、PASS / REVIEW / FAIL を判定し、必要に応じて再作成・改善・差分比較を行う。

### 13.2 評価要素

| 要素 | 内容 |
|---|---|
| Evaluation Summary | 総合評価 |
| Score | 品質スコア。MVPではモック |
| Status | PASS / REVIEW / FAIL |
| Acceptance Criteria | 受け入れ基準 |
| Diff Viewer | 前回との差分 |
| Human Review | 人間コメント、承認、却下 |
| Retry Plan | 再実行案 |
| Improvement Prompt | 改善指示案 |

### 13.3 評価ステータス

| 状態 | 意味 | 次アクション |
|---|---|---|
| PASS | 問題なし | テンプレ保存へ進む |
| REVIEW | 人間確認が必要 | Human Reviewへ進む |
| FAIL | 不合格 | 再作成・作り直しへ進む |

---

## 14. UI-10 一周後の強化状態 詳細設計

### 14.1 画面目的

実行サイクルから得た成功・失敗・改善結果を、テンプレート、レシピ、ナレッジ、部品改善案として保存する。

### 14.2 表示要素

| 要素 | 内容 |
|---|---|
| Cycle Summary | 今回の実行サイクル結果 |
| Template Candidates | 保存候補テンプレート |
| Reusable Components | 再利用可能部品 |
| Knowledge Cards | ナレッジ化された知見 |
| Failure Patterns | 失敗パターン |
| Next Best Actions | 次に適用すべき改善案 |
| Apply Suggestions | 改善案の適用 |

### 14.3 強化の範囲

本仕様での「強化」は、基盤LLMの重み更新ではなく、以下を指す。

| 強化対象 | 内容 |
|---|---|
| Prompt Template | プロンプトの改善 |
| Workflow Template | ワークフロー構造の保存 |
| Routing Rule | 分岐条件の改善 |
| Component Config | ノード設定の改善 |
| Knowledge Base | 参照知識の蓄積 |
| Run Recipe | 実行手順の保存 |

---

## 15. 共通UIコンポーネント詳細設計

### 15.1 Canvas

| 項目 | 仕様 |
|---|---|
| 役割 | ノードと接続線を配置する作業空間 |
| 状態 | zoom, pan, selectedNodeId, selectedEdgeId, viewport |
| 操作 | pan, zoom, drag node, select, multi-select, fit view |
| MVP | 固定サンプルワークフロー表示でも可 |

### 15.2 PartsPalette

| 項目 | 仕様 |
|---|---|
| 役割 | 部品を探して追加する |
| 状態 | category, searchQuery, filters |
| 操作 | search, filter, click, drag |
| MVP | 12個のMVP部品を表示 |

### 15.3 NodeCard

| 項目 | 仕様 |
|---|---|
| 役割 | 1つの処理単位を表示 |
| 表示 | title, type, status, agent, metrics, ports |
| 状態 | idle / running / success / failed / review_required |
| 操作 | select, open detail, run from here |

### 15.4 Port

| 項目 | 仕様 |
|---|---|
| 役割 | ノードの入力口 / 出力口 |
| 表示 | port name, data type, required |
| 操作 | connect, disconnect |
| 検証 | output type と input type の互換性を確認 |

### 15.5 Edge

| 項目 | 仕様 |
|---|---|
| 役割 | ノード間の流れを表す |
| 線種 | data / instruction / result / decision / evidence / log / error / retry / approval / resource / template / improvement |
| 表示 | kind, carries, status, metric |
| 操作 | select, delete, inspect |

### 15.6 Inspector

| 項目 | 仕様 |
|---|---|
| 役割 | 選択対象の詳細編集 |
| 対象 | node / edge / workflow / run |
| MVP | node inspector を優先 |

### 15.7 BottomMetricsBar

| 項目 | 仕様 |
|---|---|
| 役割 | 実行メトリクスの常時表示 |
| 表示 | tokens, cost, latency, success rate, queue, retry, bottleneck |
| MVP | モック値で実装可 |

### 15.8 StagePreview

| 項目 | 仕様 |
|---|---|
| 役割 | 実行結果 / 成果物表示 |
| 表示形式 | preview / markdown / json / diff / logs |
| 操作 | copy, download, approve, reject |

---

## 16. 状態設計

### 16.1 Workflow Status

| 状態 | 意味 |
|---|---|
| draft | 未保存 |
| ready | 実行可能 |
| invalid | 接続や設定に問題あり |
| running | 実行中 |
| paused | 一時停止 |
| success | 成功 |
| failed | 失敗 |
| review_required | 人間確認待ち |
| archived | アーカイブ済み |

### 16.2 Node Status

| 状態 | 表示 | 意味 |
|---|---|---|
| idle | Neutral | 未実行 |
| queued | Waiting | 実行待ち |
| running | Spinner | 実行中 |
| success | Check | 成功 |
| failed | Error | 失敗 |
| skipped | Muted | 条件により未実行 |
| review_required | Warning | 人間確認待ち |
| blocked | Lock | 権限・安全により停止 |

### 16.3 Edge Status

| 状態 | 意味 |
|---|---|
| inactive | まだ流れていない |
| active | 実行中に流れている |
| success | 正常完了 |
| failed | 接続先で失敗 |
| invalid | 型不一致または接続不可 |
| throttled | 流量制限中 |

---

## 17. データ型・接続設計

### 17.1 データ型

| 型 | 用途 |
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

### 17.2 接続線

| 線種 | 流れるもの |
|---|---|
| data | 入力・ファイル・本文 |
| instruction | プロンプト・命令 |
| result | AI出力・成果物 |
| decision | 分岐条件・リスク判定 |
| evidence | URL・引用・根拠 |
| log | 実行履歴 |
| error | 失敗情報 |
| retry | Retry経路 |
| approval | 人間確認 |
| resource | トークン・時間・コスト・負荷 |
| template | 保存・再利用 |
| improvement | 観測から改善へ戻す |

### 17.3 MVP接続ルール

| From | To | 許可型 |
|---|---|---|
| Manual Trigger | Text Input | instruction |
| Text Input | Normalize | Text |
| File Input | Normalize | File |
| Normalize | Route | Context |
| Route | AI Execute | Decision / Context |
| AI Execute | Check | Result |
| External Connector | Check | Evidence |
| Check | Aggregate | Decision / Error |
| Aggregate | Output | Artifact |
| Output | Run Log | Log |
| Run Log | Template Save | Log |
| Bottom Metrics | Template Save | Metric |

---

## 18. AIエージェント表示設計

### 18.1 役割一覧

| 役割 | 画面上の表示名 | 主な担当 |
|---|---|---|
| 人間 | Human | 入力、承認、最終判断 |
| 開発リーダーAI | Dev Leader AI | 方針、優先順位、最終判断補助 |
| 開発サブリーダーAI | Sub Leader AI | タスク分解、レビュー、統合 |
| プログラマーAI | Programmer AI | 実装、修正、テスト |
| デザイナーAI | Designer AI | UI/UX、画面設計、情報設計 |
| リサーチAI | Research AI | 調査、X検索、外部情報収集 |
| QA AI | QA AI | 仕様照合、品質確認 |
| セキュリティAI | Security AI | 危険操作、機密情報、公開前確認 |
| 記録AI | Recorder AI | ログ、テンプレ、ナレッジ化 |
| 軽作業AI | Lightwork AI | 整形、分類、単純処理 |

### 18.2 表示仕様

| 表示 | 内容 |
|---|---|
| Agent Badge | ノード右上に担当AIを表示 |
| Role Filter | 部品ライブラリで担当AI別フィルタ |
| Run Timeline | 実行した担当AIをログに残す |
| Inspector | 推奨担当AI、実行AI、権限を表示 |
| Warning | 担当外の危険操作は警告 |

---

## 19. デザインシステム詳細

### 19.1 視覚方針

| 項目 | 方針 |
|---|---|
| 全体 | モダン、フラット、情報密度高め、設計資料的 |
| 背景 | 明るいグレーまたは白ベース |
| ノード | 角丸カード、状態色、控えめな影 |
| 線 | 線種と状態で区別 |
| 文字 | 小さすぎない。最低12px以上 |
| 余白 | 装飾的な余白ではなく、読みやすさのための余白 |
| 情報量 | 営業資料ではなく、実装者が迷わない密度 |

### 19.2 状態色の意味

| 状態 | 意味 |
|---|---|
| neutral | 未実行、通常 |
| blue | 実行中、選択中 |
| green | 成功、承認済み |
| yellow | 注意、確認待ち |
| red | 失敗、危険、ブロック |
| purple | AI / テンプレ / 改善 |
| gray | disabled / skipped |

色名は実装時のデザイントークンに変換する。

### 19.3 レスポンシブ方針

このアプリはデスクトップ前提である。
スマホ最適化はMVP外とする。

| 幅 | 方針 |
|---|---|
| 1440px以上 | 標準3ペイン + 下部メーター |
| 1024〜1439px | 左右ペインを折りたたみ可能 |
| 768〜1023px | 読み取り専用に近い簡易表示 |
| 767px以下 | MVP対象外。警告表示または閲覧専用 |

---

## 20. フロントエンド実装用データ構造

### 20.1 WorkflowNode

```ts
type WorkflowNodeStatus =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "review_required"
  | "blocked";

type WorkflowDataType =
  | "Text"
  | "URL"
  | "File"
  | "Markdown"
  | "PDF"
  | "Image"
  | "Audio"
  | "Issue"
  | "PR"
  | "Diff"
  | "Post"
  | "Email"
  | "Prompt"
  | "Context"
  | "Result"
  | "Evidence"
  | "Decision"
  | "Artifact"
  | "Log"
  | "Template"
  | "Metric"
  | "Error";

type ConnectionKind =
  | "data"
  | "instruction"
  | "result"
  | "decision"
  | "evidence"
  | "log"
  | "error"
  | "retry"
  | "approval"
  | "resource"
  | "template"
  | "improvement";

type AgentRole =
  | "human"
  | "dev_leader_ai"
  | "sub_leader_ai"
  | "programmer_ai"
  | "designer_ai"
  | "research_ai"
  | "qa_ai"
  | "security_ai"
  | "recorder_ai"
  | "lightwork_ai";

type WorkflowNode = {
  id: string;
  type: string;
  title: string;
  category: string;
  status: WorkflowNodeStatus;
  agentRole?: AgentRole;
  inputTypes: WorkflowDataType[];
  outputTypes: WorkflowDataType[];
  config: Record<string, unknown>;
  position: { x: number; y: number };
  metrics?: {
    estimatedTokens?: number;
    estimatedCost?: number;
    estimatedLatencyMs?: number;
    bottleneckScore?: number;
    retryCount?: number;
  };
  lastRun?: {
    startedAt?: string;
    finishedAt?: string;
    result?: unknown;
    error?: string;
  };
};
```

### 20.2 WorkflowConnection

```ts
type WorkflowConnection = {
  id: string;
  sourceNodeId: string;
  sourcePort?: string;
  targetNodeId: string;
  targetPort?: string;
  kind: ConnectionKind;
  carries: WorkflowDataType[];
  status: "inactive" | "active" | "success" | "failed" | "invalid" | "throttled";
  metrics?: {
    flowRate?: number;
    tokens?: number;
    latencyMs?: number;
  };
};
```

### 20.3 WorkflowRunLog

```ts
type WorkflowRunLog = {
  id: string;
  runId: string;
  timestamp: string;
  nodeId?: string;
  level: "info" | "warn" | "error" | "security" | "approval" | "metric";
  message: string;
  payload?: unknown;
};
```

---

## 21. MVP実装タスク分解

### 21.1 Phase 1: UI骨格

| タスク | 成果物 |
|---|---|
| AppShell作成 | Top/Left/Center/Right/Bottomの基本レイアウト |
| Navigation作成 | 主要画面切替 |
| Design tokens作成 | 状態色、余白、フォントサイズ |
| Mock data作成 | サンプルワークフロー、ノード、接続、ログ |

### 21.2 Phase 2: キャンバス

| タスク | 成果物 |
|---|---|
| NodeCard実装 | ノード表示 |
| Edge表示 | 接続線表示 |
| Select実装 | 選択状態 |
| Inspector連動 | 選択ノード詳細表示 |
| Canvas操作 | pan / zoom は簡易でも可 |

### 21.3 Phase 3: 実行シミュレーション

| タスク | 成果物 |
|---|---|
| Run button | 実行開始 |
| Node status update | running→success/failed |
| Logs追加 | 実行ログ |
| Metrics更新 | tokens/cost/latency/bottleneck |
| Stage出力 | Artifact表示 |

### 21.4 Phase 4: 部品ライブラリ・設定

| タスク | 成果物 |
|---|---|
| PartsPalette | 12部品表示 |
| 部品検索 | keyword検索 |
| Inspector編集 | title/config編集 |
| 接続検証 | type validation |

### 21.5 Phase 5: 評価・テンプレ化

| タスク | 成果物 |
|---|---|
| Check結果表示 | PASS/REVIEW/FAIL |
| Template Save mock | テンプレ保存結果 |
| Evaluation panel | 評価と再作成候補 |
| Docs更新 | 仕様とMVP外の明記 |

---

## 22. 受け入れ基準一覧

| ID | 条件 |
|---|---|
| AC-001 | アプリ起動時にメインキャンバスが表示される |
| AC-002 | 12個のMVP部品が部品パレットに表示される |
| AC-003 | サンプルワークフローがノードと接続線で表示される |
| AC-004 | ノードを選ぶとInspectorが更新される |
| AC-005 | 実行ボタンで擬似実行が始まる |
| AC-006 | 実行中ノードがrunning表示になる |
| AC-007 | 完了ノードがsuccessまたはfailed表示になる |
| AC-008 | 実行ログが追加される |
| AC-009 | 下部メーターにtokens/cost/latency/success/bottleneckが表示される |
| AC-010 | 出力ステージにArtifactが表示される |
| AC-011 | CheckノードがPASS/REVIEW/FAIL相当の結果を表示する |
| AC-012 | Template Saveがモック保存結果を表示する |
| AC-013 | 型不一致接続を検出できる |
| AC-014 | 外部API未接続であることがUIまたはdocsに明記される |
| AC-015 | 実装済み範囲とMVP外範囲がREADMEまたはdocsに明記される |

---

## 23. MVP外として明確に除外するもの

| 項目 | 理由 |
|---|---|
| 実API接続 | 認証・課金・安全の未確定が大きい |
| Credential永続保存 | セキュリティ設計が必要 |
| 本物のX検索 / Web検索 | 外部接続仕様が必要 |
| Git push / PR作成 | 危険操作のため承認設計後 |
| DB物理設計 | まずUI・状態設計を優先 |
| マルチユーザーRBAC | 権限マトリクス未確定 |
| モデル自動選択の本実装 | API/契約/制限の扱いが未確定 |
| Fine-tuning | 本仕様の「強化」とは別物 |
| スマホUI最適化 | デスクトップ前提のため |
| 完全なドラッグ接続 | MVPでは固定サンプル + 検証関数でも可 |

---

## 24. Codexに渡す実装指示の要点

```markdown
# Goal
AI Workflow Lab の詳細画面設計に基づき、MVP画面を実装してください。

# Priority
1. AppShell
2. Main Canvas
3. Parts Palette
4. Node Inspector
5. Bottom Metrics Bar
6. Run Simulator
7. Stage Preview
8. Docs update

# Do Not
- 実API接続しない
- Credentialを保存しない
- main/developに直接pushしない
- git add . を無断使用しない
- 既存UIを全面破壊しない

# Acceptance
- 12個のMVP部品が表示される
- サンプルワークフローが表示される
- 実行ボタンで状態・ログ・メトリクス・出力が変化する
- Inspectorがノード選択と連動する
- 型付き接続検証関数がある
- 実API未接続であることをdocsに明記する
```

---

## 25. 次に作るべき資料

| 順序 | 資料名 | 目的 |
|---:|---|---|
| 1 | 画面ワイヤーフレーム集 | 10画面の見た目を固定する |
| 2 | UIコンポーネントカタログ | React/Tauri実装単位を固定する |
| 3 | 状態遷移図 | 実行、失敗、承認、再作成の遷移を固定する |
| 4 | 型付き接続マトリクス | 接続可能 / 不可能を固定する |
| 5 | Codex実装プロンプト | 実装エージェントへ渡す |
| 6 | QAチェックリスト | 実装後の確認観点を固定する |
