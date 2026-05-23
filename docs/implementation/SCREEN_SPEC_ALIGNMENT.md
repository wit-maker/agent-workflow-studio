# 画面設計整合表

Last updated: 2026-05-23

この文書は `Agent Workflow Studio` の現在実装と、AI Workflow Lab の画面設計仕様の対応関係を整理するためのものです。
原文仕様は `docs/source-specs/` に保持し、このファイルでは一致点、不足、次アクションのみを記録します。

| 仕様ID | 仕様上の要求 | 現在の実装ファイル | 実装状況 | 不足 | 次アクション |
|---|---|---|---|---|---|
| UI-01 全体俯瞰 / メインキャンバス | Workflow全体をノード、接続線、状態、実行操作、検証結果として俯瞰できる。Runで状態変化とログ追加が見える。 | `src/components/AppShell.tsx`, `src/components/WorkflowCanvas.tsx`, `src/components/NodeCard.tsx`, `src/components/ConnectionLine.tsx`, `src/components/ConnectionEditor.tsx`, `src/domain/sampleWorkflow.ts` | 部分実装済み。12個のMVPノード、接続線、Runモック、接続検証、選択式接続作成/削除がある。 | ドラッグ接続、pan/zoom、ミニマップ、グループレーン、自動レイアウトは未実装。 | Phase 3 で実行グラフ、エラールート、リトライ経路を追加し、その後ドラッグ接続を検討する。 |
| UI-02 全部品ライブラリ | 部品一覧、カテゴリ絞り込み、MVP部品表示、各部品の説明と入出力確認ができる。 | `src/components/PartsPalette.tsx`, `src/domain/sampleWorkflow.ts` | MVP実装済み。検索、カテゴリボタン、12部品、説明、入出力表示がある。 | リスク表示、agent role filter、data type filter、部品追加導線は未実装。 | 部品メタデータを増やし、risk / agent / data type filter を段階的に追加する。 |
| UI-05 成果物ステージ | Preview / Markdown / JSON / Diff などの成果物表示、承認・却下・保存・公開準備を扱う。 | `src/components/StagePreview.tsx`, `src/components/BottomMonitor.tsx`, `src/domain/workflow.ts` | 部分実装済み。プレビュー、Markdown、JSON タブと成果物表示、Check結果表示がある。 | Diff、承認、公開準備、人間レビュー、機密検知は未実装。 | artifact 型を拡張し、Review 状態、Diff 表示、公開前安全ゲートを追加する。 |
| UI-06 部品設定・ブロック編集 | 選択ノードの設定、入出力、Prompt、Tools、Security、Test、Last Run、History を編集・確認できる。 | `src/components/Inspector.tsx`, `src/components/ConnectionEditor.tsx`, `src/state/workflowReducer.ts`, `src/state/workflowActions.ts` | 部分実装済み。title、description、agentRole、config JSON 編集、ポート表示、接続編集がある。 | Prompt editor、Tools、Memory/Context、Security、Test Run、設定履歴は未実装。 | Inspector をセクション化し、Prompt / Security / Test / History を段階的に追加する。 |
| UI-08 観測メーター・実行監視 | Logs、Metrics、Queue、Timeline、tokens、cost、latency、success rate、retry、bottleneck を監視できる。 | `src/components/BottomMonitor.tsx`, `src/state/workflowSelectors.ts`, `src/domain/connectionRules.ts` | MVP実装済み。ログ、メトリクス、キュー、出力タブ、Timeline、主要数値表示がある。 | error rate、parallelism、resource load、実行中キューの詳細制御は未実装。 | 実行シミュレーターをグラフ化し、retry / error 経路とノード別メトリクスを強化する。 |
| UI-09 回収・評価・再作成 | PASS / REVIEW / FAIL、評価サマリー、差分、Human Review、Retry Plan、Improvement Prompt を扱う。 | `src/components/StagePreview.tsx`, `src/components/BottomMonitor.tsx`, `src/components/AppShell.tsx` | ごく一部実装。Check ノードの PASS / REVIEW / FAIL モック表示がある。 | 評価画面、品質スコア、差分、人間レビュー、再作成、改善案は未実装。 | Phase 3 で Check 結果を独立した Evaluation model とし、Retry / Error Route へ接続する。 |
| UI-10 一周後の強化状態 | 実行サイクルからテンプレート、レシピ、ナレッジ、失敗パターン、改善案を保存・再利用できる。 | `src/components/TemplateLibrary.tsx`, `src/components/WorkflowHistoryPanel.tsx`, `src/storage/localTemplates.ts`, `src/storage/localWorkflowHistory.ts`, `src/components/BottomMonitor.tsx` | 部分実装済み。localStorage によるテンプレート保存 / 読込 / 削除と履歴保存 / 読込 / 削除がある。 | レシピ化、ナレッジカード、失敗パターン、改善提案、テンプレートメタデータ編集は未実装。 | Template model に tags / version / source run を追加し、失敗 / 成功パターン保存 UI を設計する。 |

## 要約

現在実装は、bootstrap と Phase 1 / Phase 2 のMVP基盤には整合しています。主な残差は、完全なドラッグ接続、評価 / リトライ導線、
セキュリティゲート、テンプレート / ナレッジ再利用の厚みです。
