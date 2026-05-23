# Agent Workflow Studio

Agent Workflow Studio は、AI 作業を型付きワークフローノードとして設計・実行・観測・再利用するための
ローカルファーストな React アプリです。既存の `ai-workflow-lab` とは別リポジトリ・別製品として扱い、
添付された AI Workflow Lab 文書は参照仕様として保持します。

## 参照仕様

原文仕様は要約や改変をせず、そのまま `docs/source-specs/` に保存しています。

- `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md`
- `docs/source-specs/AI_Workflow_Lab_画面設計_詳細設計以降_v1.0.md`

現在実装と画面設計の対応は `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` で管理しています。
Phase 3 の実行グラフMVPは `docs/implementation/EXECUTION_GRAPH_MVP.md` に整理しています。
Phase 5 のポートモデルMVPは `docs/implementation/PORT_MODEL_MVP.md` に整理しています。

## 開始手順

```bash
npm install
npm run dev
npm run build
npm run lint
```

## 現在フェーズ

現在は Phase 5 のポートモデルと接続検証強化のMVPまで実装しています。

- `useReducer` ベースの workflow state
- Inspector 編集
- JSON import / export
- 接続検証と接続作成 / 削除
- localStorage によるテンプレート保存と履歴保存
- 実行グラフ（review / fail / retry のローカルモック導線）
- ローカル評価エンジン（7基準・100点満点）
- Human Review（承認 / 却下 / 修正依頼 / スキップ）
- 再作成リクエストとモック実行
- 成果物バージョン履歴
- **ポートモデル**（id / direction / dataType / required / optional の明示的なポートオブジェクト）
- **ポートベース接続検証**（ポートID存在チェック・型互換チェック）
- 旧 inputTypes / outputTypes との後方互換
- 日本語優先 UI / ドキュメント

## 現在のMVP範囲

- React + TypeScript + Vite によるアプリ基盤
- TopBar、左パレット、メインキャンバス、右インスペクター、下部モニター、成果物ステージ
- 12個のMVPノード表示
- 最小限のドメイン型、サンプルワークフロー、接続ルール、ボトルネック算出
- ローカルモック実行、ExecutionGraph、実行タイムライン
- review / error / retry / skip の可視化
- localStorage によるテンプレート保存とワークフロー履歴保存

## 外部APIの扱い

実際の外部API接続はまだ行っていません。Codex、Hermes、Grok/X、Claude、Gemini、GitHub などは、
将来的な接続先やロールの概念としてのみ表現しています。`Run` ボタンはローカルモックシミュレーターを実行します。

Human Review も現時点ではローカル状態だけで扱うモック導線です。承認や差し戻しの永続化は行っていません。

## MVP外

- 実API呼び出し
- Credential 保存
- Tauri、SQLite、React Flow、本番DB
- 本格的なドラッグ接続ライブラリ
- 非同期ジョブエンジン化
- Human Review の永続化

## 次の実装順候補

1. Phase 4 として評価・再作成・Human Review を強化する
2. required / optional を持つ明示的なポートオブジェクトへ進める
3. 実行グラフと評価結果を結びつけた差分表示を追加する
4. テンプレートのメタデータと再利用導線を広げる
5. UIモデルが安定した後に Tauri 2 と永続ローカル保存を再評価する
