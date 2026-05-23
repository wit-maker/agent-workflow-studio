# Screen Spec Alignment

Last updated: 2026-05-23

This document maps the current `Agent Workflow Studio` implementation to the
AI Workflow Lab screen design source specifications. The source specifications
remain in `docs/source-specs/`; this file only records alignment, gaps, and next
actions for the new product.

| 仕様ID | 仕様上の要求 | 現在の実装ファイル | 実装状況 | 不足 | 次アクション |
|---|---|---|---|---|---|
| UI-01 全体俯瞰 / メインキャンバス | Workflow全体をノード、接続線、状態、実行操作、検証結果として俯瞰できる。Runで状態変化とログ追加が見える。 | `src/components/AppShell.tsx`, `src/components/WorkflowCanvas.tsx`, `src/components/NodeCard.tsx`, `src/components/ConnectionLine.tsx`, `src/components/ConnectionEditor.tsx`, `src/domain/sampleWorkflow.ts` | 部分実装済み。12 MVPノード、接続線、Runモック、接続検証、選択式接続作成/削除がある。 | ドラッグ接続、pan/zoom実装、ミニマップ、グループレーン、自動レイアウトは未実装。 | Phase 3以降で実行グラフ、エラールート、リトライ経路を追加し、その後ドラッグ接続を検討する。 |
| UI-02 全部品ライブラリ | 部品検索、カテゴリ絞り込み、MVP部品表示、部品の説明と入出力型を確認できる。 | `src/components/PartsPalette.tsx`, `src/domain/sampleWorkflow.ts` | MVP実装済み。検索、カテゴリボタン、12部品、入出力型、担当AI表示がある。 | 全カテゴリ網羅、risk badge、agent role filter、data type filter、部品追加の本実装は未実装。 | 部品カタログ型を分離し、MVP外カテゴリとrisk/agent/data type filterを追加する。 |
| UI-05 成果物ステージ | Preview / Markdown / JSON / Diffなどの成果物表示、承認・却下・保存・公開準備を扱う。 | `src/components/StagePreview.tsx`, `src/components/BottomMonitor.tsx`, `src/domain/workflow.ts` | 部分実装済み。Preview / Markdown / JSONタブ、artifact表示、Check結果表示がある。 | Diff、Package、Review、Publish、人間承認、機密検知は未実装。 | artifact型を拡張し、Review状態とDiff表示、公開前安全ゲートを追加する。 |
| UI-06 部品設定・ブロック編集 | 選択ノードの設定、入出力、Prompt、Tools、Security、Test、Last Run、Historyを編集・確認できる。 | `src/components/Inspector.tsx`, `src/components/ConnectionEditor.tsx`, `src/state/workflowReducer.ts`, `src/state/workflowActions.ts` | 部分実装済み。title、description、agentRole、config JSON編集、ポート表示、接続編集がある。 | Prompt editor、Tools、Memory/Context、Security、Test Run、設定履歴は未実装。 | Inspectorをセクション化し、Prompt/Security/Test/Historyを段階的に追加する。 |
| UI-08 観測メーター・実行監視 | Logs、Metrics、Queue、Timeline、tokens、cost、latency、success rate、retry、bottleneckを監視できる。 | `src/components/BottomMonitor.tsx`, `src/state/workflowSelectors.ts`, `src/domain/connectionRules.ts` | MVP実装済み。Logs / Metrics / Queue / Outputタブ、Timeline、tokens/cost/latency/success/retry/bottleneck表示がある。 | error rate、parallelism、resource load、実行中キューの詳細制御は未実装。 | 実行シミュレーターをグラフ化し、retry/error経路とノード別メトリクスを強化する。 |
| UI-09 回収・評価・再作成 | PASS / REVIEW / FAIL、評価サマリー、差分、Human Review、Retry Plan、Improvement Promptを扱う。 | `src/components/StagePreview.tsx`, `src/components/BottomMonitor.tsx`, `src/components/AppShell.tsx` | ごく一部実装。CheckノードのPASS/REVIEW/FAILモック表示はある。 | 評価画面、品質スコア、差分、Human Review、再作成、改善案は未実装。 | Phase 3でCheck結果を独立したEvaluation modelにし、Retry/Error Routeへ接続する。 |
| UI-10 一周後の強化状態 | 実行サイクルからテンプレート、レシピ、ナレッジ、失敗パターン、改善案を保存・再利用できる。 | `src/components/TemplateLibrary.tsx`, `src/components/WorkflowHistoryPanel.tsx`, `src/storage/localTemplates.ts`, `src/storage/localWorkflowHistory.ts`, `src/components/BottomMonitor.tsx` | 部分実装済み。localStorageによるTemplate保存/Load/DeleteとSnapshot履歴保存/Load/Deleteがある。 | レシピ化、ナレッジカード、失敗パターン、改善提案、テンプレートメタデータ編集は未実装。 | Template modelにtags/version/source runを追加し、失敗/成功パターンの保存UIを設計する。 |

## Summary

The current implementation is aligned with the required bootstrap and Phase 1/2
MVP foundations: main canvas, parts palette, inspector editing, run monitoring,
stage preview, connection validation, connection editing, template mock, and
local workflow history. The largest remaining gaps are full drag connection,
evaluation/retry flows, security gates, and richer template/knowledge reuse.
