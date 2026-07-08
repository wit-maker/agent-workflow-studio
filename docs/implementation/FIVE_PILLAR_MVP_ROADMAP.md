# Five-Pillar MVP Roadmap

## この変更でユーザーは何ができるようになったか

Agent Workflow Studio の次期実装を、Canvas First / Game HUD / safe runtime audit の既存基盤を壊さずに、5本柱を小さな vertical slice で太くする順序として進められる。

**MVP の到達点は、認知HUD(注意配分編集レイヤー)を完成状態で MVP に載せることである(2026-07-07 ゴール訂正)。** safe projection / MVP surface は完成へ向かう中間足場であり、最終到達点ではない。完成の判定基準は本書の「認知HUD完成条件チェックリスト」に従う。

この文書は `docs/project/ACTIVE_PLAN.md` が選択した実装補助文書である。現在の計画選択は `ACTIVE_PLAN.md` が優先し、この文書は phase の境界、完了条件、禁止事項を具体化する。

## Position

- `docs/source-specs/**` は source material として read-only のまま扱う。
- Broad epics #31 / #34 / #37 / #46 は open 前提であり、薄い slice で閉じたと主張しない。ただし roadmap 全体の到達点は認知HUD完成であり、「完成させない」ことがガードレールなのではない。ガードレールは「未完成のものを完成と呼ばない」ことである。
- 実装は multi-PR とする。全Phaseを1つの巨大PRにまとめない。
- 各PRは、Scratch操作、mock connector/runtime、HUD注意配分、safe audit、Situation Assistant、template/history の接続を意識する。
- Scratch は見た目ではなく操作原理として組み込む。詳細は本書の「Scratch統合原則」に従う。
- Public interface additions は、まず safe metadata / derived view model / pure helper として追加する。

## Current Foundations

Reused foundations:

- UI shell: `GameHudShell`, `CognitiveWorkflowCanvas`, `CognitiveHudOverlay`, selected node/edge HUD, drawer surfaces.
- Runtime: `runPlanner`, `runEngine`, `nodeExecutors`, `executionGraph`.
- Safe audit: `runtimeAuditContract`, `runtimeEvents`, `runAuditEdgeReplay`, `runDetail`.
- Situation Assistant: `briefingInputCollector`, `briefingPromptBuilder`, `MockBriefingAdapter`.
- Templates/storage: `localTemplates`, storage adapter boundary, existing run history key.

## Global Boundaries

- No real API connection.
- No credential persistence.
- No `.env` work.
- No new dependency.
- No Tauri, SQLite, or Zustand introduction.
- No new localStorage key unless `ACTIVE_PLAN.md` explicitly selects a storage-boundary slice first.
- No raw prompt, raw payload, raw config, artifact body, credential, token, password, or API key display, copy, log, audit, briefing, template summary, or persistence.
- No arbitrary expression evaluation.
- No `xhigh` reasoning unless the user explicitly writes `ALLOW_XHIGH`.

## Phase Roadmap

| Phase | Slice focus | Required outcome |
|---|---|---|
| 1 | Plan Selection / Guardrail | `ACTIVE_PLAN.md` selects this roadmap; this file records boundaries; `CONCEPT_CHECKLIST.md` remains mandatory. |
| 2 | UI Shell Recomposition | Canvas First stays primary. Bottom monitor style surfaces become detail drawers. Canvas overlays cover failure, review-required, validation-warning, replay-ready route evidence, and bottlenecks. |
| 3 | Five-Pillar Vertical Slice Thickening | One visible mock path connects parts operation, mock connector run, safe runtime trace, HUD focus, Run Detail replay, 4D briefing, and template/history. |
| 4 | Scratch Layer | `PartsPalette` and React Flow add/connect/select/delete flows are hardened without replacing reducer architecture or English identifiers. 到達点は「Scratch統合原則」の4原則を満たす操作レイヤー。 |
| 5 | Mock Connector Layer | Trigger, Action, Adapter, Retry, Error Route, Human Review, and Rate Limit placeholder states expand as fixed mock policies. Write-like actions require Human Review Gate. |
| 6 | Workflow Runtime Layer | Run All, Run Selected, Run From Selected, Dry Run, and Validate remain. Stop, Resume, and Replay are safe mock runtime behaviors only. `node.type === "check"` remains the behavior source. |
| 7 | Cognitive HUD Layer | HUD acts as attention allocation through badges, dimming, central cards, replay cues, bottleneck/flow-pressure projections, and safe short-tone planning notes where allowed. 到達点は「認知HUD完成条件チェックリスト」の全項目達成。 |
| 8 | Situation Narration Layer | Pure mock helpers provide timeline extraction, situation summary, cause analysis, future risk, briefing script, and human decision prompt outputs. |
| 9 | Observation Layer | Safe derived metrics represent flow pressure, latency, cost, retry, queue, success/failure rate, and bottleneck state. No external telemetry. |
| 10 | Edge Replay / Audit Layer | Existing `traceAudit.edgeReplayRecords` and safe runtime events drive visual reconstruction candidates from metadata only. |
| 11 | Templates / Recipes / Failure Patterns | Existing template/history boundaries gain allowlisted summaries for successful paths, failure patterns, and next-action hints. Loading regenerates workflow, node, and connection IDs. |

