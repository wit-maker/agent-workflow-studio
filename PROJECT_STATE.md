# Project State

Last updated: 2026-05-24

## Current Phase

Phase 7.1 React Flow Canvas 安定化MVP。

## Completed

- `agent-workflow-studio` のローカルリポジトリを作成した。
- React + TypeScript + Vite のアプリ基盤を構築した。
- AI Workflow Lab の参照仕様を `docs/source-specs/` に取り込んだ。
- プロジェクト方針、アーキテクチャメモ、MVP範囲、README を追加した。
- 最小限のドメイン型、サンプルワークフロー、接続検証、ボトルネック計算を追加した。
- TopBar、PartsPalette、WorkflowCanvas、Inspector、StagePreview、BottomMonitor のUI骨格を追加した。
- `useReducer` ベースの workflow state 管理を追加した。
- Inspector で title、description、agent role、config JSON を編集可能にした。
- Workflow JSON export / import と最低限の検証を追加した。
- BottomMonitor をログ / メトリクス / キュー / 出力へ分離した。
- StagePreview をプレビュー / Markdown / JSON へ分離した。
- Canvas と Inspector に接続検証表示を追加した。
- ポート単位の接続表示と、選択式の接続作成 / 削除を追加した。
- localStorage によるテンプレート保存 / 読込 / 削除モックを追加した。
- localStorage によるワークフロー履歴保存 / 読込 / 削除を追加した。
- `AGENTS.md` をコスト・性能バランス型のモデル運用へ更新した。
- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` を追加し、画面仕様との対応表を作成した。
- Phase 2.5 として、UI表示文言、ログ文言、バリデーション文言、主要ドキュメントを日本語優先へ整えた。
- Phase 3 として、ExecutionGraph 型、実行ステップ履歴、review / error / retry / skip route の可視化を追加した。
- BottomMonitor に確認待ち操作、再試行操作、実行グラフ表示を追加した。
- StagePreview に executionGraph summary を追加した。
- Check ノードを `node.type === 'check'` ベースで判定するよう維持した。
- Phase 7 として `@xyflow/react` を導入した。
- `ReactFlowCanvas`、`ReactFlowNode`、`reactFlowAdapter` を追加した。
- 既存 `WorkflowCanvas` を残したまま、TopBar から `標準 / React Flow` を切り替えられるようにした。
- React Flow Canvas 上で Port Handle を表示し、Handle ドラッグで既存 reducer / validation を通して接続作成できるようにした。
- React Flow Edge の選択削除導線と Inspector 選択連動を追加した。
- `docs/implementation/REACT_FLOW_CANVAS_MVP.md` を追加した。
- Phase 7.1 として Canvas 表示モードの localStorage 保存を追加した。
- React Flow ノード位置の localStorage 保存と再表示時の復元を追加した。
- React Flow Canvas に「位置をリセット」導線を追加した。
- `docs/implementation/UNDO_REDO_POLICY.md` を追加し、本格 Undo / Redo はまだ入れず方針整理に留めることを明文化した。

## Phase 3 実装内容

- ExecutionGraph
- ExecutionStep / ExecutionRoute
- review_required / failed / retry_ready / skipped の状態遷移
- 実行タイムライン
- retry candidate 表示と単体再試行
- Human Review の承認 / 差し戻し / スキップ
- 実行グラフの JSON 要約表示

## 日本語化対象

- UI表示文言
- ボタン、タブ、ラベル
- エラー表示
- 空状態メッセージ
- README、AGENTS.md、PROJECT_STATE.md、実装ドキュメント

## 英語のまま残すもの

- TypeScript の型名
- 変数名、関数名
- ファイル名、ディレクトリ名
- npm script
- branch名
- JSON key
- internal enum value
- 技術的に英語固定が安全な識別子

## MVP制限

- 実外部 API 接続なし
- Credential 保存なし
- Tauri / SQLite / Zustand なし
- Web Worker なし
- Human Review はローカル状態のみ
- retry は対象ノード単体のモック再試行のみ

## Phase 4 実装内容

- ローカル評価エンジン（7基準・100点満点・閾値判定）
- EvaluationPanel（スコアバー / 基準テーブル）
- HumanReviewPanel（承認 / 却下 / 修正依頼 / スキップ）
- RebuildPanel（再作成リクエスト一覧 / 実行 / キャンセル）
- ArtifactVersionHistory（バージョン履歴 / 切り替え）
- BottomMonitor に評価タブを追加（6タブ）
- StagePreview に評価・レビューバッジを追加
- 評価実行後にバージョン自動保存
- 再作成完了後にバージョン自動保存

## Phase 5 実装内容

- `WorkflowPort` 型（id / label / direction / dataType / required / description）
- `WorkflowPortDirection` 型
- `WorkflowNode` に `inputPorts?` / `outputPorts?` を追加
- `WorkflowConnection` に `sourcePortId?` / `targetPortId?` を追加
- `Workflow` に `schemaVersion?` を追加
- `src/domain/portRules.ts` 新規作成（getInputPorts / getOutputPorts / findPort / isPortConnected / getUnconnectedRequiredInputPorts / createPortsFromTypes）
- `connectionRules.ts` に `ConnectionValidationSeverity` を export
- `validateConnection` にポートID存在チェック・型互換チェックを追加
- `ConnectionDraft` を `sourcePortId` / `targetPortId` ベースに更新
- `ConnectionEditor` をポート対応に更新（required/optional 表示）
- `Inspector` のポートセクションをポートオブジェクトで表示、required 未接続警告を追加
- `NodeCard` のポート表示をポートオブジェクトで更新（必須ポートに `*` 表示）
- 旧 `inputTypes` / `outputTypes` による fallback 維持
- 旧接続（sourcePort / targetPort）との後方互換維持
- `docs/implementation/PORT_MODEL_MVP.md` 新規作成
- Phase 6 としてテンプレート metadata、検索、詳細プレビュー、複製、読込前確認を追加した。
- `src/domain/templateMetadata.ts` を追加し、Port / 評価 / ArtifactVersion 要約の生成を集約した。
- 既存 localStorage テンプレートに `metadata` がなくても読めるよう後方互換を維持した。
- `docs/implementation/TEMPLATE_REUSE_UX_MVP.md` を追加した。

## Next Work

1. Phase 7.2 として React Flow Canvas の操作性改善を進める。
2. 評価結果と実行グラフを結びつけた差分表示を追加する。
3. テンプレートの version / metadata 編集を追加する。
4. localStorage MVP から永続ストレージへ進む条件を整理する。
5. reducer state が複雑化した場合のみ Zustand を再評価する。

## Known Risks

- 実行グラフはMVPであり、本格的な非同期エンジンや分散実行はまだ扱っていない。
- review / retry はローカルモックのため、セッションを跨いだ承認フローはない。
- localStorage ベースの保存はブラウザローカルに閉じるため、共有や永続保証はまだない。
- React Flow ノード位置保存は workflow 本体ではなく UI 補助状態として保存しているため、複数端末同期や共同編集はまだ考慮していない。
- Undo / Redo は方針整理のみであり、workflow 全体置換系の巻き戻しは未対応。
- テンプレート metadata は要約情報であり、ArtifactVersion 本体や評価履歴全文は保持しない。

## Screen Spec Alignment

- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` に UI-01、UI-02、UI-05、UI-06、UI-08、UI-09、UI-10 の整合表を記録している。
- `docs/implementation/EXECUTION_GRAPH_MVP.md` に Phase 3 の実行グラフMVPを整理している。
- `docs/implementation/TEMPLATE_REUSE_UX_MVP.md` に Phase 6 の再利用UX整理を記録している。
- `docs/implementation/REACT_FLOW_CANVAS_MVP.md` に Phase 7 の Canvas MVP を整理している。
- `docs/implementation/UNDO_REDO_POLICY.md` に Phase 7.1 の Undo / Redo 方針を整理している。

