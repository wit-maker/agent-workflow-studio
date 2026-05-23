# React Flow Canvas MVP

Last updated: 2026-05-24

## 目的

Phase 7 の目的は、既存の `WorkflowCanvas` を壊さずに、React Flow ベースの Canvas MVP を安全に追加することです。
既存の Run、評価、テンプレート、履歴、JSON import/export、Inspector、Port 検証のQA範囲を守るため、全面置換ではなく共存方式を採用します。

Phase 7.1 では大きな機能追加よりも、React Flow Canvas を「試せる状態」から「安定して使える状態」に近づけることを優先します。
具体的には、Canvas 表示モード保存、ノード位置保存、位置リセット、軽微な安定化、Undo / Redo 方針整理を行います。

## なぜ既存Canvasを残すのか

- 既存 `WorkflowCanvas` は Phase 1 から Phase 6 までの確認基盤であり、静的な可視化として安定している。
- React Flow を全面置換すると、表示だけでなく接続、選択、実行、評価、テンプレート周辺まで同時に回帰範囲が広がる。
- Phase 7 では「ドラッグ接続できるか」「Port Handle モデルが実運用に耐えるか」を限定的に検証したい。
- そのため TopBar で `標準 / React Flow` を切り替えられる構成にし、既存UXをいつでも戻せる状態を維持する。

## MVPの範囲

- `@xyflow/react` を導入
- `ReactFlowCanvas` を追加
- `ReactFlowNode` でカスタムノード表示
- 既存 `WorkflowConnection` を React Flow Edge として表示
- input / output Port Handle を表示
- Handle ドラッグで接続作成
- 既存 `validateConnectionDraft(...)` を再利用
- 既存 reducer の `createConnection` / `deleteConnection` を再利用
- Edge 選択と削除導線を追加
- ノード選択を Inspector と連動
- Canvas 表示モードを localStorage に保存
- React Flow ノード位置を localStorage に保存
- React Flow ノード位置のリセット導線を追加

## Phase 7.1 の整理

- Canvas 表示モードは `agent-workflow-studio:canvas-mode` に保存する
- 保存値は `standard` / `react-flow` を使い、不正値は `standard` 扱いに戻す
- React Flow ノード位置は `agent-workflow-studio:react-flow-positions` に保存する
- 保存済み位置がある場合は `workflow.node.position` より優先する
- 保存済み位置が無い場合は既存 `workflow.node.position` を fallback に使う
- 存在しない node id の位置は無視する
- JSON parse 失敗時は空扱いで安全に復元する
- React Flow Canvas 上で「位置をリセット」を実行すると、保存済み位置を削除して初期配置へ戻す

## Port Handle と WorkflowPort の対応

- output handle id = `WorkflowPort.id`
- input handle id = `WorkflowPort.id`
- React Flow の `sourceHandle` は `sourcePortId` に対応
- React Flow の `targetHandle` は `targetPortId` に対応

Phase 5 で `WorkflowConnection.sourcePortId?` / `targetPortId?` を導入済みのため、新規接続はこのIDをそのまま保存します。

## adapter の責務

`src/domain/reactFlowAdapter.ts` は次を担当します。

- `WorkflowNode[]` を React Flow Node[] に変換
- `WorkflowConnection[]` を React Flow Edge[] に変換
- React Flow の `Connection` を `ConnectionDraft` に変換
- 既存接続に port ID が無い場合、代表的な handle を推定して表示

既存サンプル接続には legacy 互換のため `sourcePortId` / `targetPortId` を持たないものがあるため、表示時のみ representative handle を選んでいます。
これは可視化のための推定であり、Phase 7 では既存データ構造の一括移行は行いません。

## 接続作成の流れ

1. ユーザーが source handle から target handle へドラッグする
2. React Flow の `onConnect` が `source` / `target` / `sourceHandle` / `targetHandle` を返す
3. adapter が `ConnectionDraft` に変換する
4. `AppShell` の既存接続作成ロジックが `validateConnectionDraft(...)` を実行する
5. valid の場合のみ既存 reducer の `createConnection` を dispatch する
6. `carries` は source port の `dataType` から推定する
7. invalid の場合は既存ログへ警告を書きつつ、React Flow Canvas 上にもエラーを表示する

`kind` は Phase 7 MVP では既定値として `data` を使います。

## 既存 ConnectionEditor との共存

- `ConnectionEditor` は削除しない
- 既存の選択式接続作成・削除は継続利用できる
- React Flow Canvas で作成した接続も、同じ workflow state に保存される
- そのため標準Canvas、React Flow Canvas、Inspector の接続一覧は同じ状態を参照する

## 安定化メモ

- `NodeMeasurer` は `workflow.nodes` 由来の node id 配列をもとに内部サイズ更新を行う
- DOM selector の data-id 参照では `CSS.escape(...)` を使い、特殊文字混入時の再発を避ける
- 重複接続検証は `workflowSelectors.ts` 側の `validateConnectionDraft(...)` に寄せる
- React Flow 用 adapter では node / connection lookup を使い、描画中の探索回数を減らす
- `visibility: hidden` を前提にした隠し測定には戻さず、実ノード DOM を測定対象にする

## Undo / Redo

Phase 7.1 では本格 Undo / Redo は実装しません。
理由は、React Flow のノード移動だけでなく、Import、Template 読込、評価、再作成、Human Review を含む workflow 全体置換系まで巻き戻し対象を決める必要があるためです。

方針は `docs/implementation/UNDO_REDO_POLICY.md` に整理し、当面は次を分離して扱います。

- workflow 本体の履歴
- React Flow の node position 保存
- Canvas 表示モード保存

## 未実装範囲

- `WorkflowCanvas` の削除
- React Flow 全面置換
- MiniMap 常設
- 自動レイアウト
- dagre / elkjs
- ノード追加DnD
- 複雑なEdge編集
- Deleteキー削除
- 本格 Undo / Redo

## 次フェーズ候補

- Phase 7.2 として React Flow Canvas の操作性改善
- ノード追加DnD
- Edge 詳細編集UI
- legacy 接続の port ID 補完または migration 戦略整理
- MiniMap / Fit View 改善
- 自動レイアウトの段階導入検討
