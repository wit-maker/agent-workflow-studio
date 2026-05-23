# Undo / Redo Policy

Last updated: 2026-05-24

## 目的

Phase 7.1 では React Flow Canvas を「試せる状態」から「安定して使える状態」に近づけることを優先します。
そのため、本格的な Undo / Redo 実装はまだ入れず、まずは対象範囲と危険領域を整理します。

## なぜ今すぐ本格実装しないか

- 現在の workflow state は `useReducer` ベースで、実行状態、評価、Human Review、再作成、Template、履歴保存まで単一の状態木で扱っている。
- Undo 対象を曖昧にしたまま履歴機構を入れると、React Flow のノード操作だけでなく Run / Review / Import / Template 読込まで巻き戻す危険がある。
- 特に `importWorkflow` のような workflow 全体置換系 action は、履歴の粒度を誤ると UI 整合性、選択状態、localStorage との同期を壊しやすい。
- Phase 7.1 ではノード位置永続化だけでも UX 改善効果が大きいため、先に安定化と保存導線を整える。

## Undo 対象候補

将来的に Undo / Redo の対象として検討する候補は次です。

- node移動
- connection作成
- connection削除
- Inspector編集
- import
- template load
- rebuild

この中でも、Phase 7 系で最も相性が良いのは `node移動`、`connection作成`、`connection削除`、`Inspector編集` です。
一方で `import`、`template load`、`rebuild` は周辺状態への影響が広く、履歴粒度の設計を先に固める必要があります。

## MVPで危険な Undo 対象

Phase 7.1 時点で特に危険なのは、workflow 全体を置き換える操作です。

- workflow全体置換
- import
- template load

これらはノードや接続だけでなく、以下の状態と一緒に再整合が必要です。

- selectedNodeId
- executionGraph
- evaluation
- humanReview
- rebuildRequests
- artifactVersions
- localStorage 上のテンプレート / 履歴 / Canvas 保存情報

MVPの段階でこれを安易に Undo 対象へ入れると、履歴の「戻したい範囲」が利用者にとって不透明になります。

## 将来的な実装案

### 1. command history

- `node moved`
- `connection created`
- `connection deleted`
- `node config updated`

のようなユーザー操作単位で command を積む方式です。
React Flow のノード移動や Inspector 編集とは相性が良く、局所的な巻き戻しを作りやすい反面、`import` のような全体置換は command が肥大化しやすいです。

### 2. reducer action history

`workflowReducer` に流れる action を履歴化する方式です。
既存実装との整合は取りやすいですが、action ごとに Undo 可能性が異なり、`runWorkflowStart` や `setEvaluationResult` のような実行系 action をどう扱うかのポリシー分離が必要です。

### 3. snapshot history

workflow 全体の snapshot を積む方式です。
実装は単純ですが、状態サイズが大きくなりやすく、どの snapshot を Undo 対象に含めるかを慎重に制御しないと Phase 7 時点では過剰です。

## localStorage との関係

- Phase 7.1 で localStorage に保存するのは `Canvas mode` と `React Flow node positions` のみです。
- 位置保存は UI 利便性のための補助状態であり、workflow 本体の Undo / Redo 履歴とは切り離して扱います。
- 将来 Undo / Redo を導入する場合も、少なくとも初期段階では node position のみ別保存を維持し、workflow 全体履歴とは混ぜない方が安全です。
- Undo で node position を戻す設計にする場合は、localStorage へ即時反映するのか、確定時のみ反映するのかを先に決める必要があります。

## Phase 7.1 の結論

- Phase 7.1 では本格 Undo / Redo は実装しない。
- Phase 7.1 では React Flow の位置保存と表示モード保存のみを localStorage で扱う。
- 次段階では `node移動`、`connection作成`、`connection削除`、`Inspector編集` を最小対象にした command history か reducer action history を比較検討する。
- `import`、`template load`、workflow 全体置換は、履歴境界が整理できるまで Undo 対象に含めない。
