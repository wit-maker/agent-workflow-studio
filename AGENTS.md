# Agent Workflow Studio 作業ルール

## モデル運用

実装前に現在モデルを確認し、作業リスクとスコープに対して十分な中で、できるだけコスト効率の良いモデルを選びます。

- `GPT-5.5 xhigh`
  - アーキテクチャ変更
  - 仕様矛盾の裁定
  - セキュリティ、Credential、危険な Git 操作
  - 大規模リファクタ判断
- `GPT-5.5 high` / `GPT-5.4 high`
  - 通常の React / TypeScript 実装
  - 状態管理
  - 型設計
  - 仕様照合
  - 複数ファイル変更
- `GPT-5.4 medium` / `GPT-5.4 high`
  - UI コンポーネント追加
  - Inspector / Canvas / BottomMonitor / StagePreview の通常改修
  - localStorage mock
  - JSON import/export 強化
- `GPT-5.4 mini low` / `GPT-5.4 mini medium` / 利用可能な `GPT-5.2` / `GPT-5.3`
  - ドキュメント修正
  - lint 修正
  - CSS 微調整
  - 文言修正
  - 小さな表示改善

推奨モデルと一致しないことだけを理由に停止してはいけません。実際の作業リスクに対してモデルが不十分な場合のみ停止し、以下を報告します。

```text
モデル変更が必要です。
現在モデル:
推奨モデル:
作業開始条件: 推奨モデルへ変更後に再実行
```

ユーザーが不十分なモデルでの続行を明示的に許可した場合のみ、その事実を `PROJECT_STATE.md` に記録して続行できます。

## 日本語優先ルール

このリポジトリでは、以下を日本語優先にします。

- UI表示文言
- ドキュメント本文
- PR本文
- Issue本文
- 主要コミットメッセージ

ただし、以下は技術的安定性を優先して英語のままで維持して構いません。

- コード識別子
- 型名
- ファイル名
- ディレクトリ名
- npm script
- branch名
- JSON key
- 内部 enum 値

## リポジトリ分離

このリポジトリは `agent-workflow-studio` 専用です。既存 `ai-workflow-lab` の clone、編集、コピー、push などは行いません。

## ブランチとGit

- `main` への直接作業は bootstrap 初回のみ
- 以降は `feature/*` または `fix/*` を使用
- `git add .` は使用しない
- 作業前後に `git status` を確認する
- commit 前に `git diff --stat` を確認する

## 秘密情報と外部接続

- `.env`、API key、credential、token、ローカル秘密情報を commit しない
- 秘密情報をログへ出さない
- 明示的な承認なしに実外部 API へ接続しない
- bootstrap / MVP 段階では外部 AI や connector は mock のまま維持する

## 品質ゲート

実装後は必ず以下を実行します。

```bash
npm run build
npm run lint
```

どちらかを実行できない場合は、その理由を `PROJECT_STATE.md` と最終報告の両方へ記録します。

## 仕様書の扱い

`docs/source-specs/` 配下のファイルは原文仕様です。一般的な workflow app の思い込みで置き換えたり、原文を書き換えたりしてはいけません。
