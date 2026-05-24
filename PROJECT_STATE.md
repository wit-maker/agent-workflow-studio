# Project State

Last updated: 2026-05-24

---

## M13〜M16 Connector Queue Safety and Recovery

- Branch: `feature/connector-queue-safety-recovery`
- Commits: M13/M14/M15 `a42f12f` / M14 docs `da88b83`

### 完了状況

| Milestone | 内容 | ステータス |
|---|---|---|
| M13 | Connector Execution Queue | ✅ 完了 |
| M14 | Credential Safety Boundary | ✅ 完了 |
| M15 | Error Recovery / Retry | ✅ 完了 |
| M16 | Alpha Hardening QA | ✅ 完了 |

### Browser QA

| No | シナリオ | 結果 |
|---:|---|---|
| 1 | アプリ起動 | ✅ |
| 2 | ノード追加 | — ヘッドレスブラウザ制限 |
| 3 | ノード編集 | — ヘッドレスブラウザ制限 |
| 4 | connector 割当確認 | ✅ Agent タブ: 6 mock コネクター |
| 5 | Run Selected | — Run All で代替 |
| 6 | Connector Queue 確認 | ✅ 12 ジョブ生成・ステータス表示 |
| 7 | Run All | ✅ 全ノード実行 |
| 8 | mock connector log 確認 | ✅ `[job: cjob-...]` 形式でログ記録 |
| 9 | failed / review_required 表示確認 | ✅ チェックノードで両ステータス確認 |
| 10 | retry 実行 | ✅ retryCount=1 → 成功 |
| 11 | reviewed 化 | ✅ review_required → 成功 |
| 12 | template 保存 | ✅ localStorage 保存確認 |
| 13 | reload | ✅ ページリロード後も状態維持 |
| 14 | workflow 復元 | ✅ 12 ノード復元確認 |
| 15 | queue / logs / metrics の保存範囲確認 | ✅ 下記参照 |
| 16 | storage reset | ✅ 確認ダイアログ → リセット実行 |
| 17 | build / lint | ✅ 両方パス |

### Persistence Scope

| 対象 | 保存 | 復元 |
|---|---|---|
| workflow | ✅ | ✅ |
| templates | ✅ | ✅ |
| run logs | ❌ | ❌ |
| connector queue | ❌ | ❌ |
| metrics | ❌ | ❌ |
| credential values | ❌ — 保存しない | ❌ |

### build / lint

- `npm run build`: pass (507.57 kB / gzip 152.65 kB)
- `npm run lint`: pass (0 errors)

### 既知の制限

- connector queue は React state のみ（リロードで消える）
- ノード追加・編集・接続作成はヘッドレスブラウザで未確認（既存制限）
- 実 API 接続・Credential 保存は未実装
- max retry 到達後はスキップのみ（再試行不可）

### Credential 方針

- Credential 値はいかなる場所にも保存しない
- UI state / localStorage / template / log / metrics への保存なし
- 将来候補: OS Keychain / Tauri secure storage / 環境変数
- 詳細: `docs/architecture/credential-safety-boundary.md`

### 次の推奨マイルストーン

M17〜M20:
1. Tauri 導入準備
2. ファイルシステム保存
3. 実 API 接続設計 / Credential 管理
4. コネクター実装順序決定

---

## M9〜M12 Alpha Integration QA

- Branch: `feature/alpha-foundation-connectors-persistence`
- Commits: M9 `9ffe53a` / M10 `f051be5` / M11 `209591e`

### Browser QA — 実施済み

| QA項目 | 結果 | 備考 |
|---|---|---|
| アプリ起動・初期表示 | ✅ | 12ノード正常表示 |
| エージェントタブ表示 | ✅ | 8タブ（ログ/メトリクス/キュー/出力/実行グラフ/評価/エージェント/ストレージ） |
| connector一覧表示 | ✅ | Codex Mock / Claude Mock / Gemini Mock / Hermes Mock / Grok/X Search Mock / Human Review |
| mock接続中通知 | ✅ | 「⚠ モック接続中 — 実APIは未接続です」バナー表示 |
| Run All実行 | ✅ | mode=all、ノード順次実行 |
| mock connector log確認 | ✅ | `[Hermes Mock / mock] 正規化 を処理しました。（NousResearch — 実API未接続）` 等、全5種コネクターがログに記録 |
| ストレージタブ表示 | ✅ | 保存済み/未保存の状態一覧・サイズ表示 |
| workflow auto-save | ✅ | 起動後に `現在のワークフロー: 8.3 KB 保存済み` |
| ストレージリセットボタン | ✅ | ボタン表示確認（実リセットはUI操作で要確認） |