## 認知HUD完成条件チェックリスト

MVP に載せる認知HUDの「完成状態」は、以下を満たした状態を指す。根拠は `docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md` §2〜§4 と `docs/audit/missing-systems.md` の full layer elements。

### 1. 状態駆動の変換動作

- L0(通常)〜L5(危険操作/実行停止)の状態レベルが、選別・圧縮・強調・通知・介入の閾値を実際に切り替える。
- L0〜L2 は減光・サマリ寄り、L3 以上はフォーカス・通知・介入カードへ重みが移る。
- `HudSignal` に対する PriorityScore 計算が存在し、表示順・強調度・通知タイミングの入力になる。

### 2. 表示要素(注意配分の出力面)

以下の16要素が、1つのパネルではなく Canvas / Inspector / Console / モーダル / 通知に分散して機能する。

| 要素 | 完成条件 |
|---|---|
| Focus Lens | 今見るべき箇所だけを明るく保つ |
| Alert Layer | 危険・失敗・承認待ちを前面に出す |
| Minimap Warning | 視界外の異常を MiniMap 側で示す |
| Bottleneck Highlight | 詰まり箇所を強調する |
| Human Review Spotlight | 承認待ちを見落とさせない |
| Audio Cue | Critical のみの短音通知(常時TTS化はしない) |
| Depth Layer | 重要度に応じた奥行き / 減光 |
| Auto Hide / Reveal | 不要情報を一時的に隠す / 戻す |
| HUD Badge | node / edge 上の常時重要度バッジ(選択時のみではない) |
| Center HUD Card | 画面中央の決定的状況カード |
| Approval Pending HUD | 承認待ち専用の集約カード |
| Failure Cause Card | 失敗原因をたどれるカード |
| Focus Overlay | 注目すべき経路だけを浮かせる |
| Path Dim | 不要経路を減光する |
| Notification Bundle | 短時間の通知をまとめて1件にする |
| HUD History | 過去の HUD 表示を後追いできる履歴 |

### 3. 横断協調と設定

- Cross-surface orchestration: HUD が Canvas / Inspector / Console / モーダル / 通知を協調させ、1つのタブやパネルに閉じない。
- 永続HUD設定(danger visibility / focus / notification / collapse): `ACTIVE_PLAN.md` で storage-boundary slice を選択してから、既存 storage adapter 境界内で実装する。

### 4. 完成状態でも不変の境界

- raw config / prompt / payload / artifact body / credential / token / password / API key の表示・保存・copy は完成状態でも禁止。
- 色だけで危険度を伝えない、重要警告をログだけに隠さない等の UX 禁止事項(設計書 §8)を満たす。
- 各スライスは `CONCEPT_CHECKLIST.md` の classification を続け、チェックリスト全達成まで「認知HUD完成」を主張しない。

## Scratch統合原則

Scratch は見た目ではなく操作原理として組み込む。根拠は `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md` §5.1 と `docs/project/concept-layer-correction.md` §4.1。

### 4原則

1. **文法エラーレス**: ブロックの「形」に相当するのは型付きポート制約。最終形は「接続後に警告」ではなく「非互換の接続はドラッグ時点で嵌まらない」。
2. **即時フィードバック**: 置く・つなぐ・実行するの各操作が即座に視覚応答を返す。ステージ(実行結果・成果物プレビュー)が操作の鏡になる。
3. **Low floor / High ceiling**: 最初の1部品は誰でも置けて、12部品分類の組み合わせで本格的なAIオーケストレーションまで届く。
4. **Tinkering & Remix**: 完成前に触って試せる。成功構造はテンプレート/レシピとして保存・再利用でき、load 時に ID を再生成する。

### 要素対応(仕様書 §5.1)

