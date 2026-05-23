# Phase 4 MVP: 評価・再作成・Human Review 強化

## 概要

Phase 3 で構築した実行グラフ基盤の上に、成果物の品質評価・ヒューマンレビュー・再作成リクエスト・バージョン履歴を追加する。

実装はすべてローカルモックで完結し、外部APIや認証情報は一切扱わない。

---

## 追加ドメイン型

### `src/domain/evaluation.ts`

| 型 | 用途 |
|---|---|
| `EvaluationStatus` | 未評価 / 評価中 / 合格 / 要確認 / 不合格 |
| `ReviewDecision` | 判断待ち / 承認 / 却下 / 修正依頼 / スキップ |
| `RebuildStatus` | 待機中 / 実行中 / 完了 / キャンセル |
| `EvaluationCriterion` | 評価基準1件（ラベル / スコア / 判定 / メモ） |
| `EvaluationResult` | 評価全体（runId / スコア合計 / 基準リスト / サマリー） |
| `HumanReviewState` | レビュアー / 判断 / メモ / 判断日時 |
| `RebuildRequest` | 再作成リクエスト1件（理由 / 指示 / ステータス） |
| `ArtifactVersion` | 成果物バージョン1件（バージョン番号 / 内容 / evaluationId） |

---

## 評価基準（`src/domain/evaluationRules.ts`）

7つの基準で100点満点を算出する。

| ID | ラベル | 配点 | 合格条件 |
|---|---|---|---|
| `spec_match` | 仕様一致 | 15 | 完了ノード1件以上 |
| `artifact_completeness` | 成果物完全性 | 20 | 成果物コンテンツが30字超 |
| `no_errors` | エラー有無 | 20 | 失敗ノードなし（-10/件） |
| `no_review_pending` | 確認待ち有無 | 15 | 確認待ちノードなし |
| `retry_candidates` | 再試行候補 | 10 | 再試行候補なし（-5/件） |
| `japanese_ui` | 日本語UI | 10 | 成果物に日本語文字列を含む |
| `reusability` | 再利用性 | 10 | ノードが1件以上定義されている |

### 判定閾値

- **90%以上** → `passed`（合格）
- **70〜89%** → `needs_review`（要確認）
- **69%以下** → `failed`（不合格）

---

## 状態管理追加（`WorkflowState`）

```typescript
evaluation?: EvaluationResult
humanReview?: HumanReviewState
rebuildRequests: RebuildRequest[]
artifactVersions: ArtifactVersion[]
selectedArtifactVersionId?: string
```

`runWorkflowStart` で `evaluation` と `humanReview` をリセットする。

---

## 追加アクション

| アクション | 効果 |
|---|---|
| `startEvaluation` | ステータスを `evaluating` へ |
| `setEvaluationResult` | 評価結果をセット |
| `setHumanReviewDecision` | レビュー判断をセット |
| `updateHumanReview` | レビュー状態を更新 |
| `requestRebuild` | 再作成リクエストを追加 |
| `startRebuild` | ステータスを `running` へ |
| `completeRebuild` | ステータスを `completed` へ |
| `cancelRebuild` | ステータスを `cancelled` へ |
| `addArtifactVersion` | バージョンを追加し選択 |
| `selectArtifactVersion` | 表示バージョンを切り替え |
| `clearEvaluation` | 評価・レビューをリセット |

---

## 追加コンポーネント

### `EvaluationPanel`

- 評価ステータスバッジ
- スコアバー（%表示）
- 評価基準テーブル（ラベル / スコア / 判定 / メモ）
- 「評価を実行」ボタン（実行後800msで完了）

### `HumanReviewPanel`

- 承認 / 修正依頼 / 却下 / スキップ ボタン
- メモ入力テキストエリア
- 再作成フォームトグル（理由 + 指示）

### `RebuildPanel`

- 再作成リクエスト一覧（展開/折り畳み）
- ステータスバッジ
- 実行 / キャンセル / 中断 ボタン

### `ArtifactVersionHistory`

- バージョン一覧（新しい順）
- 評価済 / 再作成タグ
- 「このバージョンを表示」ボタン

---

## BottomMonitor 変更

5タブ（ログ / メトリクス / キュー / 出力 / 実行グラフ）に **評価** タブを追加。

評価タブ内レイアウト:

```
┌─────────────────┬─────────────────┐
│ EvaluationPanel │ HumanReviewPanel│
├─────────────────┴─────────────────┤
│ RebuildPanel  │ ArtifactVersionH. │
└───────────────┴───────────────────┘
```

---

## StagePreview 変更

判定バッジ行に評価ステータスとレビュー判断バッジを追加。

---

## MVP制限

- 評価はすべてローカルルールで計算（外部AIなし）
- 再作成は800msディレイ後に `completed` へ遷移するモック
- バージョン履歴はメモリ内のみ（セッション跨ぎ不可）
- レビュアーは常に「ローカルユーザー」固定
