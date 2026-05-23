# Project State

Last updated: 2026-05-23

## Current Phase

Phase 2.5 日本語化専用フェーズ。

## Completed

- `agent-workflow-studio` のローカルリポジトリを作成した。
- React + TypeScript + Vite のアプリ基盤を構築した。
- AI Workflow Lab の参照仕様を `docs/source-specs/` に取り込んだ。
- プロジェクト方針、アーキテクチャメモ、MVP範囲、README を追加した。
- 最小限のドメイン型、サンプルワークフロー、接続検証、ボトルネック計算を追加した。
- TopBar、PartsPalette、WorkflowCanvas、Inspector、StagePreview、BottomMonitor のUI骨格を追加した。
- ローカルモック実行によるノード状態、ログ、メトリクス、PASS / REVIEW、成果物表示を追加した。
- `useReducer` ベースの workflow state 管理を追加した。
- Inspector で title、description、agent role、config JSON を編集可能にした。
- Workflow JSON export / import と最低限の検証を追加した。
- BottomMonitor を ログ / メトリクス / キュー / 出力 タブへ分離した。
- StagePreview を プレビュー / Markdown / JSON タブへ分離した。
- Canvas と Inspector に接続検証表示を追加した。
- ポート単位の接続表示と、選択式の接続作成 / 削除を追加した。
- localStorage によるテンプレート保存 / 読込 / 削除モックを追加した。
- localStorage によるワークフロー履歴保存 / 読込 / 削除を追加した。
- import 検証を connection endpoint と artifact content まで強化した。
- `AGENTS.md` をコスト・性能バランス型のモデル運用へ更新した。
- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` を追加し、画面仕様との対応表を作成した。
- Phase 2.5 として、UI表示文言、ログ文言、バリデーション文言、主要ドキュメントを日本語優先へ整えた。

## Phase 2.5 日本語化対象

- UI表示文言
- ボタン、タブ、ラベル
- エラー表示
- 空状態メッセージ
- Inspector、ConnectionEditor、TemplateLibrary、WorkflowHistoryPanel
- BottomMonitor、StagePreview
- README、AGENTS.md、PROJECT_STATE.md、SCREEN_SPEC_ALIGNMENT.md

## 英語のまま残すもの

- TypeScript の型名
- 変数名、関数名
- ファイル名、ディレクトリ名
- npm script
- branch名
- JSON key
- internal enum value
- 技術的に英語固定が安全な識別子

## Not Implemented Yet

- 実外部 API 接続
- Credential 保存
- Tauri デスクトップ化
- ノード作成のドラッグ操作
- 接続編集のドラッグ操作
- required / optional を持つ完全なポートオブジェクト
- build / lint 以外の自動テスト

## Next Work

1. Phase 3 として実行グラフ、エラールート、リトライ経路を追加する。
2. required / optional を持つ明示的なポートオブジェクトへ進める。
3. 評価フローと Human Review 導線を強化する。
4. テンプレートの version / metadata 編集を追加する。
5. reducer state が複雑化した場合のみ Zustand を再評価する。

## Known Risks

- モデル運用はコスト・性能バランス型へ変更済みで、作業リスクに対して不十分なモデルの場合のみ停止する。
- Vite 由来の依存関係は今後の更新で変わりうるため、拡張前に差分確認が必要。
- localStorage ベースの保存はブラウザローカルに閉じるため、共有や永続保証はまだない。

## Screen Spec Alignment

- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` に UI-01、UI-02、UI-05、UI-06、UI-08、UI-09、UI-10 の整合表を追加済み。

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