## Phase 7 実装内容

- `@xyflow/react` を導入
- `src/components/ReactFlowCanvas.tsx` を追加
- `src/components/ReactFlowNode.tsx` を追加
- `src/domain/reactFlowAdapter.ts` を追加
- `WorkflowNode` / `WorkflowConnection` を React Flow の Node / Edge に変換
- 既存接続のうち port ID 未保持のものは representative handle を推定して可視化
- Handle ドラッグ接続時に `validateConnectionDraft(...)` と既存 `createConnection` reducer を再利用
- Edge 選択と「選択中の接続を削除」導線を追加
- Inspector とのノード選択連動を維持

## Phase 7.1 実装内容

- Canvas 表示モードを localStorage に保存し、再表示時に `標準 / React Flow` を復元
- 不正な Canvas mode 値は `standard` 扱いで安全にフォールバック
- React Flow ノード位置を localStorage に保存し、保存済み位置を `workflow.node.position` より優先して復元
- 存在しない node id の位置は無視し、JSON parse 失敗時も空扱いにする
- React Flow Canvas に「位置をリセット」ボタンを追加し、保存位置削除と初期配置復元を行う
- React Flow 側の node / connection lookup を軽く整理し、描画中の探索負荷を下げた
- Undo / Redo は実装せず、危険な対象範囲と将来案を `docs/implementation/UNDO_REDO_POLICY.md` に整理

