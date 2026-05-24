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
Phase 6 のテンプレート再利用UXは `docs/implementation/TEMPLATE_REUSE_UX_MVP.md` に整理しています。
Phase 7 の React Flow Canvas MVP は `docs/implementation/REACT_FLOW_CANVAS_MVP.md` に整理しています。
Phase 7.2 の React Flow Canvas 操作性改善は `docs/implementation/REACT_FLOW_CANVAS_USABILITY.md` に整理しています。
Phase 7.1 の Undo / Redo 方針は `docs/implementation/UNDO_REDO_POLICY.md` に整理しています。

## 開始手順

```bash
npm install
npm run dev
npm run build
npm run lint
```

## 現在フェーズ

現在は Phase 7.2 の React Flow Canvas 操作性改善まで実装しています。

- `useReducer` ベースの workflow state
- Inspector 編集
- JSON import / export
- 接続検証と接続作成 / 削除
- localStorage によるテンプレート保存と履歴保存
- テンプレート metadata（タグ / カテゴリ / Port要約 / 評価要約 / ArtifactVersion要約）
- テンプレート検索 / 詳細プレビュー / 安全確認付き読込 / 複製
- 実行グラフ（review / fail / retry のローカルモック導線）
- ローカル評価エンジン（7基準・100点満点）
- Human Review（承認 / 却下 / 修正依頼 / スキップ）
- 再作成リクエストとモック実行
- 成果物バージョン履歴
- **ポートモデル**（id / direction / dataType / required / optional の明示的なポートオブジェクト）
- **ポートベース接続検証**（ポートID存在チェック・型互換チェック）
- **Canvas表示モード切替**（標準 / React Flow、localStorage保存）
- **React Flow Canvas MVP**（Port Handle 表示、ドラッグ接続、Edge 削除、Inspector 選択連動、ノード位置保存、位置リセット）
- **React Flow Canvas 操作性改善**（操作ヘルプ、Edge 詳細、削除確認、無効接続理由表示、Delete キー案内、Port 視認性改善）
- **Undo / Redo 方針整理**（実装はまだ行わず、Phase 7.1 では方針文書化のみ）
- 旧 inputTypes / outputTypes との後方互換
- 日本語優先 UI / ドキュメント

## 現在のMVP範囲

- React + TypeScript + Vite によるアプリ基盤
- TopBar、左パレット、メインキャンバス、右インスペクター、下部モニター、成果物ステージ
- 12個のMVPノード表示
- 最小限のドメイン型、サンプルワークフロー、接続ルール、ボトルネック算出
- 既存 `WorkflowCanvas` と共存する `ReactFlowCanvas`
- localStorage による Canvas 表示モード保存
- localStorage による React Flow ノード位置保存と位置リセット
- React Flow Canvas 上の操作ヘルプ、接続詳細、無効接続理由表示
- ローカルモック実行、ExecutionGraph、実行タイムライン
- review / error / retry / skip の可視化
- localStorage によるテンプレート保存、検索、プレビュー、複製とワークフロー履歴保存

## 外部APIの扱い

実際の外部API接続はまだ行っていません。Codex、Hermes、Grok/X、Claude、Gemini、GitHub などは、
将来的な接続先やロールの概念としてのみ表現しています。`Run` ボタンはローカルモックシミュレーターを実行します。

Human Review も現時点ではローカル状態だけで扱うモック導線です。承認や差し戻しの永続化は行っていません。

## MVP外

- 実API呼び出し
- Credential 保存
- Tauri、SQLite、本番DB
- React Flow 全面移行
- 本格 Undo / Redo
- ノード削除
- 自動レイアウト、複雑なEdge編集、DnDノード追加
- 非同期ジョブエンジン化
- Human Review の永続化

## 次の実装順候補

1. Phase 7.3 候補として React Flow Canvas の接続編集拡張とノード追加導線を検討する
2. 実行グラフと評価結果を結びつけた差分表示を追加する
3. テンプレート version / metadata 編集を追加する
4. UIモデルが安定した後に Tauri 2 と永続ローカル保存を再評価する
5. 必要になった場合のみ共有・同期系ストレージを検討する
