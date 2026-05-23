# Project State

Last updated: 2026-05-23

## Current Phase

Phase 4 完了 — 評価・再作成・Human Review 強化フェーズ。

## Completed

- `agent-workflow-studio` のローカルリポジトリを作成した。
- React + TypeScript + Vite のアプリ基盤を構築した。
- AI Workflow Lab の参照仕様を `docs/source-specs/` に取り込んだ。
- プロジェクト方針、アーキテクチャメモ、MVP範囲、README を追加した。
- 最小限のドメイン型、サンプルワークフロー、接続検証、ボトルネック計算を追加した。
- TopBar、PartsPalette、WorkflowCanvas、Inspector、StagePreview、BottomMonitor のUI骨格を追加した。
- ローカルモック実行によるノード状態、ログ、メトリクス、PASS / REVIEW、成果物表示を追加した。
- `useReducer` ベースの workflow state 管理を追加した。
- Inspector で title、description、agent role、config JSON を編集可能にした。
- Workflow JSON export / import と最低限の検証を追加した。
- BottomMonitor を ログ / メトリクス / キュー / 出力 タブへ分離した。
- StagePreview を プレビュー / Markdown / JSON タブへ分離した。
- Canvas と Inspector に接続検証表示を追加した。
- ポート単位の接続表示と、選択式の接続作成 / 削除を追加した。
- localStorage によるテンプレート保存 / 読込 / 削除モックを追加した。
- localStorage によるワークフロー履歴保存 / 読込 / 削除を追加した。
- import 検証を connection endpoint と artifact content まで強化した。
- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` を追加し、画面仕様との対応表を作成した。
- Phase 2.5 として、UI表示文言を日本語優先へ整えた。
- Phase 4: 成果物評価 (EvaluationPanel) を追加した。
- Phase 4: Human Review (HumanReviewPanel) 承認 / 却下 / 修正依頼 / スキップを追加した。
- Phase 4: 再作成モック (RebuildPanel) を追加した。
- Phase 4: 成果物バージョン履歴 (ArtifactVersionHistory) を追加した。
- Phase 4: 実行グラフパネル (ExecutionGraphPanel) を追加した。
- Phase 4: BottomMonitor に 実行グラフ / 評価 タブを追加した。
- Phase 4: StagePreview に評価ステータス・HR状態・バージョン件数を表示した。
- Phase 4: ローカルモック評価ロジック (evaluationRules.ts) を実装した。
- Phase 4: displayLabels に評価・レビュー・再作成・実行グラフのラベルを追加した。

## Phase 4 実装範囲

### 評価
- `src/domain/evaluation.ts` — 評価ドメイン型
- `src/domain/evaluationRules.ts` — ローカルモック評価ロジック (7基準)
- `src/components/EvaluationPanel.tsx` — 評価結果表示 + 評価実行ボタン
- スコア: 90点以上=合格 / 70〜89=要確認 / 69以下=不合格

### Human Review
- `src/components/HumanReviewPanel.tsx` — 承認 / 却下 / 修正依頼 / スキップ
- 修正依頼時に再作成フォームを表示し RebuildRequest を作成

### 再作成
- `src/components/RebuildPanel.tsx` — RebuildRequest 一覧 + 再作成実行
- 再作成後に ArtifactVersion が追加される

### バージョン履歴
- `src/components/ArtifactVersionHistory.tsx` — バージョン一覧 + 版の切り替え

### 実行グラフ
- `src/domain/executionGraph.ts` — ExecutionGraph ドメイン型
- `src/components/ExecutionGraphPanel.tsx` — 実行ステップ・経路一覧表示

## 英語のまま残すもの

- TypeScript の型名
- 変数名、関数名
- ファイル名、ディレクトリ名
- npm script
- branch名
- JSON key
- internal enum value

## Not Implemented Yet

- 実外部 API 接続
- Credential 保存
- Tauri デスクトップ化
- ノード作成のドラッグ操作
- 接続編集のドラッグ操作
- 評価結果の localStorage 永続化
- 再作成後の自動再評価
- 成果物バージョンの diff 表示
- SQLite / Web Worker
- React Flow

## 次フェーズ候補

- 評価結果の永続化と実行グラフとの深い統合
- 再作成後の自動評価トリガー
- Human Review 多段承認
- 成果物バージョン間の diff ビュー
- 実 API 接続 (Claude API / OpenAI)