## Phase 6 実装内容

- `SavedWorkflowTemplate` に `metadata` を追加
- `createTemplateMetadata(...)` / `normalizeTemplateMetadata(...)` を追加
- template save 時に tags / category / description を受け取り metadata を生成
- 一覧で node 数、connection 数、未接続 required port 数、評価状態、評価スコア、ArtifactVersion 数を表示
- name / description / tag / category を対象にした検索を追加
- `TemplatePreview` でノード一覧、接続一覧、Port 要約、評価要約、ArtifactVersion 要約を表示
- 読み込み前に注意表示と確認 UI を追加
- テンプレート複製を追加
- localStorage 既存データの後方互換を維持

## Phase 7 Verification

- Model: Codex
- Branch: `feature/react-flow-canvas-mvp`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 標準 / React Flow 切替、12ノード描画、Port Handle 描画、Inspector 選択連動、接続削除導線、最新ビルドの console error なしを確認
- Browser QA note: in-app browser automation では Handle ドラッグを安定再現できず、接続作成 / 無効接続拒否はコード経路と DOM 構造中心で確認

## Phase 7.1 Verification

- Model: Codex
- Branch: `feature/react-flow-canvas-stability`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 初期表示、Canvas モード切替、React Flow 表示、モード再読込、ノード位置復元、位置リセット、位置リセット後の再読込、標準 Canvas 復帰、Run、評価実行を確認
- Browser QA note: テンプレート保存 / プレビュー、JSON export / import は今回の Browser QA 対象外。console には今回の修正後に新規 error は出ていない

## Phase 1 Verification

- Model: GPT-5.5 high confirmed by user before implementation.
- Branch: `feature/ui-state-and-json-foundation`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: tabs、Inspector編集、ローカルモック実行、ログ、メトリクス、成果物、接続検証表示を確認

## Phase 2 Verification

- Model: GPT-5.5 high confirmed by user before implementation.
- Branch: `feature/connection-template-local-history`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 接続エディター表示、ポート表示、接続作成 / 削除、テンプレート保存UI、履歴保存UI、既存 Run 動作、メトリクス、成果物表示を確認

## Phase 2.5 Verification

- Model: GPT-5.4 medium confirmed by user before implementation.
- Branch: `feature/japanese-ui-docs`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: Edge headless で初期表示と Run 後表示を確認。日本語UI、成果物更新、Check の要確認表示、ログ追加を確認

## Phase 3 Verification

- Model: Codex (実装) / Claude Sonnet 4.6 (引き継ぎ・QA)
- Branch: `feature/execution-graph-error-retry`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 実施済み
  - 初期画面・12ノード表示: OK
  - Runボタン動作・実行ログ追加: OK
  - FAIL分岐: チェックノードが failed、エラー経路が作られ、再試行候補に「チェック」が表示される: OK
  - 再試行ボタン: 押下後 success に切り替わり、判定 PASS へ更新: OK
  - REVIEW分岐: チェックノードが review_required、確認待ちに「承認して続行 / 差し戻し / スキップ」が表示される: OK
  - 承認して続行: 押下後ワークフローが続行し、判定 PASS へ更新: OK
  - PASS直行: 全12ノードが順に complete、Bootstrap MVP 成果物が作られる: OK
  - BottomMonitor「実行グラフ」タブ: Run ID・再試行候補・経路一覧が表示される: OK
  - StagePreview executionGraph summary: 最終判定・確認待ち・失敗ノード・再試行候補が表示される: OK
  - ログ文言: 日本語で全ノードのログが記録される: OK