| Scratch要素 | 本システムでの置換 | 現在の実装先 |
|---|---|---|
| ブロック | AI作業部品(12分類) | `PartsPalette` semantic parts |
| 接続形状 | 型付きポート制約 | `portRules` / `connectionRules` / shared `connectionValidation` |
| ステージ | 実行結果・成果物プレビュー | `StagePreview` / Run Detail |
| スプライト | AIエージェント | `AgentRole` + mock connector |
| イベント | 作業開始条件 | `manual-trigger` 部品 |
| メッセージ | エージェント間通信 | `ConnectionKind` |
| 変数 / リスト | ワークフロー内状態 / 複数結果 | node config / `aggregate` 部品 |

### 認知HUDとの統合点

Scratch操作の即時フィードバックは、認知HUDの表現チャネル(強調 / 減光 / バッジ / 通知)を共有する。操作イベント自体が注意配分の入力になる。

### 残ギャップ(今後のslice候補)

- ~~ドラッグ中のスナップ誘導: 互換ポートだけ発光、非互換ポートを減光。~~ 実装済み(Scratch snap-guidance slice)。ドラッグ中の非互換接続拒否は React Flow `isValidConnection` + shared validator で既に成立している。
- ~~部品の自己記述性: 部品カード上の入出力型バッジ・役割色。~~ 実装済み(部品の自己記述性 slice)。
- 置いた瞬間のステージ応答: Run 前でも部品追加・接続時に軽量チェックが即反映。
- Remix完成: 成功パターン / 失敗パターンのレシピ化(Phase 11)。

## Slice Completion Contract

Every implementation slice must prove the following before commit/PR:

- The slice stays on a `codex/five-pillar-<slice-name>` branch unless it is the roadmap planning branch.
- `docs/source-specs/**` is unchanged.
- `PROJECT_STATE.md` records branch, model gate, scope, concept checklist classification, safety boundary, validation, browser QA when relevant, and remaining gaps.
- `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` pass.
- `npm.cmd run qa:direct` runs when storage, import/export, run-audit, runtime-audit, or persistence paths are touched.
- Browser QA runs for touched UI surfaces, covering initial render, canvas render, palette/drawer/console toggles, Validate, Run modes, selected node/edge HUD, Run Detail, replay cue, Situation Assistant output sections, and template save/load availability as applicable.
- Safety QA confirms no raw config, prompt, payload, artifact body, credential, token, password, or API key appears in HUD, Run Detail, audit, briefing, template summary, or copy text.

## Recently Implemented Slice

**Scratch snap-guidance / drag-time connection prevention slice**

Result: `src/domain/connectionSnapGuidance.ts` の pure helper が、接続ドラッグ開始時に shared validator(`explainConnectionAttempt` を注入)で全ノード×対象ポートの互換性を導出する。互換ノードは発光・互換ポートは `接続可` バッジ、非互換ノードは減光、canvas status HUD にドラッグ中のみ `snap誘導: 互換ポート N 件` の live cue を表示し、ドラッグ終了で session-only state ごと消える。ドラッグ時点の非互換接続拒否は既存の React Flow `isValidConnection` + shared validator が担う。

Boundaries:

- No new storage key.
- No raw prompt, raw payload, raw config, artifact body, credential, token, password, or API key display.
- No expression evaluation.
- No real API behavior.
- Reducer/runtime behavior is unchanged.
- Snap guidance is session-only drag feedback; validation logic itself stays in shared selector/domain code.

## Recently Implemented Slice (2)

**部品の自己記述性 slice(Scratch統合原則 第3原則)**

Result: `src/domain/nodeVisuals.ts` の `categoryToTone` / `agentRoleTone` を単一の変換元として、`PartsPalette` カード・`NodeCard`・`ReactFlowNode` のいずれにも型バッジ(`.node-type-badge-*`)と役割色(`.node-role-chip-*`)を表示するようにした。配色は既存の `.workflow-group-*` グルーピング枠と揃え、ノードが属するグループの縁取り色とバッジ色が一致する。`buildWorkflowGroups` もこの共有マッピングを使うようリファクタし、カテゴリ→トーンの二重管理を解消した。

Boundaries:

- Display-only change; reducer/runtime/storage behavior is unchanged.
- No new storage key.
- Japanese labels stay paired with English identifiers.
- No raw config, prompts, payloads, or credential-like values displayed.

## Next Slice Candidate

残ギャップのうち未着手のものは以下(優先順位は未確定。次スライス選定時に `docs/project/ACTIVE_PLAN.md` で選ぶ):

- **置いた瞬間のステージ応答**: Run 前でも部品追加・接続時に軽量チェックが即反映。
- **Remix完成**(Phase 11): 成功パターン / 失敗パターンのレシピ化。
