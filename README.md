# Agent Workflow Studio

Agent Workflow Studio は、AI作業をノード型ワークフローとして設計・実行・観測・改善・再利用するローカル優先のAIワークフローOSです。

汎用ワークフローエディタ、n8n clone、React Flow demo、mock-only prototype ではありません。
Scratch風の視覚操作、n8n風の自動化・分岐・外部連携、Upload Labs風の流量・資源・詰まり・経路可視化、認知HUD、状況補佐官を統合することを目指します。

## 開始手順

```bash
npm ci
npm run dev
```

## 検証コマンド

```bash
npm run typecheck
npm run lint
npm run build
```

UI変更時は Browser QA または headless QA も行います。

## 参照ドキュメント

- `AGENTS.md`: AI coding agent 向け作業ルール
- `docs/project/ACTIVE_PLAN.md`: 現在の単一計画入口
- `docs/project/PROJECT_GOAL.md`: 長期Goalとプロダクト同一性
- `docs/project/SOURCE_OF_TRUTH.md`: 仕様判断の優先順位
- `docs/source-specs/`: 原文仕様
- `docs/audit/`: 現在実装と仕様差分
- `docs/implementation/`: 実装詳細・履歴。現行計画の入口ではない
- `docs/tasks/`: Codex task 記録。現行計画の入口ではない

## 現在のMVP範囲

現時点のアプリは、React + TypeScript + Vite によるローカルMVPです。

含まれるもの:

- ノード型ワークフロー表示
- React Flow Canvas / 標準Canvas
- ローカルモック実行
- 実行ログ・メトリクス・Run Detail
- 認知HUD / 状況表示のMVP面
- テンプレート保存・検索・読込
- localStorage によるローカル保存
- mock connector / Human Review 導線
- credential を保存しない安全境界

含まれないもの:

- 実AI API接続
- 実外部API接続
- credential保存
- Tauri / SQLite / OS Keychain
- 本番用ジョブエンジン
- 完全なReplay / durable audit log
- 音声・アバター・動画による状況補佐官

## 外部APIとCredentialの扱い

実外部API接続はまだ行いません。Codex、Claude、Gemini、Hermes、Grok、GitHub などは、現時点では mock connector または将来接続先の概念として扱います。

Credential値は、UI state、localStorage、template、log、metrics、audit artifact に保存しません。

## 旧フェーズ情報

旧M8〜M20の詳細やフェーズ別メモは、実装ドキュメントと監査ドキュメントを参照してください。

- `docs/implementation/`
- `docs/architecture/`
- `docs/audit/`
