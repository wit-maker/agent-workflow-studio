# Template Reuse UX MVP

Last updated: 2026-05-23

## Phase 6 の目的

Phase 6 は、保存した workflow を「ただ置いておく」状態から、
あとで探せる、読める、比較できる、安心して再利用できる状態へ引き上げるための段階です。

React Flow 導入前に、テンプレート側の情報設計と localStorage MVP の運用感を先に固めます。

## テンプレートメタデータ

`SavedWorkflowTemplate` に `metadata` を追加し、以下を保持します。

- `tags`
- `category`
- `nodeCount`
- `connectionCount`
- `requiredPortCount`
- `unconnectedRequiredPortCount`
- `lastEvaluationStatus`
- `lastEvaluationScore`
- `artifactVersionCount`
- `createdFromRunId`

既存の localStorage データに `metadata` がなくても、読み込み時に `normalizeTemplateMetadata(...)` で補完します。
既存フォーマットは破壊せず、後方互換を維持します。

## Port 情報との関係

Port 要約は Phase 5 の明示的ポートモデルを前提に生成します。

- `getInputPorts(...)`
- `getOutputPorts(...)`
- `getUnconnectedRequiredInputPorts(...)`

これにより、テンプレート一覧とプレビューで以下を再利用前に確認できます。

- ノード数 / 接続数
- required port 総数
- 未接続 required port 数
- ノードごとの必須入力の有無

React Flow を入れる前でも、接続の粗い健全性を把握できます。

## 評価結果との関係

テンプレート保存時に、直近の評価状態を `metadata` に要約して残します。

- 評価ステータス
- 評価スコア

これにより、再利用時に「未評価の下書きなのか」「ある程度通ったテンプレートなのか」を一覧から判断できます。

## ArtifactVersion との関係

テンプレート保存時に、現在保持している `artifactVersions` 件数を `artifactVersionCount` として要約保存します。

Version 本体をテンプレートへ丸ごと埋め込むのではなく、
MVP では「どの程度の改善履歴が付いていたか」を軽く伝えるメタ情報として扱います。

## UI で追加したもの

- テンプレート保存フォーム
  - テンプレート名
  - 説明
  - タグ
  - カテゴリ
- テンプレート検索
  - name
  - description
  - tag
  - category
- 一覧での metadata 表示
- 詳細プレビュー
  - ノード一覧
  - 接続一覧
  - Port 要約
  - 評価要約
  - ArtifactVersion 要約
- 読み込み前の注意表示
- 読み込み確認 UI
- テンプレート複製

## localStorage MVP の制限

- 保存先はブラウザ localStorage のみ
- テンプレート共有はできない
- Credential は保存しない
- ArtifactVersion 本体や評価履歴全文はテンプレートへ完全保存しない
- 実 API 実行結果の再現性は保証しない
- 容量制限とブラウザ依存を受ける

## React Flow 導入前にこのフェーズを挟む理由

React Flow を先に入れると、接続 UI の表現力は上がります。
ただし、再利用 UX が薄いままだと「作れるが再利用しにくい」状態が残ります。

Phase 6 を先に入れる理由は次の通りです。

- テンプレートに必要な要約情報を先に固められる
- Port モデルを再利用導線へ接続できる
- 評価と成果物改善の履歴を一覧に反映できる
- React Flow 導入後も、そのまま使えるメタデータ基盤を先に持てる

## MVP 外

- React Flow 導入
- ドラッグ接続
- Tauri / SQLite / Zustand
- 実 API 接続
- Credential 保存
- テンプレート共有
- テンプレートの全文差分比較
- ArtifactVersion 本体の永続テンプレート化
- 高度な検索構文

## UI Language Rule

UI 表示、ドキュメント、PR 本文、主要コミットメッセージは日本語優先とします。

ただし以下は英語のままで維持します。

- TypeScript 型名
- 変数名
- 関数名
- ファイル名
- ディレクトリ名
- npm script
- branch 名
- JSON key
- internal enum value
- CSS class name
