# 評価・再作成 MVP 設計メモ

Last updated: 2026-05-23

## Phase 4 の目的

実行結果を「出して終わり」ではなく、評価し、確認し、必要なら再作成できる状態にする。

## 評価の扱い

- ローカルモック評価のみ（実 AI 評価は未接続）
- `src/domain/evaluationRules.ts` に7基準の評価ロジックを実装
- 評価基準: 仕様一致 / 成果物の完全性 / エラー状態の有無 / 確認待ちの有無 / 再試行候補の有無 / 日本語UI方針 / 再利用可能性
- スコア: 90以上=合格 / 70〜89=要確認 / 69以下=不合格
- `EvaluationPanel` コンポーネントで評価結果を表示

## Human Review の扱い

- `HumanReviewPanel` で承認 / 却下 / 修正依頼 / スキップを操作
- 判断メモを textarea で入力可能
- 修正依頼時は再作成指示フォームを表示し `RebuildRequest` を生成
- 承認・却下・スキップは即時 `HumanReviewState` を更新
- 永続化は local state のみ（localStorage 未接続）

## 再作成モックの扱い

- `RebuildPanel` で RebuildRequest 一覧を表示
- 「再作成を実行」で 800ms の非同期モック処理
- 結果は固定のモック文字列（実 AI 再作成は未接続）
- 完了時に `ArtifactVersion` を追加し、成果物表示を差し替え

## ArtifactVersion の扱い

- `ArtifactVersionHistory` でバージョン一覧を表示
- 各バージョンは `version`, `createdAt`, `sourceRunId`, `rebuildRequestId` を保持
- 「この版を表示」で成果物表示を切り替え可能
- diff 比較は次フェーズ候補

## 実 API 未接続

- 評価は全てローカルモックロジック
- 再作成も固定テキスト生成
- Anthropic API / OpenAI API 呼び出しなし
- Credential 保存なし

## MVP 外の範囲

- SQLite / Web Worker
- React Flow（禁止）
- Zustand（禁止）
- Tauri（禁止）
- 自動再評価トリガー
- Human Review 多段承認
- diff ビュー
- localStorage 永続化（評価・レビュー）

## 次フェーズ候補

- 評価結果の localStorage 永続化
- 再作成後の自動評価
- Human Review 多段承認フロー
- バージョン間 diff ビュー
- 実 Claude API 接続（評価・再作成）