### Browser QA — 未実施

| QA項目 | 理由 |
|---|---|
| node追加（PartsPalette） | headless browserでのUI操作未実施 |
| node編集（Inspector） | 未実施 |
| connection作成 | headless環境でのHandle DnD非対応（既存制限） |
| React Flow上でのノード移動 | headless環境でのPointerEvent非対応（既存制限） |
| Run Selected / Run From Selected | 未実施 |
| template保存・読込 | 未実施 |
| reload後のworkflow復元 | headless リロード操作未実施 |
| reload後のtemplate復元 | 未実施 |
| export JSON | headless環境ではfileダウンロード非対応（既存制限） |
| import JSON | headless環境ではfileダウンロード非対応（既存制限） |
| storage reset実行 | 未実施 |

### build / lint

- `npm run build`: pass (498.44 kB / gzip 150.59 kB)
- `npm run lint`: pass (0 errors)

### Console errors

- React StrictMode HMR由来の `useEffect dependency array size changed` は既存の既知問題（pre-existing）
- M9〜M12 由来の新規 runtime error なし

---

## M5 Node Add / Delete

- Branch: `feature/workflow-authoring-and-run-engine`
- Completed:
  - Added node authoring from `PartsPalette`.
  - Added collision-safe node id generation and cloned node config/ports/position.
  - Added selected-node deletion with in-app confirmation.
  - Deleting a node removes related workflow connections and safely moves selection.
  - Delete / Backspace now deletes selected nodes; React Flow selected edges still use the existing edge deletion path.
- Browser QA:
  - Initial display: 12 nodes.
  - PartsPalette Add node: 12 -> 13 nodes, added node selected, Inspector updated.
  - Delete selected node: confirmation panel shown, 13 -> 12 nodes after confirm, app remained stable.
  - Console runtime errors: none.
  - Export JSON: not directly downloaded in Codex in-app browser because downloads are unsupported; implementation serializes the updated workflow state used by Canvas/Inspector.
- build / lint:
  - `npm run build`: pass
  - `npm run lint`: pass
- Not implemented:
  - Drag-and-drop node creation.
  - In-canvas node add menu.
- Next candidates:
  - M6 Undo / Redo history for add/delete/edit/connect/move/import/reset.
- Known risks:
  - PartsPalette currently uses workflow nodes as authoring parts, so newly added nodes also appear as reusable parts.
  - Native browser downloads are not available in the in-app Browser QA surface.

## M6 Undo / Redo

- Branch: `feature/workflow-authoring-and-run-engine`
- Completed:
  - Added edit history with `past` / `future` snapshots in reducer state.
  - Added Undo / Redo actions and TopBar buttons.
  - Added Ctrl+Z, Ctrl+Shift+Z, and Ctrl+Y shortcuts outside editable fields.
  - History covers node add, node delete, node edit, connection add/delete reducer paths, node position updates, import workflow, and reset workflow.
  - Run logs / metrics / artifacts are kept outside edit-history restoration.
  - React Flow node movement now updates workflow positions; Inspector also exposes a stable move action for keyboard/browser QA.
- Browser QA:
  - Node add: Undo 13 -> 12, Redo 12 -> 13.
  - Node delete: Undo restored deleted node, Redo deleted again.
  - Node edit: title edit Undo / Redo restored Inspector and Canvas text.
  - Node move: Inspector Move selected right changed position, Undo restored position, Redo reapplied position.
  - Reset workflow: Undo restored pre-reset position state.
  - Console runtime errors: none.
- build / lint:
  - `npm run build`: pass
  - `npm run lint`: pass
- Not implemented:
  - Coalesced drag history entries for long continuous drags.
  - Dedicated visual history panel.
- Next candidates:
  - M7 template save/load/reuse hardening against current workflow collisions.
- Known risks:
  - React Flow drag simulation remains unreliable in the Codex in-app browser; movement was verified through the same reducer action via Inspector.
  - Connection add/delete history is implemented in reducer paths, but full browser manipulation of edge deletion still depends on the existing React Flow edge UI.

## M7 Template Feature

- Branch: `feature/workflow-authoring-and-run-engine`
- Completed:
  - Extended template metadata with source workflow/run, metrics summary, and artifact summary.
  - Template save keeps name, description, tags, category, node count, connection count, createdAt, updatedAt, source workflow, optional source run, metrics, and artifact summary.
  - Template load now instantiates a new workflow with a new workflow id and collision-safe node/connection ids.
  - Loaded template nodes reset to idle and connections reset to inactive for reuse.
  - Template duplicate keeps metadata and creates a new template id.
  - Existing confirmation flow before destructive template load is retained.
