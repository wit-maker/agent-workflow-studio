# Agent Workflow Studio UI/UX・認知HUD設計書 完全版

## 1. UI原則

Agent Workflow Studio のUIは、全部を表示するUIではなく、人間が今見るべき情報を優先表示するUIである。

## 2. 認知HUDの目的

- 重要な異常を前面に出す
- 正常情報を薄くする
- 次に見るべきノードを示す
- 危険、承認待ち、失敗、詰まりを見落とさない
- 色だけに依存しない

## 3. HUD状態

- L0: 通常
- L1: 注意
- L2: 遅延 / 詰まり
- L3: 失敗
- L4: 人間承認待ち
- L5: 危険操作 / 実行停止

## 4. 表示要素

- Focus Lens
- Alert Layer
- Minimap Warning
- Bottleneck Highlight
- Human Review Spotlight
- Audio Cue
- Depth Layer
- Auto Hide / Reveal

## 5. 画面責任

| 領域 | 役割 |
|---|---|
| Top Bar | 保存、実行、停止、検証、状態 |
| Left Sidebar | 部品、テンプレ、検索 |
| Canvas | ノード、接続、流量、HUD |
| Inspector | 設定、ポート、テスト、リスク |
| Bottom Monitor | ログ、キュー、メトリクス、成果物 |
| Stage | 成果物プレビュー、承認、差分 |

## 6. UX禁止事項

- 重要警告をログだけに隠す
- 色だけで危険度を伝える
- 失敗したノードへ移動できない
- 承認待ちと失敗を同じ見た目にする
- Credential関連の警告を弱く表示する
