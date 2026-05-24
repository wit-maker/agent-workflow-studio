# React Flow Canvas 操作性改善

Last updated: 2026-05-24

## 目的

Phase 7.2 の目的は、React Flow Canvas を「表示できる状態」から「人間が操作しやすい状態」へ進めることです。
このフェーズでは React Flow 全面移行は行わず、既存 `WorkflowCanvas` と共存したまま、接続操作と状態把握の分かりやすさを改善します。

## このフェーズで行うこと

- React Flow Canvas に操作ヘルプを追加する
- Edge / Connection 選択時の詳細表示を強化する
- 無効接続・重複接続・同一ノード接続・不明ポート接続の理由を Canvas 上に表示する
- 接続削除に確認導線を追加する
- Delete / Backspace でノード削除が未対応であることを案内する
- Handle / Port 表示の視認性を改善する
- Template 保存 / プレビュー / 読み込み、JSON export / import の回帰確認を行う

## このフェーズで行わないこと

- 既存 `WorkflowCanvas` の削除
- React Flow 全面移行
- ノード追加 DnD
- 本格 Undo / Redo
- 自動レイアウト
- dagre / elkjs 導入
- Zustand / Tauri / SQLite 導入
- 実 API 接続
- Credential 保存

## 操作ヘルプ

React Flow Canvas 右下に次の短い操作ヘルプを表示します。

- ドラッグ: ノード移動
- Handle接続: ポート同士を接続
- Edge選択: 接続詳細を表示
- Delete: ノード削除は未対応
- 位置リセット: 保存位置を初期化

## Edge 詳細表示

接続選択時は右上カードに次を表示します。

- 接続元ノード名
- 接続元ポート名
- 接続先ノード名
- 接続先ポート名
- `carries`
- `kind`
- `status`
- `validation result`
- 「接続を削除」ボタン

接続削除は `window.confirm(...)` による確認を挟み、誤削除を避けます。

## 無効接続理由の表示

Handle 接続で失敗した場合、最後に拒否された理由を Canvas 内に表示します。

- 重複接続
- 型不一致
- 同一ノード接続
- source / target port 不明
- source / target node 不明

表示例:

- `接続できません: 既に同じ接続があります。`
- `接続できません: 同じノード同士は接続できません。`
- `接続できません: 接続元ポートが見つかりません。`

## ノード削除は未対応

React Flow 上の Delete / Backspace によるノード削除はこのフェーズでは実装しません。
キー押下時は、ノード削除が未対応であることと、接続削除は詳細カードから行うことを案内します。

## Port / Handle 視認性改善

`ReactFlowNode` の Port 表示は次を分かりやすくします。

- 入力 / 出力の区別
- required / optional
- dataType
- 左右どちらに接続するか
- required の `*` 表示維持

CSS は既存デザインを壊さない範囲の最小変更に留めます。

## 回帰 QA

Phase 7.2 では次を優先確認対象とします。

- 初期表示
- 標準 Canvas / React Flow Canvas の切替
- 操作ヘルプ表示
- 12 ノード表示
- 13 edges 表示
- Edge 選択と詳細表示
- 接続削除導線
- Delete / Backspace 案内
- Run
- 評価実行
- Template 保存 / プレビュー / 読み込み
- JSON export / import
- console error の有無

Browser QA で制約がある項目は、コード経路確認と build / lint を補助根拠にします。

## 次フェーズ候補

- 接続編集の拡張
- ノード追加導線
- MiniMap / Fit View 改善
- 自動レイアウト導入可否の検討
- React Flow 全面移行の是非を再評価