- Browser QA:
  - Template save: list count 0 -> 1, metadata/tags visible.
  - Template duplicate: list count 1 -> 2, copied template selected.
  - Template load: confirmation box shown, workflow restored with 12 nodes.
  - Console runtime errors: none.
- build / lint:
  - `npm run build`: pass
  - `npm run lint`: pass
- Not implemented:
  - Real file/database template persistence.
  - Template edit form after save.
- Next candidates:
  - M8 local run engine responsibility split and run modes.
- Known risks:
  - Template storage remains localStorage-bound.
  - Browser automation had intermittent coordinate translation failures on repeated template-card clicks after the visibility recovery path; primary save/duplicate/load QA passed before that issue.

## M8 Run Engine Strengthening

- Branch: `feature/workflow-authoring-and-run-engine`
- Completed:
  - Added `src/domain/runPlanner.ts`, `src/domain/nodeExecutors.ts`, and `src/domain/runEngine.ts`.
  - Added Run All, Run Selected, Run From Selected, and Dry Run buttons.
  - Run planner selects target nodes and produces a local execution queue.
  - Mock node executor handles PASS / REVIEW / FAIL for check nodes and skipped status for dry runs.
  - Run engine updates artifact, metrics, logs, retry candidates, and review/failure statuses without real API calls.
  - Added implementation note at `docs/implementation/LOCAL_RUN_ENGINE_M8.md`.
- Browser QA:
  - Run All FAIL: failed status, retry candidate, failed check node, artifact updated.
  - Run All REVIEW: review_required status, review pending artifact, no console errors.
  - Run Selected: selected node-only PASS run.
  - Run From Selected: verified in Browser QA before final recheck; mode appears in artifact.
  - Dry Run: validateOnly yes, skipped local execution, artifact/metrics updated.
  - Metrics tab: tokens, cost, latencyMs, successRate, retryCount, bottleneck updated.
  - Output tab: artifact summary updated and explicitly says no real API calls/adapters.
- build / lint:
  - `npm run build`: pass
  - `npm run lint`: pass
- Not implemented:
  - Real adapter/API calls.
  - Persistent queue storage or worker-based async engine.
  - Adapter plugin registry.
- Next candidates:
  - M9-style persistence strategy review for local workflows/templates/runs.
- Known risks:
  - AppShell still contains legacy run helper code behind an early return; future cleanup should remove it once run-engine behavior settles.
  - Dry run currently marks planned nodes as skipped after validating/planning rather than running a separate validation report object.

## PR #17 Review Fixes

- Branch: `feature/workflow-authoring-and-run-engine`
- Completed:
  - Fix 1: `runPlannedWorkflow` execution route regression — 前ノード→現ノードの遷移 edge を常に `main` route として記録するよう修正。`decision.route !== 'main'` の場合のみ、現ノード起点の別 route（review/error）を追加登録。
  - Fix 2: keyboard shortcut `useEffect` に dependency array `[selectedNodeId, workflow.nodes, dispatch]` を追加。stale closure を防ぐため `handleDeleteNode` の呼び出しもインライン化。
  - Fix 3: `runMockWorkflow` の `return` 後の unreachable dead code を全削除。`runPlannedWorkflow` を正規実装として確定。`buildArtifactContent` / `buildMetrics` は他のライブコードで使用中につき保持。
  - Fix 4: `ReactFlowCanvas` の workflow change effect から `writeReactFlowPositions` 呼び出しを削除。位置保存の責務は `handleNodesChange`（ドラッグ中）と `handleMoveNode`（ドラッグ確定）が担う。
  - Fix 5: `runEngine.ts` の `successRate` magic numbers を `SUCCESS_RATE_BY_OUTCOME` 定数（export）に置き換え。`AppShell.tsx` の `buildMetrics` 内でも同定数を import して使用。
- build / lint:
  - `npm run build`: pass (490.16 kB / gzip 148.09 kB)
  - `npm run lint`: pass (0 errors, 0 warnings)
- Browser QA:
  - アプリ起動: 正常（12 ノード初期表示、エラーなし）
  - console runtime errors: リロード後なし（HMR遷移時の useEffect hook shape 警告のみで、フル再起動後は消滅）

## Current Phase

feature/workflow-foundation-milestones — M0〜M4 連続実装中。

## Latest Progress

### Current Branch
- feature/workflow-foundation-milestones

