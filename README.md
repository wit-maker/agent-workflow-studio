# Agent Workflow Studio

Agent Workflow Studio は、AI作業を型付きワークフローノードとして設計・実行・観測・再利用するための
ローカルファーストな React アプリです。既存の `ai-workflow-lab` とは別リポジトリ・別製品として扱い、
添付された AI Workflow Lab の文書は参照仕様として保持します。

## 参照仕様

原文仕様は要約や改変をせず、そのまま `docs/source-specs/` に保存しています。

- `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md`
- `docs/source-specs/AI_Workflow_Lab_画面設計_詳細設計以降_v1.0.md`

現在実装と画面設計の対応は `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` で管理しています。

## 開始手順

```bash
npm install
npm run dev
npm run build
npm run lint
```

## 現在フェーズ

現在は Phase 2.5 の日本語化専用フェーズまで完了しています。`useReducer` ベースの状態管理、
Inspector 編集、JSON import/export、接続検証、選択式の接続編集、localStorage によるテンプレート保存、
ワークフロー履歴保存に加え、ユーザー向け UI と主要ドキュメントを日本語優先に整えています。

## 現在のMVP範囲

- React + TypeScript + Vite によるアプリ基盤
- TopBar、左パレット、メインキャンバス、右インスペクター、下部モニター、成果物ステージ
- 12個のMVPノード表示
- 最小限のドメイン型、サンプルワークフロー、接続ルール、ボトルネック算出、ローカルモック実行
- トークン、コスト、レイテンシ、成功率、ログ、成果物、接続検証の表示
- 選択式の接続作成・削除
- localStorage によるテンプレート保存とワークフロー履歴保存

## 外部APIの扱い

実際の外部API接続はまだ行っていません。Codex、Hermes、Grok/X、Claude、Gemini、GitHub などは、
将来的な接続先やロールの概念としてのみ表現しています。`Run` ボタンはローカルモックシミュレーターを実行します。

## MVP外

- 実API呼び出し
- Credential 保存
- Tauri、SQLite、React Flow、本番DB
- 本格的なドラッグ接続ライブラリ
- 本番向けセキュリティゲートや公開フロー

## 次の実装順候補

1. Phase 3 として実行グラフ、エラールート、リトライ経路を追加する
2. required / optional を持つ明示的なポートオブジェクトへ進める
3. 評価フローとレビュー導線を強化する
4. テンプレートのメタデータと再利用導線を広げる
5. UIモデルが安定した後に Tauri 2 と永続ローカル保存を再評価する
