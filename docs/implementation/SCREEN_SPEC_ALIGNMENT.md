# 画面設計整合表

Last updated: 2026-05-23

この文書は `Agent Workflow Studio` の現在実装と、AI Workflow Lab の画面設計仕様の対応関係を整理するためのものです。
原文仕様は `docs/source-specs/` に保持し、このファイルでは一致点、不足、次アクションのみを記録します。

| 仕様ID | 仕様上の要求 | 現在の実装ファイル | 実装状況 | 不足 | 次アクション |
|---|---|---|---|---|---|
| UI-01 全体俯瞰 / メインキャンバス | Workflow全体をノード、接続線、状態、実行操作、検証結果として俯瞰できる。Runで状態変化とログ追加が見える。 | `src/components/AppShell.tsx`, `src/components/WorkflowCanvas.tsx`, `src/components/NodeCard.tsx`, `src/components/ConnectionLine.tsx`, `src/components/ConnectionEditor.tsx`, `src/domain/sampleWorkflow.ts` | Phase 3 までで部分実装済み。12個のMVPノード、接続線、Runモック、接続検証、選択式接続作成/削除、ExecutionGraph 起点の状態可視化がある。 | ドラッグ接続、pan/zoom、ミニマップ、自動レイアウトは未実装。 | Phase 4 以降で評価結果と実行グラフを重ね、必要ならドラッグ接続を検討する。 |
| UI-02 全部品ライブラリ | 部品一覧、カテゴリ絞り込み、MVP部品表示、各部品の説明と入出力確認ができる。 | `src/components/PartsPalette.tsx`, `src/domain/sampleWorkflow.ts` | MVP実装済み。検索、カテゴリ、12部品、説明、入出力表示がある。 | agent role filter、data type filter、追加導線は未実装。 | 部品メタデータを増やし、filter 系を段階的に追加する。 |
| UI-05 成果物ステージ | Preview / Markdown / JSON / Diff などの成果物表示、承認・却下・保存・公開準備を扱う。 | `src/components/StagePreview.tsx`, `src/components/BottomMonitor.tsx`, `src/domain/workflow.ts`, `src/domain/executionGraph.ts` | Phase 4 までで部分実装済み。成果物表示に executionGraph summary、評価結果、Human Review 状態を含めた。 | Diff、公開準備、人間承認の永続化は未実装。 | 評価差分と ArtifactVersion 比較表示を追加する。 |
| UI-06 部品設定・ブロック編集 | 選択ノードの設定、入出力、Prompt、Tools、Security、Test、Last Run、History を編集・確認できる。 | `src/components/Inspector.tsx`, `src/components/ConnectionEditor.tsx`, `src/state/workflowReducer.ts`, `src/state/workflowActions.ts` | 部分実装済み。title、description、agentRole、config JSON 編集、ポート表示、接続編集がある。 | Prompt editor、Tools、Security、Test Run、設定履歴は未実装。 | Inspector を段階的に拡張する。 |
| UI-08 観測メーター・実行監視 | Logs、Metrics、Queue、Timeline、tokens、cost、latency、success rate、retry、bottleneck を監視できる。 | `src/components/BottomMonitor.tsx`, `src/components/ExecutionGraphPanel.tsx`, `src/domain/executionGraph.ts`, `src/state/workflowSelectors.ts` | Phase 3 で大きく前進。ログ、メトリクス、キュー、出力、実行グラフ、再試行候補、確認待ち導線がある。 | error rate、parallelism、resource load、複数run比較は未実装。 | 実行グラフと評価情報の連携、比較ビューを追加する。 |
| UI-09 回収・評価・再作成 | PASS / REVIEW / FAIL、評価サマリー、差分、Human Review、Retry Plan、Improvement Prompt を扱う。 | `src/components/StagePreview.tsx`, `src/components/BottomMonitor.tsx`, `src/components/AppShell.tsx`, `src/domain/executionGraph.ts`, `src/domain/evaluationRules.ts` | Phase 4 までで部分実装済み。PASS / REVIEW / FAIL 分岐、評価スコア、Human Review モック、再作成、ArtifactVersionHistory がある。 | 差分、人間承認の永続化、改善案の蓄積は未実装。 | 評価結果と実行グラフを結びつけた差分表示を追加する。 |
| UI-10 一周後の強化状態 | 実行サイクルからテンプレート、レシピ、ナレッジ、失敗パターン、改善案を保存・再利用できる。 | `src/components/TemplateLibrary.tsx`, `src/components/TemplatePreview.tsx`, `src/storage/localTemplates.ts`, `src/domain/templateMetadata.ts`, `src/components/BottomMonitor.tsx` | Phase 6 までで部分実装済み。localStorage によるテンプレート保存 / 読込 / 削除 / 複製、metadata 付与、検索、詳細プレビュー、読込前確認がある。 | レシピ化、ナレッジカード、失敗パターン保存、共有、差分比較は未実装。 | React Flow 導入後も使える metadata 基盤として育て、次に差分表示と version 編集へ進む。 |

## 要約

現在実装は bootstrap、Phase 1、Phase 2、Phase 2.5、Phase 3、Phase 4、Phase 5、Phase 6 のMVP基盤に整合しています。
主な残差は、差分表示、永続的な Human Review、ドラッグ接続、共有可能なテンプレート再利用の厚みです。