### Completed Milestones
- M0: main sync / build / lint 確認済み。ブランチ作成済み。
- M1: Browser QA noise 調査・分類・防衛的修正を実施。
- M2: Workflow JSON import/export の信頼性強化を実施。
- M3: Inspector 編集フロー（dirty/保存/破棄/validation）の Browser QA 完走確認。
- M4: React Flow Canvas 操作結果の保存・復元・追従 Browser QA 完走確認。

### Verification
- npm run build: pass (476.65 kB / gzip 144.79 kB)
- npm run lint: pass (clean)
- Browser QA M4: 実施済み（下記 Notes 参照）

### Notes
- PR #15 は main に merge 済み確認。
- 既存 stale ブランチなし。
- 作業ブランチ feature/workflow-foundation-milestones を新規作成。
- **PartsPalette key warning**: React 18 StrictMode の初期ダブルレンダリング時のみ発生。ファイバーツリーのキーは `node-1`〜`node-12` で正常。再レンダリング・ノードクリック・検索フィルタ時は発生しない。機能上の影響なし。production build では StrictMode が非アクティブのため警告なし。
- **InspectorContent warning**: 同様に StrictMode 初期レンダリング時のみ発生。ノードクリックによる再マウント時は発生しない。
- **修正**: `Inspector.tsx` の `node.position?.x` を防衛的アクセスに変更（import データに position がない場合の実行時クラッシュを防止）。
- **M2 実装**: `validateWorkflowImport` を強化。`node.config`欠落→`{}`、`node.description`欠落→`''`、`node.position`欠落→`{x:0,y:0}`、`node.status`欠落→`'idle'`、`node.category`欠落→`'その他'` として補完。接続の source/target node 存在確認を追加し、不正な接続を安全に除外。`connection.id`欠落時は自動生成。
- **M2 Browser QA**: 欠損フィールドのある JSON import 成功・不正 JSON エラー表示・schema エラー表示・export→reimport→run のサイクルを確認。
- **M3 Browser QA**: title 編集→dirty バナー表示・保存ボタン有効化・保存→全UI反映（Inspector/Palette/Timeline/ReactFlow Canvas）・破棄→保存済み値へ復元・空 title 保存不可・invalid JSON 保存不可（赤ボーダー・整形 disabled）・保存後 dirty なしをすべて確認。
- **M4 Browser QA**:
  - 位置保存→リロード復元: localStorage(`agent-workflow-studio:react-flow-positions`)に{node-1:(111,222), node-5:(555,333), node-12:(999,444)}を書き込みリロード後、全ノードのtransformが一致することを確認。
  - Export JSON内容確認: 12ノード(各positionフィールドあり) / 13接続(sourceNodeId/targetNodeId/kind/carries/status)すべて含まれることを確認。
  - Import→state復元: 2ノード・1接続のテスト用JSONをimportし、ノード数・接続数・ワークフロータイトルが正確に復元されることを確認。
  - Import後Run: import直後にRunを実行しても接続が消えないことを確認（接続数1件維持）。
  - Console error: StrictMode初期ダブルレンダリングのキー警告のみ（既知・機能影響なし）。Runtime errorなし。
  - ノード移動→edge追従: headlessブラウザでのPointerEventシミュレーションが非対応のため実機確認推奨。コード上はonNodesChangeでposition changeを検出しwriteReactFlowPositionsを呼ぶ実装は確認済み。

---

## Previous Phase

Phase 7.4 Inspector ノード編集体験のハードニング。

## Completed

- `agent-workflow-studio` のローカルリポジトリを作成した。
- React + TypeScript + Vite のアプリ基盤を構築した。
- AI Workflow Lab の参照仕様を `docs/source-specs/` に取り込んだ。
- プロジェクト方針、アーキテクチャメモ、MVP範囲、README を追加した。
- 最小限のドメイン型、サンプルワークフロー、接続検証、ボトルネック計算を追加した。
- TopBar、PartsPalette、WorkflowCanvas、Inspector、StagePreview、BottomMonitor のUI骨格を追加した。
- `useReducer` ベースの workflow state 管理を追加した。
- Inspector で title、description、agent role、config JSON を編集可能にした。
- Workflow JSON export / import と最低限の検証を追加した。
- BottomMonitor をログ / メトリクス / キュー / 出力へ分離した。
- StagePreview をプレビュー / Markdown / JSON へ分離した。
- Canvas と Inspector に接続検証表示を追加した。
- ポート単位の接続表示と、選択式の接続作成 / 削除を追加した。
- localStorage によるテンプレート保存 / 読込 / 削除モックを追加した。
- localStorage によるワークフロー履歴保存 / 読込 / 削除を追加した。
- `AGENTS.md` をコスト・性能バランス型のモデル運用へ更新した。
- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` を追加し、画面仕様との対応表を作成した。
- Phase 2.5 として、UI表示文言、ログ文言、バリデーション文言、主要ドキュメントを日本語優先へ整えた。
- Phase 3 として、ExecutionGraph 型、実行ステップ履歴、review / error / retry / skip route の可視化を追加した。
- BottomMonitor に確認待ち操作、再試行操作、実行グラフ表示を追加した。
- StagePreview に executionGraph summary を追加した。
- Check ノードを `node.type === 'check'` ベースで判定するよう維持した。
- Phase 7 として `@xyflow/react` を導入した。
- `ReactFlowCanvas`、`ReactFlowNode`、`reactFlowAdapter` を追加した。
- 既存 `WorkflowCanvas` を残したまま、TopBar から `標準 / React Flow` を切り替えられるようにした。
- React Flow Canvas 上で Port Handle を表示し、Handle ドラッグで既存 reducer / validation を通して接続作成できるようにした。
- React Flow Edge の選択削除導線と Inspector 選択連動を追加した。
- `docs/implementation/REACT_FLOW_CANVAS_MVP.md` を追加した。
- Phase 7.1 として Canvas 表示モードの localStorage 保存を追加した。
- React Flow ノード位置の localStorage 保存と再表示時の復元を追加した。
- React Flow Canvas に「位置をリセット」導線を追加した。
- `docs/implementation/UNDO_REDO_POLICY.md` を追加し、本格 Undo / Redo はまだ入れず方針整理に留めることを明文化した。
- Phase 7.2 として React Flow Canvas に操作ヘルプを追加した。
- Edge / Connection 選択時の詳細カードを追加し、接続元ノード名、接続元ポート名、接続先ノード名、接続先ポート名、carries、kind、validation result を表示できるようにした。
- React Flow Canvas からの接続削除に確認導線を追加した。
- 無効接続・重複接続・同一ノード接続・不明ポート接続の理由を Canvas 上に表示できるようにした。
- Delete / Backspace でノード削除が未対応であることを Canvas 上に案内するようにした。
- ReactFlowNode の Port 表示を入力 / 出力、必須 / 任意、dataType、左右の接続位置が見やすい形へ調整した。
- Template 保存 / プレビュー / 読み込みの回帰確認を行った。
- `docs/implementation/REACT_FLOW_CANVAS_USABILITY.md` を追加した。
- Phase 7.3 として workflow JSON export / import のブラウザ完走確認を行い最小修正を実施した。
- export ファイル名に日付サフィックスを追加した（例: `workflow-bootstrap-mvp_2026-05-24.json`）。
- `revokeObjectURL` のタイミングを `setTimeout` で安全化した。
- import 成功時の確認メッセージ（4秒後に自動消去）を追加した。
- `.import-success` CSS クラスとグリッドレイアウト対応を追加した。

## Phase 3 実装内容

- ExecutionGraph
- ExecutionStep / ExecutionRoute
- review_required / failed / retry_ready / skipped の状態遷移
- 実行タイムライン
- retry candidate 表示と単体再試行
- Human Review の承認 / 差し戻し / スキップ
- 実行グラフの JSON 要約表示

## 日本語化対象

- UI表示文言
- ボタン、タブ、ラベル
- エラー表示
- 空状態メッセージ
- README、AGENTS.md、PROJECT_STATE.md、実装ドキュメント

## 英語のまま残すもの

- TypeScript の型名
- 変数名、関数名
- ファイル名、ディレクトリ名
- npm script
- branch名
- JSON key
- internal enum value
- 技術的に英語固定が安全な識別子

## MVP制限

- 実外部 API 接続なし
- Credential 保存なし
- Tauri / SQLite / Zustand なし
- Web Worker なし
- Human Review はローカル状態のみ
- retry は対象ノード単体のモック再試行のみ

## Phase 4 実装内容

- ローカル評価エンジン（7基準・100点満点・閾値判定）
- EvaluationPanel（スコアバー / 基準テーブル）
- HumanReviewPanel（承認 / 却下 / 修正依頼 / スキップ）
- RebuildPanel（再作成リクエスト一覧 / 実行 / キャンセル）
- ArtifactVersionHistory（バージョン履歴 / 切り替え）
- BottomMonitor に評価タブを追加（6タブ）
- StagePreview に評価・レビューバッジを追加
- 評価実行後にバージョン自動保存
- 再作成完了後にバージョン自動保存

## Phase 5 実装内容

- `WorkflowPort` 型（id / label / direction / dataType / required / description）
- `WorkflowPortDirection` 型
- `WorkflowNode` に `inputPorts?` / `outputPorts?` を追加
- `WorkflowConnection` に `sourcePortId?` / `targetPortId?` を追加
- `Workflow` に `schemaVersion?` を追加
- `src/domain/portRules.ts` 新規作成（getInputPorts / getOutputPorts / findPort / isPortConnected / getUnconnectedRequiredInputPorts / createPortsFromTypes）
- `connectionRules.ts` に `ConnectionValidationSeverity` を export
- `validateConnection` にポートID存在チェック・型互換チェックを追加
- `ConnectionDraft` を `sourcePortId` / `targetPortId` ベースに更新
- `ConnectionEditor` をポート対応に更新（required/optional 表示）
- `Inspector` のポートセクションをポートオブジェクトで表示、required 未接続警告を追加
- `NodeCard` のポート表示をポートオブジェクトで更新（必須ポートに `*` 表示）
- 旧 `inputTypes` / `outputTypes` による fallback 維持
- 旧接続（sourcePort / targetPort）との後方互換維持
- `docs/implementation/PORT_MODEL_MVP.md` 新規作成
- Phase 6 としてテンプレート metadata、検索、詳細プレビュー、複製、読込前確認を追加した。
- `src/domain/templateMetadata.ts` を追加し、Port / 評価 / ArtifactVersion 要約の生成を集約した。
- 既存 localStorage テンプレートに `metadata` がなくても読めるよう後方互換を維持した。
- `docs/implementation/TEMPLATE_REUSE_UX_MVP.md` を追加した。

## Phase 7.4 実装内容

- Inspector に `isDirty` 判定と「未保存の変更があります」バナーを追加
- 保存ボタン：変更なし時は「変更なし」(disabled)、変更あり時は「ノードを保存」(enabled)
- 「変更を破棄」ボタンを追加（未保存変更をすべてリセット）
- Config JSON リアルタイムバリデーション：有効時は緑ボーダー、無効時は赤ボーダー＋エラー文言
- 「JSONを整形」ボタンを追加（valid な JSON のみ整形、invalid 時は disabled）
- configValidation が invalid の場合は保存を blocked
- セクション再構成：基本情報 / 編集 / ポート / 接続検証 / メトリクス / 接続編集
- 出力ポート表示に `port.required ? '必須・未接続' : '任意'` を適用（入力ポートと統一）
- `key={selectedNode.id}` により別ノード選択時は InspectorContent を remount
- dirty 判定はセマンティック JSON 比較（整形差異では dirty にならない）

## Phase 7.4 追加修正（マージ前）

- `originalConfigJson` を `useState` 初期化から `useMemo([selectedNode.config])` に変更し、保存後に stale baseline が残らないようにした
- `saveChanges()` で `setTitle` / `setDescription` / `setConfigText` を保存後に正規化し、保存直後に dirty が残らないようにした

## Phase 7.4 Verification

- Model: claude-sonnet-4-6
- Branch: `feature/inspector-editing-hardening`
- `npm run build`: success
- `npm run lint`: success
- タイトル編集 → dirty バナー表示・保存ボタン有効化: OK
- 保存 → canvas / React Flow / 接続ドロップダウン / タイムライン に反映: OK
- 変更を破棄 → 全フィールドが保存済み値へリセット: OK
- agentRole 変更 → dirty バナー表示: OK
- Config JSON 無効 → 赤ボーダー・エラー文言・保存 disabled: OK
- Config JSON 有効 → 緑ボーダー
- JSONを整形 → compact JSON がインデント付きに整形: OK
- Export JSON → 編集済みタイトルが JSON に含まれる: OK
- Import JSON → 成功バナー・編集済み内容復元: OK
- Import → Run: 実行中ステータスに移行: OK
- Console error: なし（React Flow parent container warn は既存）

## Next Work

1. Phase 7.5 候補として React Flow 側の接続編集拡張とノード追加導線を検討する。
2. 評価結果と実行グラフを結びつけた差分表示を追加する。
3. テンプレートの version / metadata 編集を追加する。
4. localStorage MVP から永続ストレージへ進む条件を整理する。
5. reducer state が複雑化した場合のみ Zustand を再評価する。

## Known Risks

- 実行グラフはMVPであり、本格的な非同期エンジンや分散実行はまだ扱っていない。
- review / retry はローカルモックのため、セッションを跨いだ承認フローはない。
- localStorage ベースの保存はブラウザローカルに閉じるため、共有や永続保証はまだない。
- React Flow ノード位置保存は workflow 本体ではなく UI 補助状態として保存しているため、複数端末同期や共同編集はまだ考慮していない。
- Undo / Redo は方針整理のみであり、workflow 全体置換系の巻き戻しは未対応。
- テンプレート metadata は要約情報であり、ArtifactVersion 本体や評価履歴全文は保持しない。
- React Flow 上のノード削除は未対応であり、Delete / Backspace は説明メッセージのみ表示する。

## Screen Spec Alignment

- `docs/implementation/SCREEN_SPEC_ALIGNMENT.md` に UI-01、UI-02、UI-05、UI-06、UI-08、UI-09、UI-10 の整合表を記録している。
- `docs/implementation/EXECUTION_GRAPH_MVP.md` に Phase 3 の実行グラフMVPを整理している。
- `docs/implementation/TEMPLATE_REUSE_UX_MVP.md` に Phase 6 の再利用UX整理を記録している。
- `docs/implementation/REACT_FLOW_CANVAS_MVP.md` に Phase 7 の Canvas MVP を整理している。
- `docs/implementation/REACT_FLOW_CANVAS_USABILITY.md` に Phase 7.2 の操作性改善を整理している。
- `docs/implementation/UNDO_REDO_POLICY.md` に Phase 7.1 の Undo / Redo 方針を整理している。

## Phase 7 実装内容

- `@xyflow/react` を導入
- `src/components/ReactFlowCanvas.tsx` を追加
- `src/components/ReactFlowNode.tsx` を追加
- `src/domain/reactFlowAdapter.ts` を追加
- `WorkflowNode` / `WorkflowConnection` を React Flow の Node / Edge に変換
- 既存接続のうち port ID 未保持のものは representative handle を推定して可視化
- Handle ドラッグ接続時に `validateConnectionDraft(...)` と既存 `createConnection` reducer を再利用
- Edge 選択と「選択中の接続を削除」導線を追加
- Inspector とのノード選択連動を維持

## Phase 7.1 実装内容

- Canvas 表示モードを localStorage に保存し、再表示時に `標準 / React Flow` を復元
- 不正な Canvas mode 値は `standard` 扱いで安全にフォールバック
- React Flow ノード位置を localStorage に保存し、保存済み位置を `workflow.node.position` より優先して復元
- 存在しない node id の位置は無視し、JSON parse 失敗時も空扱いにする
- React Flow Canvas に「位置をリセット」ボタンを追加し、保存位置削除と初期配置復元を行う
- React Flow 側の node / connection lookup を軽く整理し、描画中の探索負荷を下げた
- Undo / Redo は実装せず、危険な対象範囲と将来案を `docs/implementation/UNDO_REDO_POLICY.md` に整理

## Phase 7.3 実装内容

- Workflow JSON export / import のブラウザ完走確認を実施（Export・Import・不正JSON・React Flow 再表示・Run を確認）
- export ファイル名に日付サフィックスを追加（`workflow-id_YYYY-MM-DD.json`）
- `URL.revokeObjectURL` を `setTimeout(100ms)` で安全化（Firefox 互換）
- import 成功時に緑バナーで確認メッセージを表示し、4秒後に自動消去
- `.import-success` CSS クラスを追加、`:has(.import-success)` グリッドレイアウト対応

## Phase 7.3 Verification

- Model: claude-sonnet-4-6
- Branch: `feature/json-import-export-browser-qa`
- `npm run build`: success
- `npm run lint`: success
- Export JSON: `workflow-bootstrap-mvp_2026-05-24.json` が正しい JSON 構造でダウンロード確認
- Import 有効 JSON: ワークフロー名変更・ノード復元・成功バナー表示を確認
- Import 不正 JSON (parse error): `Expected property name...` エラーバナー表示を確認
- Import 不正 JSON (schema error): `workflow.nodes は配列である必要があります。` エラーバナー表示を確認
- React Flow Canvas after import: 1ノードのインポート後も React Flow が正常表示を確認
- Run after import: import 後に Run が成功 (`成功` ステータス) を確認
- Console error: なし

## Phase 7.2 実装内容

- React Flow Canvas に操作ヘルプを追加
- 接続選択時の詳細カードを追加
- 接続削除に確認導線を追加
- 無効接続理由の Canvas 内表示を追加
- Delete / Backspace でノード削除未対応メッセージを表示
- ReactFlowNode の Port / Handle 視認性を改善
- Template 保存 / プレビュー / 読み込みの回帰確認を実施
- `docs/implementation/REACT_FLOW_CANVAS_USABILITY.md` を追加
- Review fix として、GPT-5.5 xhigh で Gemini Code Assist の指摘を反映し、接続開始時の失敗理由リセット、Port 方向ラベル日本語化、出力 Port の required / optional 表示修正、Edge 選択中 Delete キー削除導線を追加

## Phase 7.2 Verification

- Model: GPT-5.5 xhigh
- Branch: `feature/react-flow-canvas-usability`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 初期表示、標準 / React Flow 切替、操作ヘルプ、12ノード、13 edges、Edge 選択、接続詳細、Delete / Backspace 案内、Run、評価実行、Template 保存 / プレビュー / 読み込み、console error なしを確認
- Browser QA note: 接続削除は確認導線まで含めて実ブラウザで動作した。JSON export / import は in-app browser の download / file input 制約により今回の Browser QA では完走していない（Phase 7.3 で完走確認済み）

## Phase 6 実装内容

- `SavedWorkflowTemplate` に `metadata` を追加
- `createTemplateMetadata(...)` / `normalizeTemplateMetadata(...)` を追加
- template save 時に tags / category / description を受け取り metadata を生成
- 一覧で node 数、connection 数、未接続 required port 数、評価状態、評価スコア、ArtifactVersion 数を表示
- name / description / tag / category を対象にした検索を追加
- `TemplatePreview` でノード一覧、接続一覧、Port 要約、評価要約、ArtifactVersion 要約を表示
- 読み込み前に注意表示と確認 UI を追加
- テンプレート複製を追加
- localStorage 既存データの後方互換を維持

## Phase 7 Verification

- Model: Codex
- Branch: `feature/react-flow-canvas-mvp`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 標準 / React Flow 切替、12ノード描画、Port Handle 描画、Inspector 選択連動、接続削除導線、最新ビルドの console error なしを確認
- Browser QA note: in-app browser automation では Handle ドラッグを安定再現できず、接続作成 / 無効接続拒否はコード経路と DOM 構造中心で確認

## Phase 7.1 Verification

- Model: Codex
- Branch: `feature/react-flow-canvas-stability`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 初期表示、Canvas モード切替、React Flow 表示、モード再読込、ノード位置復元、位置リセット、位置リセット後の再読込、標準 Canvas 復帰、Run、評価実行を確認
- Browser QA note: テンプレート保存 / プレビュー、JSON export / import は今回の Browser QA 対象外。console には今回の修正後に新規 error は出ていない

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

## Phase 3 Verification

- Model: Codex (実装) / Claude Sonnet 4.6 (引き継ぎ・QA)
- Branch: `feature/execution-graph-error-retry`
- `npm run build`: success
- `npm run lint`: success
- Browser QA: 実施済み
  - 初期画面・12ノード表示: OK
  - Runボタン動作・実行ログ追加: OK
  - FAIL分岐: チェックノードが failed、エラー経路が作られ、再試行候補に「チェック」が表示される: OK
  - 再試行ボタン: 押下後 success に切り替わり、判定 PASS へ更新: OK
  - REVIEW分岐: チェックノードが review_required、確認待ちに「承認して続行 / 差し戻し / スキップ」が表示される: OK
  - 承認して続行: 押下後ワークフローが続行し、判定 PASS へ更新: OK
  - PASS直行: 全12ノードが順に complete、Bootstrap MVP 成果物が作られる: OK
  - BottomMonitor「実行グラフ」タブ: Run ID・再試行候補・経路一覧が表示される: OK
  - StagePreview executionGraph summary: 最終判定・確認待ち・失敗ノード・再試行候補が表示される: OK
  - ログ文言: 日本語で全ノードのログが記録される: OK

## Phase 7.2 マージ前最終修正

- Branch: `feature/react-flow-canvas-usability`
- `handleConnectEnd` で `isValid !== false` を no-op に変更（`true` / `null` は何もしない、`false` のみエラー表示）
- 接続キャンセル / 空白ドロップ時の不要なエラー表示を抑制
- `npm run build`: success
- `npm run lint`: success

## PR #16 review fix

- `validateWorkflowImport` の enum 整合を domain 型に合わせて修正
- `Workflow` の unsafe spread を廃止し、全フィールドを明示マッピング
- `position.x` / `position.y` の finite number validation を追加
- connection id 欠損時の collision-free 生成を追加
- `connection.metrics` の import preservation を追加
- `npm run build`: success
- `npm run lint`: success
- Browser QA: not run（review fix が import normalization 限定のため）
