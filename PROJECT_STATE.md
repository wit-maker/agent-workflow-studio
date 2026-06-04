# Project State

Last updated: 2026-06-05

---

## Phase Edge Durable Replay / HUD Signal Naming Correction

- Branch: `codex/edge-durable-replay-record`
- Date: 2026-06-05
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` の次スライスとして、safe edge-level durable replay record を既存 run history / `traceAudit` 内に追加する。追加のユーザー訂正により、Bottom Console の `認知HUD` タブ表現を `注意信号` / `HudSignalList` に修正し、認知HUD本体をタブではなく canvas / shell attention layer として扱う。新 localStorage key、backend/API、credential storage、dependency、source-specs、GitHub issue state は変更しない。

### Implemented

- `src/domain/runAuditEdgeReplay.ts` を追加し、safe `RuntimeAuditContractEvent` から edge 単位の `RunAuditEdgeReplayRecord` を生成・normalize する pure helper を実装した。
- `RunTraceAuditSummary` に optional-compatible な `edgeReplayRecords` を追加した。
  - 保存先は既存 `agent-workflow-studio.run-history.v1` record 内の `traceAudit`。
  - 新 localStorage key は追加していない。
  - 古い record は normalize 時に `runtimeEvents` から safe edge replay records を再構築する。
- `RunDetailPanel` に `durable safe edge replay` 表示を追加した。
  - edge の通過 event count、route kinds、event kinds、severity mix、latest safe summary、condition/delay/retry/error-route の safe metadata だけを表示する。
  - raw config / prompt / payload / artifact body / credential / token / API key は view model に含めない。
- `SelectedEdgeHud` に durable replay summary を追加した。
  - Copy summary も edge id / source / target / status / counts / latest safe event summary に限定した。
- React Flow edge runtime class に `edge-replay-observed` / `edge-replay-warning` / `edge-replay-error` / `edge-replay-retry` / `edge-replay-error-route` を追加し、safe edge replay summary を canvas 上の edge 強調・警告表示へ反映した。
- Bottom Console の旧 `HUD` tab 表示名を `注意信号` に変更し、`CognitiveHudPanel` を `HudSignalList` にリネームした。
  - 内部 tab id `HUD` は既存 `localAppSettings` 互換のため維持した。
  - このパネルは補助的な signal inspection surface であり、Cognitive HUD body とは記述しない。
- `SituationPanel` の案内文を、`認知HUD` ではなく `Console HUD の注意信号一覧` へ変更した。
- `ACTIVE_PLAN.md` / audit docs を更新し、edge replay record の実装と HUD signal naming correction を反映した。

### Concept checklist classification

- Classification: safe projection / detail-history surface / canvas attention behavior / naming correction.
- Cognitive HUD claim: safe edge replay summary を canvas edge の強調・減光・警告 class へ投影する attention behavior。`HudSignalList` は補助的な信号一覧であり、Cognitive HUD 本体ではない。
- Run Detail claim: edge replay evidence は detail/debug surface。Run Detail は認知HUD本体ではない。
- Situation Assistant claim: なし。Briefing / Assistant は HUD signals、Run Trace、logs、metrics を読めるが、タブへ縮小しない。
- Runtime Audit claim: safe `traceAudit.edgeReplayRecords` を既存 run history record 内に追加した。full animated replay、visual route reconstruction、expression evaluation ではない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は保存・表示・copy summary に含めない。

### Validation

- `npm.cmd run qa:direct`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA

- Preview: `http://127.0.0.1:4179/`
- Initial render: app title、React Flow canvas、Run command HUD が表示されることを確認した。
- Bottom Console: `C` toggle で Console HUD を開き、tab list が `注意信号 / ログ / ... / 4D説明 / 実行詳細` になっていることを確認した。
- Naming correction: Browser 表示上に旧 `認知HUD` ラベルが出ないことを確認した。
- Run / Edge HUD: Run 実行後に React Flow edge を選択し、`L2 Flow HUD` と replay summary が表示されることを確認した。
- Run Detail: `T` で Run Detail を開き、`durable safe edge replay` / edge replay evidence が表示されることを確認した。
- Canvas edge projection: React Flow edge class に `edge-replay-observed` が付くことを確認した。
- Raw sentinel check: Browser 表示上に `RAW_PROMPT_SENTINEL` / `RAW_PAYLOAD_SENTINEL` / `CREDENTIAL_SENTINEL` / `PASSWORD_SENTINEL` / `BEARER_SENTINEL` / `sk-live-direct-qa-secret` が出ないことを確認した。
- Console error: 0。
- External script/link/image asset: 0。
- Note: Browser runtime で `performance.getEntriesByType` は読めなかったため、DOM の `script[src]` / `link[href]` / `img[src]` で外部 asset を補完確認した。

### Remaining gaps

- Broad epics #31 / #34 / #37 / #46 は open 前提のまま。今回のスライスは epic closure ではない。
- Full animated replay engine、visual route reconstruction、full branch graph enforcement、expression evaluation、durable notification state、persisted HUD preferences、critical short-tone audio、real assistant audio/avatar/video renderers は未実装。
- `HudSignalList` への命名修正は product code では完了したが、古い historical task docs / source-specs には過去状態や禁止例として `CognitiveHudPanel` / HUD tab 記述が残る。

### Next recommended slice

1. HUD notification durability plan: read/ack/pin を永続化する必要があるか、永続化する場合に既存 storage boundary のどこに置くかを決める。
2. Edge replay visual reconstruction candidate: safe edge replay records を visual route replay 候補へ使う。ただし metadata-only first、Browser QA coverage 更新後に進める。
3. Concept naming cleanup continuation: historical docs と現行 docs の境界をさらに明確にする。

---

## Phase Active Plan Completion Tightening

- Branch: `codex/active-plan-completion-tightening`
- Date: 2026-06-05
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` に残っていた3候補をまとめて完了する。対象は Revived audit snapshot runtimeEvents tightening、HUD notification read/ack/pin session behavior、Concept naming cleanup。新 localStorage key、backend/API、credential storage、dependency、source-specs、GitHub issue state は変更しない。

### Implemented

- `reviveRunTraceFromAuditSummary(...)` が normalized safe `traceAudit.runtimeEvents` を revived `RunTrace.runtimeEvents` へ戻すようにした。
  - Run Detail の timeline / replay candidate は、current trace と selected audit snapshot のどちらでも同じ safe runtime event 経路を使える。
  - raw config / prompt / payload / artifact body / credential / token / API key は `RuntimeAuditContractEvent` の safe boundary に引き続き入らない。
- `HudNotificationBundle` に session-only の read / acknowledge / pin 投影を追加した。
  - read は unread count から外す。
  - acknowledge は unpinned 通知を active list から外す。
  - pin は acknowledged でも表示を保持する。
  - 状態は `GameHudShell` の React state のみで保持し、保存しない。
- `BriefingPanel` / Bottom Console tab / `AssistantPanel` の表示ラベルを、full Situation Assistant ではなく `4D Text Briefing MVP` / `4D説明` として読める方向へ寄せた。
- `npm.cmd run qa:direct` に以下を追加した。
  - revived audit snapshot の runtimeEvents timeline / replay 検証。
  - HUD notification session read/ack/pin projection 検証。
  - forbidden sentinel 非表示と storage key unchanged の既存検証を維持。
- `ACTIVE_PLAN.md` を更新し、今回の3候補を Completed Plan Slices へ移した。次は未選定の broad candidate から新しい小スライスを選ぶ状態。
- audit docs を更新し、session-only 実装と durable/persisted 未実装を分けて記録した。

### Concept checklist classification

- Classification: MVP surface / safe projection / session behavior / detail-history surface.
- Cognitive HUD claim: HUD notification の on-demand surface を session-only に強化した。Cognitive HUD 全体完成、永続HUD設定、durable notification model ではない。
- Situation Assistant claim: text explanation surface の命名誤認を減らした。Situation Assistant 本体、音声、アバター、動画生成、timeline narration は実装していない。
- Runtime Audit claim: revived audit snapshot が safe runtimeEvents を Run Detail timeline / replay へ一貫して渡せるようにした。full animated replay、full route reconstruction、edge-level durable replay record、expression evaluation ではない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は表示・保存・copy summary に含めない。direct validation と Browser sentinel check で確認した。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。notification read/ack/pin は session state のみ。

### Validation

- `npm.cmd run qa:direct`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- Notification HUD: `N4` で HUD Feed を開き、Read / Ack / Pin が表示されることを確認した。
- Notification session behavior: 1件を Pin + Read + Ack すると `pinned / acknowledged` として残り、別の unpinned 通知を Ack すると active list から外れて collapsed count が増えることを確認した。
- Run Detail: `T` で Run Detail を開き、audit snapshot option に `runtime 17` が表示されることを確認した。
- Revived audit replay: audit snapshot を選択し、`durable audit snapshot / events 32 / runtime 17`、`Audit replay / failed / evidence 63 / runtime 17`、`Safe metadata replay 1/2` を確認した。
- Concept label: Bottom Console の `4D説明` タブを開き、`4D Text Briefing MVP` と `4D説明を生成` が表示されることを確認した。
- Raw sentinel check: Browser 表示上に `RAW_PROMPT_SENTINEL` / `RAW_PAYLOAD_SENTINEL` / `CREDENTIAL_SENTINEL` / `PASSWORD_SENTINEL` / `BEARER_SENTINEL` / `sk-live-direct-qa-secret` が出ないことを確認した。
- Console error: 0。
- External script/link/image request: localhost 以外 0。
- QA screenshot: `.codex-logs/active-plan-completion-browser-qa.png`

### Remaining gaps

- Broad epics #31 / #34 / #37 / #46 は open 前提のまま。今回の3候補は repo docs 上の active plan 候補であり、epic closure ではない。
- Full animated route reconstruction、multi-run visual replay animation、edge-level durable replay record、full branch graph enforcement、expression evaluation、durable notification state、persisted HUD preferences、real assistant audio/avatar/video renderers は未実装。

### Next recommended slice

1. Edge-level durable replay record design: safe edge-level route replay record を既存 run history 内にどう持つかを設計する。
2. HUD notification durability plan: read/ack/pin を永続化する必要があるか、永続化する場合に既存 storage boundary のどこに置くかを決める。
3. Concept naming cleanup continuation: MVP surfaces と full concept layers の命名誤認をさらに減らす。

---

## Phase Animated Replay UI Candidate

- Branch: `codex/animated-replay-ui-candidate`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` の次スライスである Animated replay UI candidate を実装する。safe runtime timeline から metadata-only replay candidate を派生し、Run Detail 内だけで frame navigation / Play-Pause 候補表示を行う。

### Implemented

- `runDetail.ts` に `buildRunDetailReplayCandidateView(...)` を追加した。
  - 入力は既存の `RunDetailRuntimeTimelineView`。
  - 出力は selected frame、progress、marker、safe copy summary に限定する。
  - raw config / prompt / payload / artifact body / credential / token / API key は扱わない。
- `RunDetailPanel` に `metadata-only replay` セクションを追加した。
  - `Play / Pause / Prev / Next` は session-only UI state。
  - frame marker で safe runtime event を選択できる。
  - 表示対象は title / summary / event kind / route kind / severity / source / target / edge / safe metadata summary に限定する。
- `npm.cmd run qa:direct` に Run Detail metadata-only replay candidate validation を追加した。
- `ACTIVE_PLAN.md` を更新し、今回選定済みの issue-roadmap slices を完了済みに移した。次は新しい小スライスを #31 / #34 / #37 / #46 から選ぶ状態。
- audit docs を更新し、metadata-only replay candidate と full animated replay engine / full route reconstruction の残ギャップを分けて記録した。

### Concept checklist classification

- Classification: MVP surface / safe projection / detail-history surface.
- Cognitive HUD claim: Run Detail が読む safe runtime metadata の表示面を少し強める候補実装。Cognitive HUD 全体完成ではない。
- Situation Assistant claim: Incident Replay の入力になり得る safe metadata playback 候補。Situation Assistant 本体、音声、アバター、動画生成は実装していない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は replay candidate / summary に表示・保存・copy しない。sentinel で direct validation した。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。再生状態は session state のみ。

### Validation

- `npm.cmd run qa:direct`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- Initial/Run Detail: `T` から Run Detail を開き、safe runtime event がない状態では empty replay candidate が表示されることを確認した。
- Run: `Run` 実行後、Run Detail に `Replay-ready timeline` と `metadata-only replay` が表示され、`Safe metadata replay 1/2` が出ることを確認した。
- Replay controls: `Next` で `Frame 2/2` に進み、`Play` で `Pause` 表示へ変わることを確認した。確認後に停止した。
- Raw sentinel check: Browser 表示上に `RAW_PROMPT_SENTINEL` / `RAW_PAYLOAD_SENTINEL` / `CREDENTIAL_SENTINEL` / `PASSWORD_SENTINEL` / `BEARER_SENTINEL` / `sk-live-direct-qa-secret` が出ないことを確認した。
- Console error: 0。
- External script/link/image request: localhost 以外 0。

### Remaining gaps

- Full animated route reconstruction、multi-run visual replay animation、edge-level durable replay record、expression evaluation は未実装。
- Revived audit snapshot timeline で `traceAudit.runtimeEvents` を全経路へより厳密に露出する tightening は次候補。

### Next recommended slice

1. Revived audit snapshot runtimeEvents tightening: 既存 run history record の safe `traceAudit.runtimeEvents` を Run Detail timeline / replay の全経路で一貫して使えるようにする。
2. HUD notification read/ack/pin session behavior: on-demand HUD notification を session state で硬くする。
3. Concept naming cleanup plan: MVP panels と full concept layers の命名誤認をさらに減らす。

---

## Phase Runtime Policy Fixed Preset Route Enforcement

- Branch: `codex/runtime-policy-fixed-preset-enforcement`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` の次スライスである Runtime policy route enforcement design spike を実装する。fixed preset の pass / non-pass だけを mock execution route behavior へ反映し、`expression` は metadata-only のまま評価しない。

### Implemented

- `edgeRuntimePolicy.ts` に `resolveConnectionRuntimePolicyRoute(...)` を追加した。
  - fixed preset が pass の場合: `main` route。
  - fixed preset が non-pass の場合: `skip` route。
  - `expression` の場合: `metadata_only` として扱い、実行・評価しない。
- `AppShell` の mock run loop に connection runtime policy route gate を接続した。
  - 計画ノード間の connection を見つけ、前段 node status / workflow status / metrics / validation warning count から fixed preset を評価する。
  - non-pass の場合、対象ノードは `skipped` として扱い、execution graph に `skip` route を記録する。
- `npm.cmd run qa:direct` に fixed-preset runtime policy route decision validation を追加した。
- `ACTIVE_PLAN.md` を更新し、Runtime policy route enforcement design spike を完了済みに移し、次推奨スライスを Animated replay UI candidate に進めた。
- audit docs を更新し、fixed preset mock route gating と full policy enforcement / expression evaluation の残ギャップを分けて記録した。

### Concept checklist classification

- Classification: MVP surface / safe projection / mock-only execution behavior.
- Cognitive HUD claim: Edge HUD / Run Detail が読む route metadata の意味を少し強める mock-only route behavior。Cognitive HUD 全体完成ではない。
- Situation Assistant claim: なし。Situation Assistant 本体や出力チャネルは実装していない。
- Safety: expression は評価しない。raw config / prompt / payload / artifact body / credential / token / API key は route reason / audit / copy summary に表示・保存・copy しない。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。

### Validation

- `npm.cmd run qa:direct`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- Run: `Run` を実行し、mock workflow が進み、policy / expression metadata と blocked path 表示が出ることを確認した。
- Runtime policy: fixed preset route gate の direct validation に加え、Browser 上で `Runtime policy` と expression metadata 表示が残ることを確認した。expression は評価していない。
- Run Detail: `T` から Run Detail / audit replay 導線を開き、timeline / route metadata が表示されることを確認した。
- Raw sentinel check: Browser 表示上に `RAW_PROMPT_SENTINEL` / `RAW_PAYLOAD_SENTINEL` / `CREDENTIAL_SENTINEL` / `PASSWORD_SENTINEL` / `sk-live-direct-qa-secret` が出ないことを確認した。
- Console error: 0。
- External script/link/image request: localhost 以外 0。

### Remaining gaps

- Full branch graph enforcement、expression evaluation、durable edge-level audit records、animated replay はまだ未実装。
- fixed preset gating は mock run の隣接 planned connection に限定する。

### Next recommended slice

1. Animated replay UI candidate: safe runtime timeline を read-only metadata replay surface として拡張する。

---

## Phase Review Decision Persistence Boundary

- Branch: `codex/review-decision-persistence-boundary`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` の次スライスである Review decision persistence boundary を実装する。新 localStorage key は追加せず、Human Review decision は現時点で session-only と明示する。将来 durable にする場合は既存 run history record 内の safe metadata だけに限定する。

### Implemented

- `src/domain/reviewDecisionAudit.ts` を追加し、`HumanReviewState` から safe session-only review decision summary を導出する pure helper を実装した。
- `HumanReviewPanel` に保存境界表示を追加した。
  - 現在は `セッション内のみ`。
  - durable 化する場合は `既存 run history record 内の safe metadata に限定`。
  - sensitive note は safe summary へ含めず `safe summary には含めません` と表示する。
- `npm.cmd run qa:direct` に review decision boundary validation を追加し、credential-like sentinel を含む reviewer/note が safe boundary output に漏れないことを確認する。
- `ACTIVE_PLAN.md` を更新し、Review decision persistence boundary を完了済みに移し、次推奨スライスを Runtime policy route enforcement design spike に進めた。
- `docs/audit/current-implementation-map.md`、`docs/audit/technical-debt.md`、`docs/audit/spec-coverage-matrix.md` を更新し、session-only boundary と durable approval record 未実装を区別した。

### Concept checklist classification

- Classification: MVP surface / safe projection / detail-history boundary.
- Cognitive HUD claim: なし。HUD attention ではなく Human Review decision の保存境界表示。
- Situation Assistant claim: なし。Situation Assistant 本体や出力チャネルは実装していない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は safe boundary / copy summary に表示・保存・copy しない。sentinel で検証した。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。レビュー決定は引き続き session state。

### Validation

- `npm.cmd run qa:direct`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- Initial render: title `agent-workflow-studio`、console error 0、localhost 以外の external resource 0。
- Detail HUD: `D` toggle で detail drawer を開き、drawer open 時に right panel tab buttons が `pointer-events: auto` になることを確認した。
- Human Review tab: `レビュー` タブを開き、`保存境界`、`現在はセッション内のみ`、`既存 run history record 内の safe metadata に限定`、safe summary 表示が出ることを確認した。
- Raw sentinel check: Browser 表示上に `RAW_PROMPT_SENTINEL` / `RAW_PAYLOAD_SENTINEL` / `CREDENTIAL_SENTINEL` / `PASSWORD_SENTINEL` / `sk-live-direct-qa-secret` が出ないことを確認した。
- Console error: 0。
- External script/link/image request: localhost 以外 0。
- Note: Browser QA 中に Detail HUD 内の tab buttons が `pointer-events: none` になり操作できない問題を検出したため、open drawer 内の button/input/select/textarea/label に `pointer-events: auto` を明示した。

### Remaining gaps

- Human Review decision はまだ durable approval record ではない。
- 既存 run history record 内へ safe approval metadata を保存するかどうかは、将来の active plan で明示してから実装する。

### Next recommended slice

1. Runtime policy route enforcement design spike: fixed preset だけを mock execution の pass / non-pass route behavior へ反映する範囲を設計する。
2. Animated replay UI candidate: safe runtime timeline を read-only metadata replay surface として拡張する。

---

## Phase Browser QA Direct Validation Harness

- Branch: `codex/browser-qa-direct-validation-harness`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` の最優先スライスである Browser QA direct validation harness を実装する。Browser の file picker / download / edge focus / Run Detail comparison が環境制約で詰まる場合でも、pure domain code path を再現できる検証に限定する。

### Implemented

- `npm.cmd run qa:direct` を追加した。
- `scripts/qa-direct-validation-runner.mjs` は既存依存の Vite SSR loader を使い、TypeScript の domain helper を dependency 追加なしで直接実行する。
- `scripts/qa-direct-validation.entry.ts` は以下を direct validation する。
  - generated bundle の import/export validation。
  - 2件の safe audit/run history snapshot 作成。
  - `buildRunComparisonView(...)` による Run Detail safe metadata diff と focused edge route metadata rows。
  - `buildRunDetailReplayView(...)` による edge focus selection。
  - `buildRunDetailRuntimeTimelineView(...)` による current trace safe runtime timeline。
  - `buildSelectedEdgeHudView(...)` による Edge HUD safe copy/focus summary。
  - runtimeEvents を持たない旧 run history record の normalize 互換。
  - `STORAGE_KEYS` registry が増えていないこと。
- fixture には raw prompt / raw payload / credential-like sentinel を混ぜ、safe audit / Run Detail / Edge HUD / copy summary 系 output に出ないことを assertion する。
- `docs/project/ACTIVE_PLAN.md` を更新し、Browser QA direct validation harness を完了済みに移し、次推奨スライスを Review decision persistence boundary に進めた。
- `docs/audit/current-implementation-map.md` と `docs/audit/technical-debt.md` を更新し、direct QA harness の役割と残ギャップを記録した。

### Concept checklist classification

- Classification: QA foundation / safe projection validation / detail-history validation.
- Cognitive HUD claim: rendered HUD の新機能ではなく、#34 / #37 の HUD interaction を今後壊さないための検証基盤。
- Situation Assistant claim: なし。Situation Assistant 本体や出力チャネルは実装していない。
- Runtime Audit claim: safe audit summary / runtime metadata / focused edge projection の direct validation。animated replay、full route reconstruction、runtime enforcement ではない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は safe view / audit summary / copy summary に表示・保存・copy されないことを sentinel で検証した。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。

### Validation

- `npm.cmd run qa:direct`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA

- UI変更なしの validation helper slice のため interactive Browser QA は対象外。
- Browser file picker / download が扱えない場合の補完として、direct code-path validation を追加した。

### Remaining gaps

- `reviveRunTraceFromAuditSummary(...)` は現時点で `traceAudit.runtimeEvents` を revived `RunTrace` へ戻していない。focused comparison は record の `traceAudit.runtimeEvents` を直接読めるが、revived audit snapshot timeline の完全性は次の runtime-audit slice で締める余地がある。
- direct QA は rendered interaction QA の代替ではない。UI を触る次スライスでは Browser QA を別途行う。

### Next recommended slice

1. Review decision persistence boundary: human review decisions を session-only のままにするか、既存 run history 内の safe audit metadata として扱うかを決める。
2. Runtime policy route enforcement design spike: fixed preset だけを mock execution の pass / non-pass route behavior へ反映する範囲を設計する。
3. Animated replay UI candidate: safe runtime timeline を read-only metadata replay surface として拡張する。

---

## Phase Plan Unification: GitHub Issue Priority Roadmap

- Branch: `codex/github-issues-plan-unification`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま計画整理を実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: GitHub open issues #31 / #34 / #37 / #46 を確認し、repo docs 内の active planning を issue-based priority roadmap へ一本化する。GitHub issue 本文、ラベル、open/close 状態は変更しない。ユーザー訂正により、issue コメントは可能な範囲として扱う。

### GitHub issue status

- #31 `docs: 認知HUD / 状況補佐官の概念レイヤーを仕様書に基づいて修正する`: open broad epic。P0 concept guardrail として扱う。
- #34 `UI System Redesign: 認知HUD前提で画面全体を再設計する`: open broad epic。P1 UI/product surface parent として扱う。
- #37 `Game HUD Canvas First Completion Plan`: open broad epic。#34 配下の P1-child implementation track として扱う。
- #46 `Plan: 5本柱同格MVP垂直スライス実装`: open broad epic。P1 delivery spine として扱う。

### Implemented docs updates

- `docs/project/ACTIVE_PLAN.md` を更新し、4つの open issue を優先順位付き roadmap として単一入口に整理した。
- `docs/project/PLAN_PROTOCOL.md` に、GitHub issue は source input、repo docs は execution plan であること、broad epic を小PRで close しないこと、issue コメントの扱いを追加した。
- `docs/implementation/runtime-audit-next-phase.md` を更新し、Runtime Audit detail backlog は #37 / #46 の selected slice に従属することを明記した。
- `docs/audit/current-implementation-map.md`、`docs/audit/spec-coverage-matrix.md`、`docs/audit/missing-systems.md`、`docs/audit/technical-debt.md` を issue優先順位に合わせて更新した。

### Concept checklist classification

- Classification: planning guardrail / implementation backlog / QA foundation.
- Cognitive HUD claim: #34 / #37 の現状は Canvas First / Game HUD foundation であり、Cognitive HUD 全体完成ではない。
- Situation Assistant claim: #46 の現状は mock-only output channels を含む thin vertical slice であり、Situation Assistant 全体完成ではない。
- Runtime Audit claim: Runtime Audit は #37 / #46 を支える detail backlog であり、単独の active plan ではない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。
- Docs consistency: `rg -n "active plan|Active Plan|次スライス|Next recommended|#31|#34|#37|#46|GitHub issue|Runtime Audit detail backlog" docs PROJECT_STATE.md` で active plan / issue priority / subordinate backlog の記述を確認した。
- Browser QA: docs-only 変更のため interactive Browser QA は対象外。docs consistency と static validation で補完した。

### Remaining gaps

- GitHub issue comments are allowed, but issue body / label / open-close state remain unchanged by this docs unification.
- The next implementation slice is not yet implemented; this phase selects the roadmap and next recommended slice only.
- Browser QA direct validation harness remains the next recommended implementation slice.

### Next recommended slice

1. Browser QA direct validation harness: #31 / #34 / #37 / #46 を横断する file picker / download / Run Detail comparison / edge focus / raw leak checks を direct code-path validation で再現可能にする。
2. Review decision persistence boundary: human review decisions を session-only のままにするか、既存 run history 内の safe audit metadata として扱うかを決める。
3. Runtime policy route enforcement design spike: fixed preset だけを mock execution の pass / non-pass route behavior へ反映する範囲を設計する。

---

## Phase Active Plan Completion: Runtime Replay / Review HUD / Five-Pillar Thickening

- Branch: `codex/complete-active-plan-slices`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: `docs/project/ACTIVE_PLAN.md` に残っていた 3 つの推奨スライスを完了する。対象は Five-pillar vertical thickening、review required の state-based Game HUD behavior、Replay-ready audit view model。GitHub issue state、source-specs、storage key、backend/API、credential、依存関係は変更しない。

### Implemented

- `RunDetailPanel` に `Replay-ready timeline` を追加し、選択中の current trace または durable audit snapshot の `runtimeEvents` を safe metadata の時系列として表示できるようにした。
- `src/domain/runDetail.ts` に `buildRunDetailRuntimeTimelineView(...)` を追加した。pure helper として event count、focused event count、route/edge/review/warn/error counts、safe latest summary、safe copy summary、timeline items を返す。
- `BriefingInput` に safe runtime replay metadata を追加し、Mock Situation Assistant が `Replay` cue を生成するようにした。`BriefingPanel` には replay cue の小セクションを追加した。
- `CentralHudStateCue` に `review_required` を追加し、approval semantic focus 時に central HUD が `Review required / Open review` を出せるようにした。
- `CanvasCommandHud` は review-required state のときだけ `D`（Detail）と `T`（Run Detail）を attention 表示にする。
- `ACTIVE_PLAN.md` を更新し、今回のActive Plan上の残りスライスを完了済みにした。次は新しい小さなvertical sliceを選ぶ状態。
- `docs/audit/current-implementation-map.md`、`docs/audit/spec-coverage-matrix.md`、`docs/implementation/runtime-audit-next-phase.md` を更新し、replay-ready timeline / review-required HUD / briefing replay cue を現在実装として記録した。

### Concept checklist classification

- Classification: MVP surface / safe projection / detail-history surface.
- Cognitive HUD claim: review-required の attention allocation を小さく改善する state cue と HUD entrypoint highlight。Cognitive HUD 全体完成ではない。
- Situation Assistant claim: safe runtime replay metadata を mock briefing の入力と replay cue へ渡す最小出力チャネル。Situation Assistant 全体完成ではない。
- Runtime Audit claim: replay-ready ordering の view model と表示。animated replay、timeline scrubber、full route reconstruction ではない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は表示・保存・copy summary 対象にしていない。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning は既存許容警告として扱う。

### Browser QA / direct validation

- Direct validation: `buildRunDetailRuntimeTimelineView(...)` に safe runtime events を渡し、時系列順、focused edge filtering、route/review counts、credential/token/payload-like metadata 非表示を確認した。
- Direct validation: `buildCentralHudView(...)` に approval semantic focus を渡し、`stateCue.state=review_required` と `commandHint=Open review` が生成されることを確認した。
- Direct validation: `MockBriefingAdapter` に safe runtime replay metadata を渡し、`replayCue` が生成され、credential-like keyword が出力に混入しないことを確認した。Node direct validation では browser-only `window.setTimeout` のため最小 polyfill を使用した。
- Preview: `http://127.0.0.1:4178/`
- Initial render: title `agent-workflow-studio`、console error 0。
- Browser QA: `Run` 実行後に `Run Detail` を開き、`Replay-ready timeline`、event/focused counts、route/edge/review/warn/error stats、safe runtime metadata items が表示されることを確認した。
- Browser QA: `Reset` 操作後も実行状態が準備完了へ戻り、console error 0 を維持した。
- Browser QA: `performance` resource entries で localhost 以外の script/link/image request がないことを確認した。
- Browser QA: 画面内の credential-like keyword は検出されなかった。`token` の文字列は `120 tokens / 420 ms` の見積もりメトリクス表示のみで、raw token/credential ではないことを確認した。
- Browser limitation: in-app Browser の screenshot 取得は `Page.captureScreenshot` timeout のため保存できなかった。DOM/console/resource/direct validation で補完した。

### Remaining gaps

- Replay-ready timeline は安全な metadata ordering であり、animated replay、timeline scrubber、visual route reconstruction ではない。
- review-required cue は HUD attention の小スライスであり、durable approval decision log や persisted notification state ではない。
- runtimePolicy は固定プリセットの safe summary / safe metadata までで、任意式評価や本格 enforcement はまだ実装していない。

### Next recommended slice

1. Review decision persistence boundary: human review decisions を session-only のままにするか、既存 run history 内の safe audit metadata として扱うかを決める。
2. Runtime policy enforcement design spike: 固定プリセットだけを mock execution に反映する範囲を設計し、expression 実行はまだ避ける。
3. Browser QA direct validation harness: file picker / download / compare checkbox / edge操作を補完する direct code-path validation を整える。

---

## Phase Active Plan Execution: Validation Warning HUD Behavior

- Branch: `codex/state-based-hud-validation-warning`
- Date: 2026-06-03
- Scope: `docs/project/ACTIVE_PLAN.md` の state-based Game HUD slice として、validation warning 状態の HUD 振る舞いを1つ追加する。Canvas HUD 全体レイアウト、Run Detail、storage key、backend/API、credential、依存関係は変更しない。

### Implemented

- `CentralHudView` に validation warning 用の `stateCue` を追加し、validation focus 時に `Validation warning / Val first / highlighted edge を確認` の小さな状態指示を出せるようにした。
- `CognitiveHudOverlay` に `stateCue` 表示を追加した。常時大型パネルではなく、既存 central HUD 内の小さな cue として扱う。
- `CanvasCommandHud` は validation warning state のときだけ `Val` action を attention 表示にする。Run / Reset / import-export など既存導線は維持。
- CSS は `cognitive-hud-state-cue` と `hud-icon-button.attention` のみ追加し、Game HUD 全体レイアウトは変更していない。
- `ACTIVE_PLAN.md` と audit docs を更新し、validation-warning HUD behavior を完了済み state-based MVP behavior として記録した。

### Concept checklist classification

- Classification: MVP surface / state-based HUD behavior.
- Cognitive HUD claim: final layer 全体ではなく、validation warning の attention allocation を小さく改善する Canvas HUD 表示。
- Situation Assistant claim: なし。assistant output ではない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は表示・保存・copy 対象にしていない。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA / direct validation

- Preview: `http://127.0.0.1:4178/`
- Initial render: title `agent-workflow-studio`、console error 0。
- Existing HUD: Cognitive HUD overlay、Run、Val、GPT-5.5 high、safe/mock/history chip、trace chip、Console HUD が表示されることを確認。
- Direct validation: `buildCentralHudView(...)` に validation semantic focus を渡し、`variant=validation` と `stateCue.state=validation_warning` が生成されることを確認。

### Remaining gaps

- review required / high cost / delay / failure / approval などの状態別 HUD 振る舞いはまだ個別スライスとして残る。
- validation warning の Browser QA は初期表示と direct domain validation の組み合わせで確認した。実画面上で invalid connection を作る完全操作は未実施。

### Next recommended slice

1. Five-pillar vertical thickening: mock-only の1本のユーザーフローを選び、parts / mock runtime / HUD attention / safe audit / assistant explanation / template-history の接続を太くする。
2. Next state-based Game HUD slice: review required を、Human Review と central HUD / command HUD の状態別挙動へ接続する。
3. Replay-ready audit view model: safe runtime route events を timeline 化し、将来の replay UI へ渡せる pure view model を作る。

---

## Phase Active Plan Execution: Edge Route Metadata Diff

- Branch: `codex/edge-route-metadata-diff`
- Date: 2026-06-03
- Scope: `docs/project/ACTIVE_PLAN.md` の次スライスである Edge route metadata diff を、`RunDetailPanel` 内に限定して実装する。Canvas HUD / Game HUD 全体レイアウト、GitHub issue state、source-specs、storage key、backend/API、credential、依存関係は変更しない。

### Implemented

- `buildRunComparisonView(...)` の focused edge scope に、選択 edge に関係する `traceAudit.runtimeEvents` の safe route-event metadata diff を追加した。
- 比較対象は allowlist 的な safe metadata に限定し、route kinds、event kinds、severity mix、status、route、condition mode、policy result、delay、retry、error-route、latest event を表示する。
- `RunDetailPanel` の focused node / edge scoped diff 内に `Edge route metadata diff` 表示を追加した。新しい常駐パネルや Canvas HUD レイアウト変更はしていない。
- route-event summary は表示直前にも `sanitizeRuntimeAuditText(...)` を通し、raw config / prompt / payload / artifact body / credential / token / API key を表示しない境界を維持した。
- `ACTIVE_PLAN.md` と Runtime Audit / audit docs を更新し、Edge route metadata diff を完了済み safe projection として記録した。

### Concept checklist classification

- Classification: safe projection / detail-history surface.
- Cognitive HUD claim: なし。Canvas HUD 変更ではなく Run Detail 内の read-only focused diff。
- Situation Assistant claim: なし。assistant output ではない。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は表示・保存・copy 対象にしていない。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA / direct validation

- Preview: `http://127.0.0.1:4178/`
- Initial render: title `agent-workflow-studio`、console error 0。
- Run Detail: selected node HUD の `Open trace` から `実行詳細` tab / `Replay source` / `Compare audits` / `Runtime events` が表示されることを確認。
- In-app Browser では `Compare audits` checkbox の状態変更が安定せず、focused edge comparison の完全なクリック操作は direct code-path validation で補完した。
- Direct validation: `buildRunComparisonView(...)` に2件の safe audit snapshot と focused edge を渡し、`routeMetadataRows` が生成され、route kind / severity / status diff が出ること、credential-like metadata が出力に混入しないことを確認。

### Remaining gaps

- これは safe route-event metadata の比較であり、animated replay、timeline scrubber、full edge route reconstruction、runtime policy enforcement ではない。
- Browser の checkbox 操作制約により、比較UIの全クリック経路は direct validation で補完している。

### Next recommended slice

1. One state-based Game HUD slice: validation warning または review required を、Canvas HUD 上の状態別振る舞いとして1つ追加する。
2. Five-pillar vertical thickening: mock-only の1本のユーザーフローを選び、parts / mock runtime / HUD attention / safe audit / assistant explanation / template-history の接続を太くする。
3. Replay-ready audit view model: safe runtime route events を timeline 化し、将来の replay UI へ渡せる pure view model を作る。

---

## Phase Active Plan Execution: Concept Checklist

- Branch: `codex/execute-active-plan-concept-checklist`
- Date: 2026-06-03
- Scope: `docs/project/ACTIVE_PLAN.md` の最初の実行スライスである Concept checklist を実装する。GitHub issue state、source-specs、実装コード、storage、backend/API、credential、依存関係は変更しない。

### Implemented

- `docs/project/CONCEPT_CHECKLIST.md` を追加し、future slice が final layer / MVP surface / safe projection / detail-history / out of scope のどれかを明示できるようにした。
- Cognitive HUD、Situation Assistant、Situation Narration Layer、Upload Labs-style observability、n8n-style automation、Scratch-style operation に触れる変更で確認すべき guardrail questions を追加した。
- PR / final report に貼れる短い checklist snippet と、過大表現を安全な表現へ直す common corrections を追加した。
- `docs/project/ACTIVE_PLAN.md` を更新し、Concept checklist を completed slice として記録し、次の推奨順を Edge route metadata diff から開始する形にした。
- `docs/project/PLAN_PROTOCOL.md` と `docs/project/SOURCE_OF_TRUTH.md` に checklist 参照と分類記録ルールを追加した。
- `README.md` の参照ドキュメントに checklist を追加した。

### Concept checklist classification

- Classification: docs-only guardrail / review checklist.
- Cognitive HUD claim: final layer 実装ではなく、将来の HUD 変更が注意配分レイヤーを過小定義しないための判定表。
- Situation Assistant claim: assistant 実装ではなく、text briefing MVP を assistant 全体と混同しないための判定表。
- Safety: raw config / prompt / payload / artifact body / credential / token / API key は表示・保存・copy 対象にしていない。
- Persistence/API: 新 localStorage key、backend/API、credential storage、dependency は追加していない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA

- Docs-only checklist change のため実施していない。
- UI、runtime、storage、import/export、localStorage key、backend/API、credential の挙動は変更していない。

### Next recommended slice

1. Edge route metadata diff: `RunDetailPanel` の focused edge comparison を runtime event counts から safe route-event metadata へ拡張する。
2. One state-based Game HUD slice: validation warning または review required など、既存 safe metadata に基づく状態別 HUD 振る舞いを1つ追加する。

---

## Phase Plan Document Consolidation

- Branch: `codex/consolidate-project-plan-docs`
- Date: 2026-06-03
- Scope: GitHub issue stateには触れず、repo 内の plan-like docs の入口を `docs/project/ACTIVE_PLAN.md` に集約する。source-specs、実装コード、storage、backend/API、credential、依存関係は変更しない。

### Implemented

- `docs/project/ACTIVE_PLAN.md` を追加し、現行の計画入口、次スライス順、各 plan document の役割、共通安全境界を一箇所にまとめた。
- `README.md` の参照ドキュメントに active plan を追加した。
- `docs/project/SOURCE_OF_TRUTH.md` に active plan の優先順位と境界を追加した。
- `docs/project/PLAN_PROTOCOL.md` に single active plan rule を追加し、今後の計画乱立を防ぐ運用にした。
- `runtime-audit-next-phase` / `runtime-audit-integration-plan` / `Five_Pillar_MVP_Vertical_Slice` は削除せず、detail backlog / historical record / slice record として位置づけを明記した。
- `docs/implementation/README.md` と `docs/tasks/README.md` を追加し、各ディレクトリが現行計画入口ではなく詳細・履歴置き場であることを明記した。

### Current planning entrypoint

- Active plan: `docs/project/ACTIVE_PLAN.md`
- Chronological state: `PROJECT_STATE.md`
- Implementation/audit details: `docs/audit/**`, `docs/implementation/**`, `docs/tasks/**`

### Remaining gaps

- 古い task docs の本文には過去の「次の推奨」記述が残る。今後は active plan を優先し、必要なものだけ detail backlog として更新する。
- GitHub issue 本文、ラベル、open/close 状態はこの docs 整理では変更していない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA

- Docs-only consolidation のため実施していない。
- GitHub issue 本文、ラベル、open/close 状態は変更していない。

---

## Phase Open Epic Recheck: Five Pillar MVP Slice

- Branch: `codex/complete-open-issues-plan-audit`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: GitHub issues #31 / #34 / #37 / #46 は抽象度の高い全体設計エピックとして open のまま扱う。PR #47 は、それらを閉じる変更ではなく、#46 の一部条件だった Validate mode、runtimePolicy preset evaluator、補佐官の音声/アバター/動画ハイライト出力を mock-only の最小垂直スライスとして追加した確認用スライスである。新 localStorage key、backend/API、credential 保存、実 AI API、外部 asset、依存追加は行わない。

### Open issue status correction

- #31 / #34 / #37 / #46 は 2026-06-03 時点で再 open 済み。これらは単発 PR で close する粒度ではなく、Source of Truth、UI shell、Canvas First HUD、5本柱MVP全体を継続的に追う設計エピックとして扱う。
- 以前の「Issue Completion Pass」「MVP Closure」「complete」という記録は、PR #47 の薄い vertical slice に対して過大だったため、今後は「implemented slice / partial alignment / remaining epic scope」として読む。
- 今後、これら issue を close するには、各 issue 本文の acceptance criteria を個別に再監査し、UI 実装、docs、Browser QA、ギャップ整理、ユーザー確認を揃える必要がある。

### Implemented

- `RunMode` に `validate` を追加し、Canvas command HUD の `Val` action から mock-only Validate mode を実行できるようにした。
- Validate mode は nodes を実行せず safe validation summary / skipped steps / run history `mode=validate` として扱う。既存 Dry run / Run All / Run Selected / Run From Selected は維持。
- `evaluateConnectionRuntimePolicy(...)` を pure helper として追加し、`always`, `on_success`, `on_failure`, `on_failed`, `on_review`, `on_review_required`, `on_high_cost`, `on_bottleneck`, `on_validation_warning` を固定プリセットとして評価する。
- `expression` は raw 式評価を行わず、safe metadata として表示のみ行う。runtime audit event には `policyPassed` / `policyReason` の安全な派生 metadata だけを追加した。
- `BriefingResult` に `voiceScript`, `avatarScript`, `visualTimeline`, `humanDecisionPrompt` を追加し、Mock Situation Assistant が HUD / Run Detail / execution summary から安全な補佐官出力を生成するようにした。
- `BriefingPanel` に Voice / Avatar / Decision / Visual Timeline を表示し、テキストブリーフィングだけでなく音声台本・アバター台本・動画ハイライト指示まで通るようにした。
- `docs/tasks/Codex_Task_Five_Pillar_MVP_Vertical_Slice.md` を追加し、5本柱MVPの薄い到達点、柔軟性境界、残ギャップ、QA手順を記録した。

### Issue alignment

- #31: concept layer correction docs、SOURCE_OF_TRUTH、source-specs、audit docs、PROJECT_STATE は一部整備済み。ただし、認知HUD / 状況説明生成レイヤー / 状況補佐官を repo 全体の Source of Truth と実装判断へ完全に浸透させる作業は継続。
- #34: Game HUD / Canvas First shell、minimal always-on HUD、on-demand drawer、node/edge overlay、semantic focus、dark HUD theme は基礎実装済み。ただし、issue 本文の「画面全体を AI ワークフロー作業 OS として再設計する」範囲は継続エピック。
- #37: Game HUD Canvas First completion plan の一部 acceptance は実装済み。MiniMap toggle、zoom mode、selected node/edge HUD、workflow group layer、inline preview、dark canvas、Browser QA 記録あり。ただし、pixel ではなく設計原則としての完成度、詳細 UX、反復 QA は継続。
- #46: 5本柱MVPは mock-only の薄い垂直スライスとして、部品操作、mock connector、mock workflow run、HUD attention、Situation Assistant multi-channel output、safe audit、template save/load まで接続済み。ただし、5本柱を同格コアとして固める issue 全体は open のまま継続。

### Remaining gaps

- #31 は docs だけでなく、今後の UI / domain / QA 変更が概念を縮小していないかを継続監査する必要がある。
- #34 / #37 は Canvas First foundation から、状態別 HUD 振る舞い、Critical 介入、audio cue placeholder、視線誘導、正常系の沈黙、不要経路の減光をさらに詰める必要がある。
- #46 の完全構想に含まれる実外部 connector、実AI、実 credential store、動画生成、音声生成、アバター描画、URL deep link、animated replay は未実装。現時点では非ゴールとして守ったが、issue 自体の将来範囲から削除したわけではない。
- runtimePolicy は固定プリセットの mock evaluator と safe audit metadata まで。任意式評価や本格 branch graph enforcement は実装しない。
- Browser の file picker/download が使えない環境では、JSON import/export は direct code-path validation で補完する。

### Rechecked next plan

1. #31: Source of Truth 監査を継続し、MVP 表示面と最終レイヤーの混同を検出する checklist を docs / PR template 相当に整理する。
2. #34 / #37: Canvas First / Game HUD を状態別 QA で評価し、失敗、承認待ち、遅延、コスト増、検証警告の HUD 振る舞いを小スライスで追加する。
3. #46: 5本柱を閉じるのではなく、Mock connector、safe runtime audit、HUD attention、Situation Assistant 出力、template 化の接続を vertical slice ごとに太くする。
4. 各スライスは `GPT-5.5 high` を通常モデルとし、`ALLOW_XHIGH` なしで xhigh は使わない。単純な文言修正・小さい CSS 調整のみなら `GPT-5.4-mini medium` 相当でよい。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- Initial render: title `agent-workflow-studio`, command HUD visible, React Flow nodes 12, edges 13, MiniMap visible.
- Validate mode: `Val` action is present and `mode=validate` appears after execution.
- Situation Assistant: Detail HUD -> 補佐官 -> ブリーフィング生成で `Voice`, `Avatar`, `Decision`, `Visual Timeline` sections visible.
- Safety: value-like `password/token/secret/apiKey/credential/authorization` assignment pattern was not visible in the checked DOM.
- External assets: script/link/image URLs were limited to `127.0.0.1`.
- Console errors: 0.

---

## Phase Runtime Audit Worktree QA / Docs

- Branch: `codex/runtime-audit-qa-docs`
- Base branch: `codex/runtime-audit-integration-base`
- Date: 2026-06-03
- Model gate: `ALLOW_XHIGH` はないため、Codex Desktop 運用ラベルとして `GPT-5.5 high` のまま実施した。API model id として記録する場合は `gpt-5.5` とする。
- Scope: Runtime Audit worktree 並列運用で merge 済みになった Contract / Runtime Events / Durable Audit / Run Detail Replay-Diff / Edge HUD Deep Link の実装状態を docs / audit / QA 記録へ反映する。実装ファイル、source-specs、storage key、backend/API、credential 保存、依存関係は変更しない。

### Integrated PRs

| PR | Lane | Merge result |
|---|---|---|
| #38 | Shared Contract | `src/domain/runtimeAuditContract.ts` を追加し、runtime/audit event の safe metadata contract と normalization boundary を共有化した。 |
| #39 | Integration Captain | 並列 Worktree の統合順序、file ownership、PR acceptance、stop conditions、final QA を文書化した。 |
| #40 | Runtime Events | mock run の route/runtime event を safe 派生 metadata として `RunTrace.runtimeEvents` に載せた。 |
| #41 | Durable Audit | 既存 run history record 内の `traceAudit.runtimeEvents` に safe route metadata を保存し、旧 record は `[]` へ互換 normalize するようにした。 |
| #42 | Run Detail Replay / Diff | `RunDetailPanel` 内の二つの audit snapshot 比較へ `runtimeEvents` metadata count / diff row を追加した。 |
| #43 | Edge HUD / Deep Link | Selected Edge HUD から Run Detail focused edge へ session state で到達できる最小 deep link と safe summary を追加した。 |

### Implemented documentation updates

- `docs/audit/current-implementation-map.md` に Runtime Audit worktree phase の実装済み範囲を追加した。
- `docs/audit/spec-coverage-matrix.md` の UI-08 / UI-12 / metrics-audit coverage を safe runtime events / durable route metadata / focused edge deep link に合わせて更新した。
- `docs/audit/missing-systems.md` と `docs/audit/technical-debt.md` の残ギャップを、edge-level durable route replay と enforced runtime policy に絞って更新した。
- `docs/implementation/runtime-audit-next-phase.md` を追加し、A-D merge 後の現状、残ギャップ、次スライスを整理した。
- `docs/tasks/Codex_Task_Runtime_Audit_Worktree_QA.md` を追加し、QA / Docs lane の完了条件と最終 QA 手順を記録した。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Canvas HUD / Game HUD layout、Run Detail、Selected Edge HUD は維持。
- raw config、prompt 本文、payload、artifact 本文、credential/token/password/API key を docs 上でも safe metadata とは区別し、保存・表示・copy summary 対象外として記録した。
- `docs/source-specs/**`、`package.json`、`package-lock.json`、Vite/TS config、storage key 定義、implementation source files は変更していない。

### Validation

- `git rev-parse HEAD` before work: `026e29dbf98f7dd6c5b6316433a4f30e5c4d10e9`
- `git branch --show-current`: `codex/runtime-audit-qa-docs`
- `git status --short` before work: clean
- First `npm.cmd run typecheck`: failed because this new worktree did not have `node_modules` and `tsc` was unavailable.
- `npm.cmd ci`: pass, 172 packages installed, 0 vulnerabilities.
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA

- Docs-only lane のため、interactive Browser QA は実施していない。
- 最終統合 QA 手順、direct code-path fallback、raw leak / new localStorage key / external request 確認を docs に明記した。

### Remaining gaps

- Runtime event は safe metadata として保存・比較できるが、edge-level durable route replay、timeline scrubber、visual replay animation ではない。
- Connection `runtimePolicy` は safe metadata / HUD projection であり、condition/retry/error-route enforcement や expression evaluator ではない。
- Browser plugin が使えない環境では file picker/download/edge-click の一部を direct validation または headless fallback で補完する必要がある。

### Next recommended slice

1. Edge-level route event を `traceAudit.runtimeEvents` から Run Detail focused edge diff へ広げる。
2. Runtime policy enforcement の前に mock evaluator contract と安全な expression subset を設計する。
3. Final integration QA で #38-#43 の統合状態を preview / Browser / direct validation で再確認する。
4. 軽微な文言修正・小さい CSS 調整のみなら `GPT-5.4-mini medium`、runtime/audit/domain/UI をまたぐ実装は `GPT-5.5 high` を推奨する。`ALLOW_XHIGH` なしで xhigh は提案・継続しない。

---

## Phase UI-2m: Runtime Edge Policy Minimal Slice

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: `ALLOW_XHIGH` はないため、`GPT-5.5 high` のまま実施した。モデル変更が必要な具体的破壊リスクは出ていない。
- Scope: UI-2l の次スライス。`WorkflowConnection` に任意の `runtimePolicy` を追加し、condition / delay / retry / error-route の安全な編集・表示・比較導線を最小実装する。新 localStorage key、backend/API、credential 保存、実 AI API、外部 asset、依存追加は行わない。Canvas HUD / Game HUD 全体レイアウトは変更しない。

### Implemented

- `src/domain/workflow.ts` に optional `WorkflowConnectionRuntimePolicy` を追加した。既存接続は `runtimePolicy` 未指定のまま読み込める。
- `src/domain/edgeRuntimePolicy.ts` を追加し、policy normalization、機密らしい文字列の除外、safe summary / copy lines を pure helper として分離した。
- `validateWorkflowImport(...)` と `normalizeWorkflowDocument(...)` が既存 workflow import/export 経路で `runtimePolicy` を互換的に正規化するようにした。新規 storage key は追加していない。
- `ConnectionEditor` に connection runtime policy の最小 editor を追加し、Inspector / Detail HUD 経由で保存・クリアできるようにした。
- `workflowActions.ts` / `workflowReducer.ts` に `updateConnectionRuntimePolicy` を追加し、既存 undo/redo history に乗せて更新するようにした。
- Selected edge HUD / React Flow edge labels / Run Detail focused edge scoped diff が safe policy summary を読むようにした。raw config、prompt 本文、payload、credential/API key/password/token は view model と copy summary に含めない。
- sample workflow の decision edges に安全な example `runtimePolicy` を付与し、初期表示で policy edge を確認できるようにした。

### Design asset alignment

- `07_node-detail-hud.png` / `11_selection-overlay.png`: edge 選択 HUD に runtime policy context が出るが、常時 panel 化せず選択時の flow HUD に留めた。
- `10_inline-preview.png`: Run Detail focused edge scope では safe metadata だけを短く比較し、raw 本文を出していない。
- `12_minimal-always-on-hud.png`: always-on HUD は増やさず、policy 編集は Detail HUD の Inspector に限定した。
- `13_dark-theme-finished-canvas.png`: policy configured edge は暗色 canvas 上で細い dash/label 表現に留め、過剰な glow を避けた。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap/Notification/Density toggles、selected node HUD、selected edge HUD、semantic focus、zoom mode は維持。
- runtime policy は optional metadata であり、現時点では実行 engine に条件分岐や retry enforcement を追加していない。
- 保存済み workflow に `runtimePolicy` がなくても読み込み可能。危険語を含む imported policy text は正規化で除外される。

### Validation

- `git rev-parse HEAD`: `9df3393294ae95c2a628f6df05269dcd9a207041`
- `git status --short` before work: UI-2j/UI-2k/UI-2l 系の未コミット差分あり。reset / rebase / force overwrite は行っていない。
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。
- `npx.cmd tsx` direct validation: `normalizeConnectionRuntimePolicy(...)` / `summarizeConnectionRuntimePolicy(...)` / `validateWorkflowImport(...)` が pass。sensitive expression は除外され、safe summary に危険語が出ないことを確認した。

### Browser QA

- Preview: `http://127.0.0.1:4179/`
- Codex in-app Browser は `Browser is not available: iab` だったため、Microsoft Edge headless + CDP で fallback QA を実施した。
- fresh sample workflow で Detail HUD を開き、connection runtime policy editor、sample policy 表示、edge 選択 HUD、condition / retry summary、既存 workflow storage 内の policy count を確認した。
- Browser QA result: `detailOpened: true`, `policyEditorVisible: true`, `samplePolicyVisible: true`, `edgeHudVisible: true`, `conditionVisible: true`, `retryVisible: true`, `currentWorkflowPolicyCount: 3`, `hasRawLeak: false`, `externalResources: []`, console errors: none。
- QA 用の一時 script、preview server、headless Edge、一時 profile / log は削除した。

### Remaining gaps

- `runtimePolicy` はまだ実行 engine の branch/retry/error-route enforcement ではない。
- durable edge-level audit events、route replay、multi-run edge route diff は未実装。
- condition expression は安全な短い metadata として保持するだけで、式評価 engine は未実装。
- policy editor は最小版であり、visual branch authoring、policy validation diagnostics、edge tooltip density policy は未実装。

### Next recommended slice

1. Edge-level durable route events を safe audit snapshot に追加し、Run Detail focused edge diff を実 edge event 比較へ拡張する。
2. Runtime policy enforcement の前に、condition expression の許可範囲と mock evaluator contract を設計する。
3. Connection editor の policy validation diagnostics と branch visual authoring を小スライスで追加する。
4. 軽微な文言修正・小さい CSS 調整のみなら `GPT-5.4-mini medium`、上記の実装スライスは `GPT-5.5 high` を推奨する。`ALLOW_XHIGH` なしで xhigh は提案・継続しない。

---

## Phase UI-2l: Run Detail Step Evidence Scoped Diff

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: `ALLOW_XHIGH` はないため `GPT-5.5 high` のまま実施した。モデル変更が必要な具体的破壊リスクは出ていない。
- Scope: Run Detail multi-run comparison の次スライス。2つの safe `traceAudit` snapshot 比較を、step-level safe evidence grouping と focused node/edge scoped diff へ拡張する。UI は `RunDetailPanel` 内に限定し、Canvas HUD / Game HUD 全体レイアウト、新 localStorage key、backend/API、credential 保存、実 AI API、外部 asset、依存追加は行わない。

### Implemented

- `src/domain/runDetail.ts` に `RunDetailStepEvidenceDiffGroup`, `RunDetailScopedDiffView` と、safe audit evidence を node/run-level 単位に集計する pure helper を追加した。
- `buildRunComparisonView(...)` が `focusNodeId`, `focusConnectionId`, `connections` を任意で受け取り、比較 metadata rows に加えて `stepGroups` と `focusScope` を返すようにした。
- 比較対象は既存 `WorkflowRunRecord.traceAudit.steps[].evidence` / `runEvidence` の safe summary と、node id/title/status/route/evidence kind/severity/count だけに限定した。raw config、prompt 本文、raw payload、artifact 本文、credential/token/password/API key は view model に含めない。
- `RunDetailPanel` の既存 `Compare audits` section 内に `Step evidence diff` と `focused node / edge scope` を追加した。状態は既存 selector/toggle の session React state のみで保持する。
- `src/index.css` に dark HUD surface 向けの compact step diff / scoped diff card styles を追加した。

### Design asset alignment

- `03_hud-layer-model.png`: 比較詳細は Bottom Console 内の on-demand detail surface に留め、Canvas HUD へ常駐 panel を増やしていない。
- `11_selection-overlay.png`: canvas selection の node/edge focus を Run Detail scoped diff に連動させ、選択文脈だけ詳細化する。
- `12_minimal-always-on-hud.png`: 常時 HUD は変更せず、比較表示は `T` / Run Detail 経由の明示操作に限定した。
- `13_dark-theme-finished-canvas.png`: 追加カードは半透明 dark HUD と細い border の既存表現に合わせた。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap/Notification/Density toggles、selected node HUD、selected edge HUD、semantic focus、zoom mode は維持。
- `WorkflowRunRecord` / `RunTraceAuditSummary` の schema は変更していない。比較は read-only の pure view model で、外部 API / credential / browser storage mutation に依存しない。

### Validation

- `git rev-parse HEAD`: `9df3393294ae95c2a628f6df05269dcd9a207041`
- `git status --short` before work: UI-2j/UI-2k の未コミット差分あり。reset / rebase / force overwrite は行っていない。
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。
- `npx.cmd tsx` direct validation: `buildRunComparisonView(...)` が `rows: 15`, `stepGroups: 1`, `focusGroups: 1` を返し、危険語 `credential/password/api key/raw payload` の出力がないことを確認した。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- Codex in-app Browser は `Browser is not available: iab` だったため、Microsoft Edge headless + CDP で fallback QA を実施した。
- 一時 profile で既存 key `agent-workflow-studio.run-history.v1` に safe `traceAudit` 付き record を2件だけ投入し、HUD `T` action から Run Detail を開いた。
- `Compare audits` toggle、`Multi-run diff`、`Step evidence diff`、`safe step evidence grouping`、focused node scoped diff、`Node` deep link を確認した。
- `hasRawLeak: false`, `externalResources: []`, captured console errors: none。
- QA 用の一時 script、preview server、headless Edge、一時 profile / log は削除した。

### Remaining gaps

- scoped diff は safe audit summary の read-only 集計であり、animated replay、timeline scrubber、edge-level durable route event diff、原因分析 rule engine ではない。
- edge scoped diff は選択 edge の source/target node evidence を比較する最小版で、edge 自体の durable route events はまだ未実装。
- 比較 severity は error/warn/evidence count/status/kind の軽量ルールであり、policy-backed regression analysis ではない。

### Next recommended slice

1. Runtime edge semantics を connection condition model / retry policy editor / edge-level audit events へ拡張する。
2. Run Detail compare に edge-level durable route event diff を追加する。
3. Notification bundle を既読/ack/pin 付きの durable notification model へ拡張する（既存 localStorage key 方針を設計してから）。
4. 軽微な文言修正・小さい CSS 調整のみなら `GPT-5.4-mini medium`、上記の実装スライスは `GPT-5.5 high` を推奨する。

---

## Phase UI-2k: Run Completion Headless QA Recheck

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: ユーザー方針に従い、`ALLOW_XHIGH` なしでは xhigh を提案・継続しない。今回の追試は `GPT-5.5 high` の範囲で実施した。モデル変更が必要な具体的破壊リスクは出ていない。
- Scope: UI-2j の残ギャップだった「headless Browser QA で Run 完了待ちが timeout した」事象の最小追試。Canvas HUD / Game HUD レイアウト、Run Detail comparison UI、domain model、localStorage schema は変更しない。

### Implemented

- コード変更は行っていない。
- `AppShell.tsx` の通常 Run 経路、`workflowReducer` の `runFinished`、既存 `RUN_HISTORY` key への append effect を確認した。
- `runFinished` 到達後は `isRunning:false`、`completedRun`、既存 `agent-workflow-studio.run-history.v1` への safe `traceAudit` 付き record 保存に進む構造であることを確認した。

### Validation

- `git rev-parse HEAD`: `9df3393294ae95c2a628f6df05269dcd9a207041`
- `git status --short` before work: UI-2j の未コミット差分あり。reset / rebase / force overwrite は行っていない。
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。

### Browser QA

- Dev server: `http://127.0.0.1:4191/`
- Codex in-app Browser は今回も `Browser is not available: iab` だったため、Microsoft Edge headless + CDP で fallback QA を実施した。
- 一時 profile で `localStorage.clear()` 後に初期表示し、HUD の `Run` を click した。
- Result: Run は terminal state `failed` まで進み、Run button は再有効化、Stop button は無効化、既存 `agent-workflow-studio.run-history.v1` に `traceAudit` 付き run record が 1 件保存された。
- `externalResources: []` を確認した。
- QA 用の一時 script、dev server、headless Edge、一時 profile / log は削除した。

### Remaining gaps

- UI-2j の timeout は今回のソース状態では再現しなかった。前回 timeout は headless 待機条件、preview/dev server 差、または一時 profile 状態に由来した可能性が高いが、確定原因は未特定。
- 本追試は Run terminal state と run history append の確認に限定し、Run Detail compare の全操作再検証は UI-2j の Browser QA 結果を維持する。

### Next recommended slice

1. Run Detail compare を step-level safe evidence grouping / focused node-edge scoped diff へ拡張する。
2. Runtime edge semantics を connection condition model / retry policy editor / edge-level audit events へ拡張する。
3. Notification bundle を既読/ack/pin 付きの durable notification model へ拡張する（既存 localStorage key 方針を設計してから）。
4. 軽微な文言修正・小さい CSS 調整のみなら `GPT-5.4-mini medium`、上記の実装スライスは `GPT-5.5 high` を推奨する。

---

## Phase UI-2j: Run Detail Minimal Multi-run Comparison

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: ユーザーが `ALLOW_XHIGH` していないため、今回の実装は `GPT-5.5 high` として継続した。今後このスレッドでは、明示的な `ALLOW_XHIGH` がない限り xhigh を提案・継続しない。単純な文言修正・小さい CSS 調整は `GPT-5.4-mini medium` 扱いに修正した。
- Scope: Run Detail multi-run comparison の最小版。2つの run/audit snapshot を選択し、safe audit summary と run metadata のみを比較する。UI は `RunDetailPanel` 内に限定し、Canvas HUD / Game HUD 全体レイアウトは変更しない。新規 localStorage key、backend/API、credential 保存、実 AI API、外部 asset、依存追加は行わない。

### Implemented

- `src/domain/runDetail.ts` に `RunDetailComparisonView`, `RunDetailComparisonOption`, `RunDetailComparisonRun`, `RunDetailDiffRow`, `buildRunComparisonView(...)` を追加した。
- 比較対象は既存 `WorkflowRunRecord.traceAudit` 付き run に限定し、current trace、raw config、prompt 本文、raw payload、artifact 本文、credential/token/password/API key は比較 view に含めない。
- `RunDetailPanel` に session-only の `Compare audits` toggle と `Base audit` / `Compare audit` selector を追加した。selector state は `RunDetailPanel` 内の React state のみで保持し、新規 localStorage key は追加していない。
- Diff 表は metadata 中心に限定し、status、mode、duration、step count、evidence count、audit events、failed/review/retry/excluded/safety counts、error/warning logs、node/connection count を表示する。
- `src/index.css` に dark HUD surface 向けの compact comparison card / selector / diff table styles を追加した。
- `AGENTS.md` のモデル運用表を、軽微な文言修正・小さい CSS 調整は `GPT-5.4-mini medium` 扱いになるよう最小修正した。

### Design asset alignment

- `03_hud-layer-model.png`: Run Detail compare は Bottom Console 内の補助 detail surface に限定し、Canvas HUD へ新しい常駐 panel を増やしていない。
- `12_minimal-always-on-hud.png`: 常時 HUD は変更せず、比較 UI は明示的に Run Detail を開いた後の on-demand toggle に留めた。
- `13_dark-theme-finished-canvas.png`: comparison card / diff table は半透明 dark surface と細い border に寄せ、Game HUD の見た目を壊さない。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap/Notification/Density toggles、selected node HUD、selected edge HUD、semantic focus、zoom mode は維持。
- `WorkflowRunRecord` / `RunTraceAuditSummary` の schema は変更していない。既存保存済み run history は `traceAudit` がなければ比較候補から除外されるだけで読み込み互換を維持する。
- 比較は read-only の pure view model で、外部 API / credential / browser storage mutation に依存しない。

### Validation

- `git rev-parse HEAD`: `9df3393294ae95c2a628f6df05269dcd9a207041`
- `git status --short` before edit: clean in `C:\dev\github\wit-maker\agent-workflow-studio`
- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱った。
- `npx.cmd tsx` direct validation: `createSampleWorkflow(...)` -> `buildRunTrace(...)` -> `createRunTraceAuditSummary(...)` -> `createWorkflowRunRecord(...)` -> `buildRunComparisonView(...)` が pass。`options: 2`, `rows: 15`, `summary: "Audit diff / changed 4 / improved 0 / regressed 2"`, `failedDelta: "+1"`, `rawPayloadPresent: false` を確認した。

### Browser QA

- Preview: `http://127.0.0.1:4187/`
- Codex in-app Browser はこのセッションで `iab` が利用不可だったため、Microsoft Edge headless + CDP で限定 QA を実施した。
- 実 UI の `Run` click は開始できたが、headless 待機中に run history 保存完了まで到達せず timeout したため、比較 UI の検証は既存 key `agent-workflow-studio.run-history.v1` に safe `traceAudit` 付き record を2件だけ入れた一時 profile で補完した。新規 key は追加していない。
- Run Detail `T` action、`RunDetailPanel` 表示、`Compare audits` toggle、2つの audit selector、diff table 表示を確認した。
- Browser QA result: `historyCount: 2`, `recordsWithAudit: 2`, `runDetailVisible: true`, `compareToggleChecked: true`, `comparisonVisible: true`, `diffRows: 16`, `compareOptionNodes: 4`, `hasSafeOnlyLabel: true`, `hasDiffSummary: true`, `rawLeakInComparison: false`, `externalResources: []`, console errors/warnings: none captured。

### Remaining gaps

- 比較は minimal metadata diff であり、step-by-step animation、timeline scrubber、multi-run visual replay、edge-level durable route event diff ではない。
- Browser QA の実 UI Run 完了待ちは headless 環境で timeout した。今回の変更対象である comparison UI は safe audit seed で確認済みだが、Run 完了経路そのものの追加調査は別スライスにする。
- Diff severity は count metadata に基づく read-only 表示であり、原因分析や regression rule engine は未実装。

### Next recommended slice

1. Run 完了待ち timeout の原因を小スライスで調査し、headless QA でも run history 完了が安定するようにする。
2. Runtime edge semantics を connection condition model / retry policy editor / edge-level audit events へ拡張する。
3. Run Detail compare を step-level safe evidence grouping / focused node-edge scoped diff へ拡張する。
4. Notification bundle を既読/ack/pin 付きの durable notification model へ拡張する（既存 localStorage key 方針を設計してから）。

---

## Phase UI-2i: Run Detail Audit Replay / Deep Link

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: 「ユーザー明示により GPT-5.5 high として継続」を継続記録する。今回の実行時点では、ユーザーが GPT-5.5 xhigh に変更したので実施と明示したため、その前提で実装した。
- Scope: UI-2h の次スライスとして、Run Detail に audit replay / run selection / node and edge deep link を追加する。新規 localStorage key、backend/API、credential 保存、実 AI API、外部 asset、依存追加は行わない。

### Implemented

- `src/domain/runDetail.ts` に `RunDetailReplayView`, `RunDetailReplayOption`, `RunDetailFocusTarget`, `buildRunDetailReplayView(...)` を追加し、current trace と既存 run history 内の safe `traceAudit` snapshot を切り替えられる pure view model を実装した。
- `RunDetailPanel` に `Replay source` selector を追加し、current runtime trace / durable audit snapshot を on-demand に切り替えられるようにした。
- `RunDetailPanel` は選択 node / 選択 edge を focus target として受け取り、関連 step evidence を強調し、`Node` / `Edge` deep link button から canvas selection へ戻れるようにした。
- `AppShell` に session-only の `selectedConnectionId` と `selectedRunDetailRunId` を追加し、React Flow edge selection を `CognitiveWorkflowCanvas` 内部から上位 state へ lift した。新規 localStorage key は追加していない。
- `SelectedObjectHud` と `SelectedEdgeHud` に `Open trace` quick action を追加し、選択中の node/edge context から Bottom Console の `RunDetail` へ到達できるようにした。
- `HudNotificationBundle` の run history 行に `Replay` 導線を追加し、履歴から特定 run の audit snapshot を Run Detail で開けるようにした。
- `CanvasCommandHud` に `T` quick action を追加し、always-on HUD から audit replay surface を開けるようにした。

### Design asset alignment

- `07_node-detail-hud.png` / `11_selection-overlay.png`: selected node/edge HUD から trace detail を on-demand に開く導線を追加し、HUD 内に大きな詳細 page を抱え込まない構造にした。
- `03_hud-layer-model.png`: Run Detail は Bottom Console の detail surface として残しつつ、Canvas selection / notification / always-on HUD から呼び出される補助レイヤーへ位置づけた。
- `12_minimal-always-on-hud.png`: 常時表示は `T` の短い trace action に留め、run selector と replay 本文は on-demand console へ逃がした。
- `13_dark-theme-finished-canvas.png`: Run Detail の replay controls / focus highlight / deep link row を dark HUD surface として追加した。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap/Notification/Density toggles、selected node HUD、selected edge HUD、semantic focus、zoom mode は維持。
- run selection / selected edge state は session React state のみで保持し、新規 localStorage key は追加していない。
- audit replay は既存 `WorkflowRunRecord.traceAudit` の safe snapshot から `RunTrace` を復元するだけで、raw logs、prompt 本文、raw payload、artifact 本文、credential/token/password/API key は表示・保存しない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱った。
- `npx.cmd tsx` direct validation: `createSampleWorkflow(...)` -> `buildRunTrace(...)` -> `createRunTraceAuditSummary(...)` -> `createWorkflowRunRecord(...)` -> `normalizeRunHistory(...)` -> `buildRunDetailReplayView(...)` -> `summarizeRunDetail(...)` -> `validateWorkflowImport(...)` が pass。`selectedSource: run-history`, `focusType: connection`, `stepCount: 12`, `evidenceCount: 13`, `options: 2` を確認した。

### Browser QA

- Preview: `http://127.0.0.1:4186/`
- Codex in-app Browser route はこのセッションで取得できなかったため、Microsoft Edge headless + CDP で実ブラウザ DOM / interaction QA を実施した。
- Initial canvas: command HUD / React Flow canvas / 12 nodes / 13 edges / MiniMap / `zoom-mode-overview` / `hud-density-balanced` / external asset なしを確認。
- Always-on trace: `T` quick action で Bottom Console が開き、`RunDetailPanel`、`Replay source` selector、current trace replay line が表示されることを確認。
- Node deep link: React Flow node click で `SelectedObjectHud` が出ること、Run Detail 内の `Node` deep link から node HUD selection へ戻ることを確認。
- Edge deep link: React Flow edge click で `SelectedEdgeHud` が出ること、`Open trace` で Run Detail が edge focus になり、`Edge` deep link から selected edge HUD へ戻ることを確認。
- Run: `Run` で実行し、完了後 `失敗`, `history 1`, `trace 32` を確認。
- Notification replay: `N` -> 履歴タブ -> `Replay` で run history の safe audit snapshot が Run Detail に選択され、`selectedOption` が run id、source label が `durable audit snapshot / events 32` になることを確認。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none captured
- QA screenshot: `.codex-logs/run-detail-replay-qa.png`

### Remaining gaps

- Run Detail の replay は safe `traceAudit` snapshot の読み替えであり、時系列再生 engine、step-by-step animation、multi-run diff、edge-level durable route replay ではない。
- run selection は session state であり、URL deep link や persisted run inspector preference は未実装。
- edge deep link は `WorkflowConnection` 単位の選択へ戻す導線であり、edge-level audit event の個別選択や route event scrubber は未実装。

### Next recommended slice

1. Run Detail に multi-run comparison / diff view を追加する。
2. Runtime edge semantics を connection condition model / retry policy editor / edge-level audit events へ拡張する。
3. Notification bundle を既読/ack/pin 付きの durable notification model へ拡張する（既存 localStorage key 方針を設計してから）。
4. Bottom Console の重複タブを整理し、Workflow Library / Templates を Palette drawer 側へ昇格する。

---

## Phase UI-2h: HUD History / Notification Bundle / Density Settings

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: 「ユーザー明示により GPT-5.5 high として継続」を継続記録する。今回の実行時点では、ユーザーが GPT-5.5 xhigh のまま実施と明示したため、その前提で実装した。
- Scope: UI-2g の次スライスとして、HUD history / notification bundle / density settings を Canvas First の overlay として追加する。新規 localStorage key、backend/API、credential 保存、実 AI API、外部 asset、依存追加は行わない。

### Implemented

- `src/domain/cognitiveHud.ts` に `HudDensityMode`, `HudDensityView`, `HudNotificationBundleView`, `HudNotificationItem`, `HudHistoryEntry` を追加した。
- `buildHudDensityView(...)`, `getNextHudDensityMode(...)`, `buildHudNotificationBundle(...)` を pure helper として追加し、`HudSnapshot`, `CentralHudView`, `RunTrace`, `WorkflowRunRecord[]` から credential-safe な通知/履歴/密度設定 view を導出する。
- `HudNotificationBundle` を追加し、Canvas 上の `HUD Feed` overlay として通知、Run history、密度設定を小タブで表示する。
- `CanvasCommandHud` に `N` 通知/履歴 toggle と `Q/B/D` density cycle を追加した。常時 HUD は小 chip と短い icon-like button のまま維持した。
- `GameHudShell` は session state のみで通知 HUD 開閉と density mode を管理する。Palette/Detail を開くと通知 HUD を閉じ、Canvas First の重なりを抑える。
- `ReactFlowCanvas` の HUD collision reserved rect に notification bundle を追加し、選択 node/edge HUD が通知 overlay を避けるようにした。
- `src/index.css` に dark translucent notification HUD、履歴 list、density settings、quiet/deep density class を追加した。

### Design asset alignment

- `03_hud-layer-model.png`: HUD を単一 panel ではなく、always-on / notification / selected overlay の複数層に分けた。
- `11_selection-overlay.png`: notification bundle を canvas 上の一時 overlay として扱い、selected HUD と collision する場合は placement 側で避ける。
- `12_minimal-always-on-hud.png`: always-on は `N` と `Q/B/D` の短い操作だけにし、本文は on-demand HUD へ逃がした。
- `13_dark-theme-finished-canvas.png`: notification/history/settings も暗色半透明 HUD に統一した。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap toggles、selected node HUD、selected edge HUD、semantic focus、zoom mode は維持。
- density / notification open state は session React state のみで保持し、新規 localStorage key は追加していない。
- HUD notification / history / copy summary は run counts、status、evidence count、signal summary の派生情報に限定し、raw `node.config`、prompt 本文、raw payload、artifact 本文、credential/token/password/API key は含めない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱った。
- `npx.cmd tsx` direct validation: `createSampleWorkflow(...)` -> `validateWorkflowImport(...)` -> `createWorkflowBundle(...)` -> `validateImportBundle(...)` が pass。`buildHudNotificationBundle(...)` と `buildHudDensityView(...)` も import 経路で確認した（12 nodes / 13 connections / notifications 3 / density deep）。

### Browser QA

- Preview: `http://127.0.0.1:4185/`
- Codex in-app Browser route はこのセッションで取得できなかったため、Microsoft Edge headless + CDP で実ブラウザ DOM / interaction QA を実施した。
- Initial canvas: command HUD / React Flow canvas / 12 nodes / 13 edges / MiniMap / `hud-density-balanced` / external asset なしを確認。
- Notification HUD: `N` toggle で `HudNotificationBundle` が開き、通知 / 履歴 / 密度タブを確認。履歴なし状態、density settings、copy summary 導線を確認。
- Density: settings の `Cycle density` で `hud-density-balanced` -> `hud-density-deep` と HUD chip `HUD Deep` への切替を確認。
- MiniMap / Palette / Detail / Console toggles: open / close と相互排他の挙動を確認。
- Selected node HUD: node click で概要/設定/入出力/履歴タブ付き HUD を確認。
- Selected edge HUD: edge click で runtime / observed / source step / target step / evidence / trace を確認。
- Run: `Run` で実行中表示へ入り、完了後 `失敗`, `history 1`, `trace 32`, `edge-runtime-observed 7`, `edge-runtime-blocked 3`, `edge-runtime-health-watch 3` を確認。
- Reset: `Reset` 後に `準備完了`, `audit 32`, `semantic-focus-bottleneck` へ戻ることを確認。
- JSON import/export: in-browser download/file picker は直接扱わず、DOM 導線の存在と direct code-path validation で補完した。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none captured

### Remaining gaps

- HUD density は session state であり、ユーザー設定として永続化する product settings model は未実装。
- Notification bundle は current HUD/run-history からの read-only projection であり、通知の既読/未読、pin、ack、durable notification log は未実装。
- Critical short-tone audio、assistant non-text channel、edge-level durable replay、multi-run comparison は未実装。

### Next recommended slice

1. Run Detail に audit replay / run selection / node and edge deep link を追加する。
2. Notification bundle を既読/ack/pin 付きの durable notification model へ拡張する（既存 localStorage key 方針を設計してから）。
3. Runtime edge semantics を connection condition model / retry policy editor / edge-level audit events へ拡張する。
4. Bottom Console の重複タブを整理し、Workflow Library / Templates を Palette drawer 側へ昇格する。

---

## Phase UI-2g: Runtime-backed Edge Semantics

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-02
- Model gate: 「ユーザー明示により GPT-5.5 high として継続」を継続記録する。今回の実行時点では、ユーザーが GPT-5.5 xhigh へ変更済みと明示したため、その前提で実装した。
- Scope: UI-2f の次スライスとして、Selected Edge HUD と React Flow edge 表示の delay / retry / error-route / health を、connection metadata だけでなく current `executionGraph` / `RunTrace` / validation result から導出する。新規 localStorage key、backend/API、credential 保存、実 AI API、外部 asset は追加しない。

### Implemented

- `src/domain/cognitiveHud.ts` に `EdgeRuntimeState`, `EdgeRuntimeHealth`, `EdgeRuntimeSemantics`, `buildWorkflowEdgeRuntimeMap(...)` を追加した。
- edge runtime semantics は `WorkflowConnection`、`ExecutionGraph.routes`、source/target step status、`RunTrace` evidence count、retry candidates、connection validation を統合して、`idle / ready / active / observed / blocked / stale` と `healthy / watch / blocked` を導出する。
- `buildSelectedEdgeHudView(...)` は `executionGraph` と `runTrace` を受け取り、condition / delay / retry / error-route / health / next action / copy summary を runtime-backed view に更新した。
- `ReactFlowCanvas` は `edgeRuntimeByConnectionId` を受け取り、React Flow edge に `edge-runtime-*` / `edge-runtime-health-*` class と runtime label を付与する。
- `SelectedEdgeHud` に Runtime / Observed / Source step / Target step / Evidence / Trace を追加し、選択 edge が current trace 由来か durable audit snapshot 由来かを読めるようにした。
- `src/index.css` に runtime edge glow / dash / stale 表現と edge HUD runtime block を追加した。

### Design asset alignment

- `03_hud-layer-model.png`: edge HUD が static metadata だけでなく runtime observation layer を読む構造に近づいた。
- `07_node-detail-hud.png` / `11_selection-overlay.png`: selected edge HUD に source/target step、observed route、evidence、next action を追加し、選択時だけ詳細が浮く設計を維持した。
- `12_minimal-always-on-hud.png`: always-on HUD は増やさず、詳細は selected edge HUD と edge class に閉じた。
- `13_dark-theme-finished-canvas.png`: runtime active / observed / blocked / stale を暗色キャンバス上の細い glow/dash として表現した。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap toggles、selected node HUD、semantic focus、zoom mode は維持。
- raw `node.config`、prompt 本文、raw payload、artifact 本文、credential/token/password/API key は edge HUD / copy summary / runtime semantics に含めていない。
- edge runtime state は read-only projection であり、connection model や execution runtime の保存形式は破壊していない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱った。
- `npx.cmd tsx` direct validation: `createSampleWorkflow(...)` -> `validateWorkflowImport(...)` -> `createWorkflowBundle(...)` -> `validateImportBundle(...)` が pass（12 nodes / 13 connections）。

### Browser QA

- Preview: `http://127.0.0.1:4184/`
- Initial canvas: React Flow canvas / 12 nodes / 13 edges / command HUD / MiniMap / zoom HUD / runtime edge classes 13 件を確認。
- Selected edge HUD: edge click で `SelectedEdgeHud` が表示され、Runtime / Observed / Source step / Target step / Evidence / Trace が表示されることを確認。
- Run: 実行後、semantic focus が failure に切り替わり、React Flow edge に observed 7 件 / blocked 3 件 / watch 3 件の runtime class projection が出ることを確認。
- Reset: status が準備完了に戻り、trace source は durable audit snapshot 表示へ切り替わることを確認。
- Palette / Detail / Console / MiniMap toggles: open / close を確認。
- JSON export: in-app browser の download event は未対応。DOM 導線の存在と direct code-path validation で補完した。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none in DOM (`script`, `link`, `img`)

### Remaining gaps

- Edge runtime semantics は current execution graph / trace からの read-only projection で、retry policy enforcement、conditional expression model、durable route replay、edge-level audit record までは未実装。
- Durable audit snapshot からは step evidence は読めるが、route from/to の完全復元はまだできない。
- Edge always-on badge、edge tooltip density policy、multi-run edge comparison は未実装。

### Next recommended slice

1. HUD history / notification bundle / density settings を追加し、danger visibility と collapse policy をユーザー調整可能にする。
2. Run Detail に audit replay / run selection / node and edge deep link を追加する。
3. Runtime edge semantics を connection condition model / retry policy editor / edge-level audit events へ拡張する。
4. Bottom Console の重複タブを整理し、Workflow Library / Templates を Palette drawer 側へ昇格する。

---

## Phase UI-2f: Durable Trace Audit Snapshot

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-01
- Model gate: ユーザー明示により GPT-5.5 high として継続。今回の続行時点ではユーザーが GPT-5.5 xhigh 使用中であることも明示しているため、`/status` / `/model` に依存せず実装を継続した。
- Scope: UI-2e の次スライスとして、semantic focus / Run Detail / Briefing / selected node HUD が同じ step evidence を再参照できる durable trace/audit snapshot を追加する。新規 localStorage key、backend/API、credential 保存、実 AI API、外部 asset は追加しない。

### Implemented

- `src/domain/runAudit.ts` を追加し、`RunTrace` から credential-safe な `RunTraceAuditSummary` を生成、normalize、`RunTrace` へ復元できる pure helper を実装した。
- `WorkflowRunRecord` に後方互換の optional `traceAudit` を追加し、既存 `agent-workflow-studio.run-history.v1` key の中へ保存する。既存 record は `traceAudit` なしでも読み込める。
- audit snapshot は step / run-level evidence / audit events を件数上限付きで保存し、`password`, `token`, `secret`, credential/API key 系の raw evidence は `makeRunStepEvidence(...)` の safe filter で除外する。
- `buildRunTrace(...)` は current execution/log がない場合、最新 run history の `traceAudit` から `source: 'run-history'` の RunTrace を復元する。
- `RunDetailPanel` は current trace と durable audit snapshot のどちらを見ているか、audit event count、evidence count を表示する。
- `CanvasCommandHud` は `trace N` / `audit N` chip を表示し、常時 HUD から現在の evidence source が読める。
- `SelectedObjectHud` の履歴タブに、選択ノードに紐づく durable evidence summary を表示する。
- `BriefingInputCollector` は run history record に含まれる audit evidence count を briefing input に含める。
- `runFinished` reducer で `executionGraph.activeStepId` を閉じるようにし、Stop / Cancel 後に Active run focus が残る問題を修正した。

### Design asset alignment

- `03_hud-layer-model.png`: Run Detail / Briefing / selected HUD が別々の根拠を作るのではなく、同じ durable evidence snapshot を参照する層構造に寄せた。
- `07_node-detail-hud.png` / `11_selection-overlay.png`: selected node HUD の履歴タブに step evidence を表示し、選択時 HUD が「現在状態」だけでなく直近 audit も読めるようにした。
- `12_minimal-always-on-hud.png`: always-on HUD には `trace` / `audit` の小 chip だけを追加し、詳細は Run Detail / selected HUD 側へ逃がした。
- `13_dark-theme-finished-canvas.png`: dark HUD のまま audit source と evidence count が読めるようにした。

### Existing behavior preserved

- mock-only execution、既存 localStorage key、JSON import/export、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap toggles、selected node/edge HUD、semantic focus、zoom mode は維持。
- 新規 localStorage key は追加していない。`RUN_HISTORY` 既存 key の record に optional field を追加しただけ。
- raw logs 本文、prompt 本文、raw payload、artifact 本文、credential/token/password/API key は audit snapshot に保存しない。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱った。
- `npx.cmd tsx` direct validation: audit snapshot 生成、`WorkflowRunRecord` への保存、`normalizeRunHistory(...)`、`buildRunTrace(...)` による `run-history` source 復元、sensitive keyword evidence の除外を確認し pass。
- `npx.cmd tsx` reducer validation: `runFinished` 後に `executionGraph.activeStepId` が残らないことを確認し pass。

### Browser QA

- Preview: `http://127.0.0.1:4183/`
- 初期表示 / React Flow canvas / 12 nodes / MiniMap / command HUD / external asset なし: pass
- Browser Run は in-app browser の timer が非常に遅いため、Run 開始後 Stop で cancelled audit snapshot を作成して確認した。
- Stop 後、history count が 1 になり、always-on HUD に `trace 24` が表示されることを確認。
- Reset 後、RunTrace source が `audit 24` に切り替わり、status は `準備完了`、`semantic-focus-failure` と critical overlay が出ないことを確認。
- Console HUD を開き、`RunDetailPanel` が `durable audit snapshot / events 24`、Trace source `Audit`、evidence entries を表示することを確認。
- selected node HUD の履歴タブで、選択ノードの audit snapshot evidence が表示されることを確認。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none in DOM (`script`, `link`, `img`)

### Remaining gaps

- `traceAudit` は safe summary snapshot であり、完全な replay engine / diff / deep link / multi-run comparison ではない。
- Runtime-backed edge semantics for delay / retry / error-route / health は引き続き派生表示で、完全な runtime contract ではない。
- HUD history / notification bundle / density settings / critical short-tone audio は未実装。
- `RUN_HISTORY` localStorage 内保存のため、SQLite/Tauri/file-backed durable audit store ではない。

### Next recommended slice

1. Runtime-backed edge semantics（delay/retry/error-route/health）を connection model と execution graph に接続する。
2. HUD history / notification bundle / density settings を追加し、danger visibility と collapse policy をユーザー調整可能にする。
3. Run Detail に audit replay / run selection / node deep link を追加する。
4. Bottom Console の重複タブを整理し、Workflow Library / Templates を Palette drawer 側へ昇格する。

---

## Phase UI-2e: Semantic Attention HUD Completion

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-06-01
- Model gate: ユーザー明示により GPT-5.5 high として継続。今回の続行時点ではユーザーが GPT-5.5 xhigh 使用中であることも明示したため、`/status` / `/model` での確認に依存せず実装を継続した。
- Scope: UI-2d の残ギャップだった semantic focus path と rich central HUD variants を実装し、Canvas First / Game HUD 型の注意誘導を「選択中の局所強調」から「実行状態・失敗原因・承認待ち・検証エラー由来の attention path」へ拡張する。依存追加、backend/API、credential 保存、実 AI API、外部 asset、新 localStorage key は追加しない。

### Implemented

- `src/domain/cognitiveHud.ts` に `SemanticFocusPathView`, `CentralHudView`, `buildSemanticFocusPathView(...)`, `buildCentralHudView(...)` を追加した。
- semantic focus は現在状態に限定して導出する。failure / approval / validation / retry / running / bottleneck / HUD signal の順に attention path を作り、履歴ログだけで reset 後に failure focus が残り続けないようにした。
- `GameHudShell` で semantic focus と central HUD variant を構築し、`CanvasCommandHud`, `CognitiveWorkflowCanvas`, `CognitiveHudOverlay`, `CriticalOverlay` へ渡す構成にした。
- `ReactFlowCanvas` の focus path は、edge 選択を最優先し、その次に semantic focus、最後に selected node local focus を使う。semantic focus では primary node を `focus-attention`、周辺 cause/effect を `focus-path`、非関連を dim する。
- `ReactFlowNode` に `ATTN` / `PATH` の小バッジを追加し、React Flow edge は semantic focus 時に `focus-semantic-edge` class と priority 色を受ける。
- `CognitiveHudOverlay` は central HUD variant を表示し、attention path の node/edge/evidence count を出す。`CriticalOverlay` は `HudSnapshot` だけでなく semantic critical priority も見て failure / danger を前面表示する。
- Palette / Detail drawers は Game HUD 方針に合わせて同時展開を避け、片方を開くともう片方を閉じる。Browser QA で検出した narrow viewport の drawer opacity/transform 停滞は open selector を明示して修正した。

### Design asset alignment

- `03_hud-layer-model.png`: L1 選択 HUD だけでなく、実行由来の L2/L3 attention path を canvas overlay として重ねた。
- `07_node-detail-hud.png` / `11_selection-overlay.png`: selected HUD に semantic focus reason / next action が反映され、選択と実行由来の注目が同じ canvas 上で読める。
- `12_minimal-always-on-hud.png`: always-on HUD に `ATTN <source>` chip を追加し、詳細文は central overlay 側へ逃がした。
- `13_dark-theme-finished-canvas.png`: failure / approval / validation / bottleneck の central HUD variants と semantic edge glow を dark HUD theme に追加した。

### Existing behavior preserved

- mock-only execution、localStorage 既存 key、JSON import/export code path、Run/Reset/Undo/Redo、Palette/Detail/Console/MiniMap toggles、selected node/edge HUD、zoom mode、workflow groups、inline preview は維持。
- raw `node.config`, prompt 本文, artifact 本文, credential/token/password/API key は semantic focus / copy summary / central HUD に追加していない。
- Browser download は in-app browser が非対応のため、JSON import/export は direct code-path validation で補完した。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱った。
- JSON import/export direct path: `npx.cmd tsx` で `validateWorkflowImport(...)`, `createWorkflowBundle(...)`, `createFullBundle(...)`, `validateImportBundle(...)` を検証し pass。

### Browser QA

- Preview: `http://127.0.0.1:4181/`
- 初期表示 / React Flow canvas / 12 nodes / 13 edges / MiniMap / zoom HUD / selected node HUD: pass
- semantic bottleneck focus: `semantic-focus-bottleneck`, `focus-attention=1`, semantic edge highlight を確認。
- Palette drawer / Detail drawer: open class、opacity=1、transform=0、片方ずつ表示されることを確認。
- Console HUD: open / close toggle pass。
- MiniMap: off / on toggle pass。
- Edge HUD: edge click で `SelectedEdgeHud` 表示、Select source で node HUD へ戻る導線を確認。
- Run: 実行中は active-run semantic focus、完了後 failure cause central HUD と root critical overlay を確認。
- Reset: status が `準備完了` に戻り、履歴ログだけでは critical failure focus が残らないことを確認。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none in DOM (`script`, `link`, `img`)
- Note: in-app browser は download 非対応のため JSON export の browser download event は確認不可。import/export は direct module validation で補完。

### Remaining gaps

- Runtime-backed edge semantics for delay / retry / error-route / health は引き続き派生表示で、完全な runtime contract ではない。
- Critical short-tone audio, HUD history, notification bundle, user-tunable HUD density/depth settings は未実装。
- Semantic focus は現在状態の read-only attention projection で、durable trace/audit store や replay までは未実装。
- Workflow Library / Templates の左 rail 本格化、BottomMonitor duplicate tabs の段階的整理は未完了。

### Next recommended slice

1. Durable trace/audit store を導入し、semantic focus / Run Detail / Briefing が同じ step evidence を参照できるようにする。
2. Runtime-backed edge semantics（delay/retry/error-route/health）を connection model と execution graph に接続する。
3. HUD history / notification bundle / density settings を追加し、danger visibility と collapse policy をユーザー調整可能にする。
4. Bottom Console の重複タブを整理し、Workflow Library / Templates を Palette drawer 側へ昇格する。

---

## Phase UI-2d: Measured HUD Collision Placement

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-05-31
- Model gate: ユーザー明示により GPT-5.5 high として継続。`/status` / `/model` での確認はこの環境では使わず、ユーザー明示を優先した。
- Scope: UI-2c の次スライスとして、selected node/edge HUD の実測サイズを使い、command HUD / drawer / MiniMap / Console / React Flow controls との衝突を避ける placement に更新する。依存追加、backend/API、credential 保存、実 AI API、外部 asset、新 localStorage key は追加しない。

### Implemented

- `CanvasHudSize`, `CanvasHudCollisionState`, `CanvasHudPlacement` を `src/domain/cognitiveHud.ts` に追加し、HUD anchor に placement と collision metadata を持たせた。
- `SelectedObjectHud` / `SelectedEdgeHud` は `ResizeObserver` で実 DOM サイズを測り、`CognitiveWorkflowCanvas` 経由で `ReactFlowCanvas` の placement 計算へ渡すようにした。
- `ReactFlowCanvas` は選択ノードの React Flow instance 座標だけでなく、実 DOM node rect を優先して anchor 候補を作るようにした。初期フレームで instance 座標が未確定でも HUD が null 固定になりにくい。
- command HUD / Palette drawer / Detail drawer / Console dock / MiniMap / React Flow controls の実 DOM rect を collision rect として読み、未測定時だけ CSS 寸法ベースの fallback を使う placement scorer に変更した。
- `body { min-width: 1024px; }` の影響で Game HUD 画面が横スクロールする問題を、`body:has(.game-hud-workspace)` で Game HUD 中だけ `min-width: 0` / `overflow: hidden` に上書きして解消した。
- 狭幅 viewport で command HUD が複数段に折り返す場合、実測 command HUD 下端を top-safe の基準にし、選択 HUD は内部スクロール可能な低いカードへ縮退するようにした。
- Console open 時は `console-open` workspace class を追加し、選択 HUD の max-height をさらに抑えて Bottom Console と競合しにくくした。

### Design asset alignment

- `03_hud-layer-model.png`: HUD layer 同士の重なりを実測 rect で調停する基礎を追加した。
- `07_node-detail-hud.png` / `11_selection-overlay.png`: floating HUD が選択対象だけでなく、周囲 HUD surface を避けながら出るようになった。
- `12_minimal-always-on-hud.png`: command HUD が狭幅で折り返しても、選択 HUD が常時 HUD を覆いにくい配置へ寄せた。
- `13_dark-theme-finished-canvas.png`: dark HUD の重なり過多を抑え、Canvas First の視界を維持する方向に調整した。

### Existing behavior preserved

- mock-only execution、localStorage 仕様、JSON import/export、Run/Reset/Undo/Redo、MiniMap、Palette/Detail/Console drawers は維持。
- Standard canvas は互換 fallback として維持。測定/collision-aware placement は React Flow canvas 主対象。
- credential/token/password/API key などの値を HUD / copy summary / storage / log に含めない方針を維持。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。
- JSON import/export direct path: `npx.cmd tsx` で `validateWorkflowImport(...)`, `createWorkflowBundle(...)`, `createFullBundle(...)`, `validateImportBundle(...)` を検証し pass。

### Browser QA

- Preview: `http://127.0.0.1:4180/`
- 初期表示 / dark Game HUD / React Flow nodes / MiniMap / zoom HUD: pass
- Game HUD 中の horizontal scroll: `body.scrollWidth === body.clientWidth` / `scrollX === 0` を確認し pass
- selected node HUD: `is-anchored` 表示、実測 height 反映、narrow viewport で command HUD 下へ移動し、React Flow controls / MiniMap / collapsed Console と実 overlap なしを確認。
- Palette drawer open: Browser 上で表示状態と object HUD の非重なりを確認。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none in DOM (`script`, `link`, `img`)
- Note: Browser plugin の click がこの狭幅 viewport で一部不安定だったため、Console toggle / Run のクリック確認は direct DOM state と既存 validation を補助として扱った。

### Remaining gaps

- Collision solver は DOM rect + candidate scoring の基礎実装であり、優先度付き避難先やアニメーション付き再配置までは未実装。
- Console open 中の極小 viewport では HUD をスクロールカードへ縮退する。将来は HUD の内容量自体を mode 別に減らす必要がある。
- Focus path は selected node/edge の局所 highlight で、実行 trace / cause chain / approval path 由来の semantic focus までは未実装。
- Edge HUD の delay/retry/error-route/health は引き続き派生・仮表示で、runtime semantics の完全実装ではない。
- Rich central HUD variants（approval pending / failure cause / danger）、critical short-tone audio、HUD history は未実装。

### Next recommended slice

1. 実行 trace / validation / failure cause / approval state から semantic focus path を導出し、選択以外でも attention path を出せるようにする。
2. rich central HUD variants（approval pending / failure cause / danger）を状態別に実装する。
3. Bottom Console と右 Detail HUD の重複を整理し、旧 BottomMonitor タブを段階的に薄くする。
4. HUD placement に優先度付き避難先、狭幅専用 content density、再配置アニメーションを追加する。

---

## Phase UI-2c: Anchored Selection HUD + Focus Path

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-05-31
- Model gate: ユーザー明示により GPT-5.5 high として継続。`/status` / `/model` での確認はこの環境では使わず、ユーザー明示を優先した。
- Scope: UI-2b の次スライスとして、selected node/edge HUD を viewport 座標へ anchor し、選択対象に関係する path highlight / irrelevant path dimming を React Flow 表示へ追加する。依存追加、backend/API、credential 保存、実 AI API、外部 asset、新 localStorage key は追加しない。

### Implemented

- React Flow instance の `flowToScreenPosition(...)` と現在 viewport を使い、selected node HUD / selected edge HUD の anchor 座標を `ReactFlowCanvas` から `CognitiveWorkflowCanvas` へ lift した。
- `SelectedObjectHud` / `SelectedEdgeHud` は `CanvasHudAnchor` を受け取り、固定左下/右上ではなく選択対象近傍へ追従する `is-anchored` 表示になった。
- overview / map の低 zoom では node HUD を上部 safe zone に逃がし、React Flow controls を塞がないよう調整した。
- edge 選択時は node HUD を隠し、edge HUD を主 surface として表示するようにした。
- 選択 node の直接 upstream/downstream edge と隣接 node を `focus-path`、その他を `focus-dimmed` として表示する focus path state を追加した。
- 選択 edge の source/target node と selected edge を強調し、他 node/edge を dim するようにした。
- `ReactFlowNode` に `focusRole` を渡し、React Flow edge には `focus-path-edge` / `focus-selected-edge` / `focus-dimmed-edge` class と opacity/stroke の差を付けた。

### Design asset alignment

- `07_node-detail-hud.png` / `11_selection-overlay.png`: floating HUD が選択対象近傍へ寄るようになり、選択時だけ情報密度が上がる構造を強化した。
- `03_hud-layer-model.png`: L1 Object HUD / L2 Flow HUD を canvas viewport layer と連動させた。
- `04_wireframe-main-canvas.png` / `12_minimal-always-on-hud.png`: 常時 HUD を邪魔せず、選択 path だけを強調する canvas-first 状態へ寄せた。
- `13_dark-theme-finished-canvas.png`: focus path の細い発光・非関連 path の減光を dark HUD theme に合わせて追加した。

### Existing behavior preserved

- mock-only execution、localStorage 仕様、JSON import/export、Run/Reset/Undo/Redo、MiniMap、Palette/Detail/Console drawers は維持。
- Standard canvas は互換 fallback として維持。anchor / focus path は React Flow canvas 主対象。
- credential/token/password/API key などの値を HUD / copy summary / storage / log に含めない方針を維持。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。
- JSON import/export direct path: `npx.cmd tsx` で `validateWorkflowImport(...)`, `createWorkflowBundle(...)`, `createFullBundle(...)`, `validateImportBundle(...)` を検証し pass。

### Browser QA

- Preview: `http://127.0.0.1:4179/`
- 初期表示 / dark Game HUD / 12 nodes / 13 edges: pass
- selected node HUD: `is-anchored` 表示、選択 node 近傍への追従、overview/map 低 zoom safe-zone placement: pass
- React Flow controls: node HUD と overlap しないこと、Zoom In 操作で `Overview 34%` -> `Map 49%` に変化することを確認。
- Focus path: selected node で `focus-selected=1`, `focus-path` node/edge, `focus-dimmed` node/edge が付くことを確認。
- selected edge HUD: `is-anchored` 表示、edge 選択時の node HUD 非表示、source/target/path/dim の切替、Select source で node HUD へ戻る導線を確認。
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none in DOM (`script`, `link`, `img`)

### Remaining gaps

- Anchor はカード概算寸法で clamp しており、HUD 実測サイズ・drawer/minimap/console との完全 collision solver ではない。
- Focus path は selected node/edge の局所 highlight で、実行 trace / cause chain / approval path 由来の semantic focus までは未実装。
- Edge HUD の delay/retry/error-route/health は引き続き派生・仮表示で、runtime semantics の完全実装ではない。
- Rich central HUD variants（approval pending / failure cause / danger）、critical short-tone audio、HUD history は未実装。
- Bottom Console と右 Detail HUD の重複整理、Workflow Library / Templates の左 rail 本格化は未完。

### Next recommended slice

1. HUD anchor を実測サイズ + drawer/minimap/console collision-aware placement にする。
2. 実行 trace / validation / failure cause から semantic focus path を導出し、選択以外でも attention path を出せるようにする。
3. rich central HUD variants（approval pending / failure cause / danger）を状態別に実装する。
4. Bottom Console と右 Detail HUD の重複を整理し、旧 BottomMonitor タブを段階的に薄くする。

---

## Phase UI-2b: Game HUD Canvas First Completion

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-05-30
- Model gate: ユーザー明示により GPT-5.5 high として継続。`/status` / `/model` での確認はこの環境では使わず、ユーザー明示を優先した。
- Scope: 既存 UI-2a の差分を保持したまま、固定 3 カラム管理画面寄りの shell を、Canvas First / Game HUD 型 Workflow Studio へ寄せる。依存追加、backend/API、credential 保存、実 AI API、外部画像/asset 埋め込み、新 localStorage key は追加しない。

### Implemented

- `CognitiveWorkspaceShell` を `GameHudShell` 経由に差し替え、キャンバスを全面主役にした。
- 左パレットは初期 collapsed の Palette HUD drawer、右詳細は選択時/明示 toggle の Detail HUD drawer、旧 BottomMonitor は折りたたみ Bottom Console HUD として再配置した。
- `CanvasCommandHud` を追加し、実行状態、モード、モデル、安全状態、zoom mode、Run/Reset/Undo/Redo/JSON import/export、drawer/minimap/console toggle を最小常時 HUD に集約した。
- `SelectedObjectHud` を概要/設定/入出力/履歴タブ付きの floating node HUD へ拡張し、Run selected / Open detail / Move right / Delete selected / Copy summary を追加した。
- edge selection を `CognitiveWorkflowCanvas` へ lift し、`SelectedEdgeHud` で source/target、flow type、条件、delay/retry/error-route 仮表示、health、次アクション、Select source/target、Delete edge、Copy summary を表示した。
- React Flow zoom から `overview / map / normal / detail / deep` を算出し、workspace CSS class と HUD 表示に反映した。
- `CanvasMiniMapHud` を右下 dark HUD として追加し、常時 HUD から表示/非表示を切り替え可能にした。
- `WorkflowGroupLayer` を追加し、Input/Trigger、Shape/Route、Execution、Verify/Aggregate、Output/Record の薄い非操作グループ背景を表示した。
- `buildInlinePreview(...)` と node data の inline preview を追加し、text/file/output/normalize 系を含むノードで短い preview を表示した。
- dark game HUD theme を `src/index.css` に追加し、暗色グリッド、半透明 HUD/drawer/minimap、dark readable form surface に寄せた。
- fresh state の default canvas mode を React Flow に寄せた。保存済み `standard` / `react-flow` preference は引き続き尊重する。

### Design asset alignment

- `01_game-hud-design-principles.png` / `03_hud-layer-model.png`: HUD を panel ではなく canvas overlay として扱う構造に変更。
- `04_wireframe-main-canvas.png` / `12_minimal-always-on-hud.png`: 常時表示を command/status HUD へ圧縮し、キャンバス面積を確保。
- `07_node-detail-hud.png` / `11_selection-overlay.png`: 選択時だけ node floating HUD を出し、safe summary と小タブを追加。
- `08_minimap-overview.png`: right-bottom minimap HUD を追加。
- `09_multi-workflow.png`: static group layer で意味単位を可視化。
- `10_inline-preview.png`: node card / HUD の text inline preview を追加。
- `13_dark-theme-finished-canvas.png`: 暗色グリッドと半透明 HUD の game HUD theme に寄せた。

### Existing behavior preserved

- mock-only execution を維持。backend/API、real AI/connector、credential UI/storage は追加なし。
- 既存 workflow / template / app settings / run history / canvas state の localStorage 仕様は増やしていない。
- Run All / Run Selected / Run From Selected / Dry Run / Stop / Reset / Undo / Redo / JSON export / JSON import / Detail Drawer 相当の導線は維持。
- BottomMonitor の既存タブは Console HUD 内に互換保持。

### Validation

- `npm.cmd run typecheck`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- Vite chunk-size warning のみ発生。既存許容警告として扱う。
- JSON export/import direct path: `npx.cmd tsx` で `validateWorkflowImport(...)`, `createWorkflowBundle(...)`, `createFullBundle(...)`, `validateImportBundle(...)` を検証し pass。

### Browser QA

- Preview: `http://127.0.0.1:4178/`
- 初期表示 / React Flow canvas / dark HUD theme / 12 nodes / 13 edges / 5 workflow groups: pass
- Palette drawer / Detail drawer / Bottom Console HUD / MiniMap toggle: pass
- Node HUD 表示、概要/設定/入出力/履歴タブ、Run selected、Open detail、Move right、Delete confirm + Cancel: pass
- Edge HUD 表示、Copy summary 導線、Select source、Select target: pass
- Zoom mode switching: `Map 42%` -> `Overview 25%` -> `Detail 219%` と workspace class 変化を確認。
- Run / Reset / React Flow position reset / JSON import-export controls reachable: pass
- Browser console errors/warnings: none captured
- External script/link/image assets outside localhost: none in DOM (`script`, `link`, `img`)

### Remaining gaps

- Floating node/edge HUD は固定位置で、まだ選択オブジェクト座標への追従はしていない。
- Path dimming / focus highlight / rich central HUD variants / critical short-tone audio / HUD history は未実装。
- Edge HUD の delay/retry/error-route/health は派生・仮表示で、runtime semantics の完全実装ではない。
- Workflow Library / Templates の左 rail 本格化、BottomMonitor duplicate surface の整理は未完。
- Standard canvas は互換 fallback として維持しており、Game HUD の完全機能は React Flow 主対象。

### Next recommended slice

1. selected node/edge HUD を viewport 座標へ anchor し、対象近傍に追従させる。
2. Focus path highlight / irrelevant path dimming を React Flow edge/node style に追加する。
3. rich central HUD variants（approval pending / failure cause / danger）を状態別に実装する。
4. Bottom Console と右 Detail HUD の重複を整理し、旧 BottomMonitor タブを段階的に薄くする。

---

## Phase UI-2a: Selection Overlay + Minimal Canvas HUD Foundation

- Branch: `codex/selection-overlay-minimal-hud`
- Date: 2026-05-30
- Model gate: Recommended model was `GPT-5.5 high` / `GPT-5.5 xhigh`. This Codex environment could not run `/status` or `/model`, and the active model exposed to the agent was not confirmed as GPT-5.5. The agent stopped once with "Model change required before implementation"; the user then explicitly replied `PLEASE IMPLEMENT THIS PLAN`, so implementation proceeded under user continuation approval.
- Scope: Issue #34 / `docs/design/cognitive-workspace/` next slice. Add a selection-time object HUD on the canvas without changing storage, runner, backend/API, credentials, or real connector behavior.

### Implemented

- Added `SelectedObjectHud` as an L1 object HUD surface inside `CognitiveWorkflowCanvas`.
- Added `SelectedNodeHudView` and `buildSelectedNodeHudView(...)` in `src/domain/cognitiveHud.ts` so the overlay receives a typed, database-compatible projection instead of formatting raw workflow state in the component.
- The selected-node HUD shows only compact local context: node title, status, priority/alert level, input/output port counts, incoming/outgoing connection counts, token/latency estimate, HUD focus match, and one recommended action.
- The overlay renders only when a node is selected. It is canvas-local and read-only, not a BottomMonitor tab and not a right-sidebar replacement.

### Design asset alignment

- `04_wireframe-main-canvas.png`: adds a canvas-local selected object surface without changing the shell.
- `07_node-detail-hud.png`: establishes a compact node detail HUD with local status, I/O, warning/focus, and quick action context.
- `11_selection-overlay.png`: selection reveals detail; unselected state stays quiet.
- `12_minimal-always-on-hud.png`: no new permanent dashboard or large text region was added.
- `03_hud-layer-model.png`: implements an L1 object HUD bridge while preserving L3/L4 overlay surfaces for later phases.

### Explicit non-goals

- No edge HUD bridge; `ReactFlowCanvas` still owns selected edge state internally.
- No minimap, zoom-level representation switching, focus path dimming, critical audio cue, multi-workflow view, backend API, database, Tauri, credential UI, real AI API, or new localStorage keys.
- `StagePreview` remains below the canvas.

### Validation

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run build`: pass (existing Vite chunk-size warning remains)

### Browser QA

- Preview: `http://127.0.0.1:4177/`
- App starts: pass
- Canvas remains primary: pass
- Selected node shows `選択オブジェクトHUD`: pass
- HUD remains canvas-local and compact: pass
- Run button executes existing mock flow: pass
- Reset remains reachable and works: pass
- JSON export/import controls remain reachable: pass
- Detail Drawer remains reachable: pass
- Console runtime errors: none captured
- External script/link/image assets outside localhost: none captured

---

## Phase UI-0 / UI-1: Cognitive Workspace Shell Foundation

- Branch: `feat/ui-system-redesign-cognitive-workspace`
- Date: 2026-05-26
- Model: Claude Opus 4.7 (`claude-opus-4-7`)
- Scope: Issue #34 UI System Redesign — panel-first UI を cognitive workflow workspace へ移行する shell 土台。Issue #31 概念レイヤー（認知HUD = 注意配分編集レイヤー、状況補佐官 = 状況説明生成レイヤーの人間向け表現、4D Text Briefing = 出力チャネル1つ）を縮小しないための受け皿構造を作る。

### 設計宣言

`panel-first UI → cognitive workspace UI` への移行を開始した。
以後の UI 実装は以下の region 責務に従う。

```
Top    : Global Run Control + Current State Strip
Left   : Component Palette / Workflow Library / Templates
Center : Cognitive Workflow Canvas (+ HUD overlay)
Right  : Situation / Inspector / Assistant / Human Review (switchable)
Bottom : Collapsible Detail Drawer Dock (= demoted BottomMonitor)
Overlay: Cognitive HUD overlay (canvas-attached) + Critical Overlay (root)
```

旧構造:

```
Top    : TopBar (Run buttons only)
Body   : .workspace-grid = PartsPalette | (Canvas + StagePreview) | Inspector
Bottom : .bottom-monitor = 12 タブが主役（認知HUD / ブリーフィング / 実行詳細 を含む）
```

新構造との関係:

- BottomMonitor は本フェーズで `DetailDrawerDock` 内に格下げした（デフォルト折りたたみ）。既存タブ（認知HUD / ログ / メトリクス / キュー / 出力 / 実行グラフ / 評価 / エージェント / ストレージ / Roadmap / ブリーフィング / 実行詳細）は当面 Drawer 内で互換性のために維持する。これらは **Detail Surfaces** であって、認知HUD本体・状況補佐官本体ではない。
- 認知HUD本体は `CognitiveHudOverlay` (canvas 上) + 右パネル `Situation` モードに置かれた。`BottomMonitor` の `認知HUD` タブは派生サマリーである。
- 状況補佐官本体は右パネル `補佐官` モードに置かれた。`BriefingPanel` (4D Text Briefing) は出力チャネルの 1 つとして wrap されている。
- 右パネルは selected node config 専用ではなく、`状況 / 選択 / 補佐官 / レビュー` の 4 モード切替になった。

### 追加ファイル (`src/components/workspace/`)

- `CognitiveWorkspaceShell.tsx` — Top/Left/Center/Right/Bottom/Overlay を arrange する新 root layout
- `GlobalRunControl.tsx` — Run / Selected / FromSelected / Dry / Stop / Reset / Undo / Redo / Export / Import / Canvas mode を 1 領域に統合
- `CurrentStateStrip.tsx` — 実行状態 / 最重要状態 / フォーカス / モデル / 安全状態を短く表示する read-only ストリップ
- `WorkspaceLeftRail.tsx` — Components / Workflow Library / Templates のタブ構造。Library / Templates は WIP scaffold（Detail Drawer 経由で既存機能にアクセス可能）
- `CognitiveWorkflowCanvas.tsx` — `WorkflowCanvas` / `ReactFlowCanvas` を内包し HUD overlay を canvas に重ねる薄いラッパ
- `CognitiveHudOverlay.tsx` — central HUD card placeholder + focus target ラベル。priority=normal では何も描画しない（沈黙ルール）
- `WorkspaceRightPanel.tsx` — Situation / Inspector / Assistant / Human Review の 4 モード切替コンテナ
- `SituationPanel.tsx` — `HudSnapshot` から派生した「今の問題 / 原因候補 / 影響範囲 / 次アクション」の read-only view
- `AssistantPanel.tsx` — 既存 `BriefingPanel` を wrap、4D Text Briefing は出力チャネルの 1 つと明記
- `DetailDrawerDock.tsx` — 旧 BottomMonitor を主役から降ろす collapsible dock。デフォルト折りたたみ
- `CriticalOverlay.tsx` — priority=critical のときだけ最前面に出る banner。critical 短音通知は未実装として構造に残置

### 更新ファイル

- `src/App.tsx` — 変更なし（`AppShell` を経由）
- `src/components/AppShell.tsx` — JSX 部分を新 `CognitiveWorkspaceShell` 呼び出しに差し替え。state / reducer / handlers / refs / useEffects は完全に維持。TopBar / PartsPalette / Inspector / WorkflowCanvas / ReactFlowCanvas / StagePreview の import は Shell 側へ移動。
- `src/components/NodeCard.tsx` — `node-hud-badge` を追加。失敗 / 確認待ち / 停止 / 再試行可 のときのみ表示（沈黙ルール）。
- `src/components/ReactFlowNode.tsx` — 同上の HUD badge を追加。
- `src/index.css` — `.cognitive-workspace*` / `.global-run-control*` / `.current-state-strip*` / `.workspace-left-rail` / `.workspace-right-panel` / `.left-rail-tabs` / `.right-panel-tabs` / `.cognitive-workflow-canvas*` / `.cognitive-hud-overlay*` / `.critical-overlay*` / `.situation-*` / `.assistant-*` / `.detail-drawer-dock*` / `.node-hud-badge*` のスタイル追加。既存 `.app-shell` / `.workspace-grid` / `.top-bar` selector は触らず残置（将来削除可）。

### Issue #34 整合 / Issue #31 不変条件

- 認知HUD = 注意配分編集レイヤー：`CognitiveHudOverlay` (canvas) + `SituationPanel` (right) + `CriticalOverlay` (root) の 3 surface で受ける構造に再配置。`BottomMonitor` の `認知HUD` タブはサマリー扱い。
- 状況補佐官 = 状況説明生成レイヤーの人間向け表現：右パネル `補佐官` モード = `AssistantPanel` が受ける。`BriefingPanel` (4D Text Briefing) は出力チャネル 1 つとして wrap。音声 / アバター / 動画 / ニュース風動画 / 次アクション提示は未実装の future channel として `AssistantPanel.tsx` に明記。
- 4D Text Briefing ≠ 状況補佐官全体：上記の通り。
- BottomMonitor 主役構造は廃止：`DetailDrawerDock` で collapsible 化。デフォルト折りたたみ。
- selected node Inspector 中心構造は廃止：右パネル 4 モード化。`状況` を default モードに。

### 実装しなかったもの（意図的に未着手）

- 認知HUD本体ロジック（注意配分編集の実エンジン。ノード/エッジ単位の dim / highlight / focus path 計算）。Overlay 受け皿のみ実装。
- 状況補佐官本体（状況説明生成パイプラインの実 AI 接続、TTS / アバター / 動画チャネル）。`BriefingPanel` (mock) ラップのみ。
- Critical 短音通知の音声再生。
- BottomMonitor タブの強制削除。互換のため Drawer 内で全タブ維持。
- NodeCard / ReactFlowNode の severity / priority / human-gate / failure-cause の細粒度バッジ（現在は status から導出する 4 種のみ）。
- ConnectionLine / Edge への flow health / delay / retry / error route overlay。
- 実 AI API 接続、credential UI、追加の localStorage 永続化。
- `package.json` 依存追加。
- Phase 1b/1c/SA-1 系の新機能追加（前任申し送りは保留）。

### Validation

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run build`: pass（既存 chunk size warning は変わらず）

### Browser QA

- preview tools 経由で実施予定（このフェーズの最終ステップ）

### 未解決リスク

- BottomMonitor の HUD / Briefing / RunDetail タブと、右パネル / Overlay 側の認知HUD / 補佐官表示が二重化している。次フェーズで Drawer 側を段階的に薄くする予定。documentation で「Detail Surface であって本体ではない」と明記済み。
- `WorkflowCanvas` (standard) / `ReactFlowCanvas` 両方を Cognitive Workflow Canvas 内にそのまま内包しているため、edge overlay や node dim の実装は次フェーズで両系統に追加する必要がある。
- DetailDrawerDock を初期 collapsed にしたため、既存ユーザーが「タブが消えた」と誤解する可能性。1 行ヘッダーで「詳細を開く」ボタンを常時可視にして緩和。
- `CurrentStateStrip` の「推奨モデル」「現在モデル」は静的文字列。将来 settings から取得する余地を残す。

---

## Phase read-only-run-detail-panel

- Branch: `feat/read-only-run-detail-panel`
- Date: 2026-05-26
- Model: Claude Sonnet 4.6 High
- Scope: read-only Run Detail panel UI foundation — safe step-level evidence inspection + Situation Assistant evidence navigation foundation

### Files changed

- Added: `src/components/RunDetailPanel.tsx`
- Updated: `src/components/BottomMonitor.tsx` — `RunDetail` tab, `runTrace` prop, Briefing evidence reference count
- Updated: `src/components/AppShell.tsx` — `useMemo` for `buildRunTrace`, `runTrace` passed to `BottomMonitor`
- Updated: `src/storage/localAppSettings.ts` — `RunDetail` added to `VALID_MONITOR_TABS`
- Updated: `src/index.css` — `.run-detail-*` styles, `.briefing-evidence-reference` style
- Added: `docs/architecture/read-only-run-detail-panel.md`
- Updated: `PROJECT_STATE.md`

### Safety decisions

- `RunDetailPanel` renders only sanitized `RunDetailSummary` fields (counts, titles, evidence summaries).
- Evidence summaries are already filtered by `containsConnectorSensitiveKeyword` and truncated at 240 chars in `makeRunStepEvidence`.
- `node.config` free text, prompt body, raw provider payload, full log payload, and artifact content are structurally absent from `RunDetailSummary`.
- `excludedEvidenceCount` and `safetyWarnings` are shown when evidence was filtered.
- No new localStorage keys added.
- No real AI API connection added.
- No run trace persistence added.

### Validation

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run build`: pass (chunk size warning is pre-existing)

### Browser QA

- Preview server: `http://localhost:5173/`
- App starts without runtime errors: pass
- 実行詳細 tab visible in BottomMonitor: pass
- Run ID displayed in panel header: pass (run-2026-05-26T05:02:34.852Z)
- Step count, evidence count, excluded count, briefing reference count all shown: pass
- Step evidence grouped per node: pass (8 step cards)
- evidence kinds shown as tags (node_status, connector_job, log_entry, human_review): pass
- review_required step shows warn severity badge: pass (チェック step)
- Briefing tab evidence reference count shown: pass ("step evidence 参照可能件数: 46 件")
- No new runtime errors after key fix (React fiber key confirmed as numeric index `"0"`): pass
- Connector readiness still shows real: no: pass
- No credential-like string in evidence entries: pass (sanitized text only)
- No real AI API request made: pass
- Existing tabs (認知HUD, ブリーフィング, ストレージ) unaffected: pass

### What is intentionally not implemented

- Real AI API connection
- API key UI or credential input/storage
- Run trace persistence
- Deep linking between Briefing and RunDetail
- Per-step navigation from HUD focus target
- Replay engine
- Tauri / SQLite
- SA-2 real adapter

### Next recommended phase

1. Run a second Run All to capture `error` severity evidence (FAIL path with connector failure) and confirm error badge renders.
2. SA-2: real adapter boundary concretization after credential-safe resolution exists.
3. Briefing ↔ RunDetail evidence deep linking (click evidence in briefing → jump to step in RunDetail).
4. HUD focus target → RunDetail step navigation.

### Unresolved risks

- Run trace is derived from runtime state only; lost on reload. Future trace store needed for history navigation.
- preview tool console log buffer is cumulative; historical duplicate-key errors (from before the `key={i}` fix) appeared in the buffer even after the fix was confirmed working via React fiber inspection.

---

## Phase run-trace-step-evidence-foundation

- Branch: `feat/run-trace-step-evidence-foundation`
- Date: 2026-05-26
- Model: GPT-5.5 xhigh (user-confirmed)
- Scope: domain foundation for run / step evidence used by mock-only Situation Assistant briefing
- Source alignment:
  - `docs/project/PROJECT_GOAL.md`
  - `docs/project/SOURCE_OF_TRUTH.md`
  - `docs/architecture/credential-safety-boundary.md`
  - `docs/architecture/real-connector-adapter-design.md`
  - current `src/domain/briefingInputCollector.ts`
  - current connector request / response / error / readiness / adapter boundary files

### Updated files

- Added: `src/domain/runStepEvidence.ts`
- Added: `src/domain/runTrace.ts`
- Added: `src/domain/runDetail.ts`
- Updated: `src/domain/briefing.ts`
- Updated: `src/domain/briefingInputCollector.ts`
- Updated: `src/domain/briefingPromptBuilder.ts`
- Updated: `src/adapters/briefing/MockBriefingAdapter.ts`
- Added: `docs/architecture/run-trace-step-evidence.md`
- Updated: `PROJECT_STATE.md`

### Safety decisions

- `RunTrace` is derived from current runtime state and is not persisted.
- `RunStepEvidence` stores safe summaries only.
- `node.config`, prompt body, raw provider payloads, raw log payloads, and artifact content are not collected as evidence.
- Credential-like strings are excluded by the shared connector-sensitive keyword filter before evidence enters `BriefingInput`.
- `RunDetailSummary` passes only selected safe evidence summaries, safety warnings, counts, and IDs into briefing.
- Run History schema remains unchanged.
- No new localStorage keys were added.
- No real AI API connection or provider SDK was added.

### Briefing evidence impact

- Briefing input now includes `runDetail`.
- `runDetail` contains current run id, step count, evidence count, excluded evidence count, safety warnings, selected step evidence, and step-level grouped summaries.
- Mock briefing output now reflects step evidence counts and can cite safe step-level evidence for failed / review_required / retry paths.
- Input modes still apply:
  - `all`: includes broad safe evidence
  - `latest-run`: focuses on the active/current run trace
  - `errors-only`: filters toward error, warning, review, retry, and safety evidence

### Validation

- `npm run build`: pass (Vite chunk-size warning remains existing)
- `npm run lint`: pass
- `npm run typecheck`: pass
- Browser QA: pass via preview server `http://127.0.0.1:4176/` and Codex in-app Browser
  - App loaded and reload did not crash
  - Briefing tab opened and mock briefing generated
  - 4D sections rendered: What / Why / How / Next
  - Input modes worked: `全ログ`, `最新 Run のみ`, `エラーのみ`
  - Failed run path produced `error` severity with step-level failure evidence
  - review_required path produced `warn` severity with step-level review evidence
  - Credential-like value scan returned false for briefing UI and localStorage
  - Browser console warn/error count: 0
  - Real AI API request scan: 0
  - Cognitive HUD tab still rendered
  - Storage tab still rendered
  - Connector readiness still rendered 7 cards with `real: no`

### Next recommended phase

1. Add a read-only run detail panel that can display `RunDetailSummary` without persistence.
2. Add focused evidence links from Situation Assistant output to run / step detail.
3. Only after secure credential resolution exists, allow real adapter sanitized evidence to enter the same boundary.

## Phase connector-adapter-boundary-foundation

- Branch: `docs/credential-safety-boundary`
- Date: 2026-05-26
- Model: GPT-5.5 xhigh (user-confirmed)
- Scope: domain-only real connector adapter boundary hardening after credential-safety boundary
- Source alignment:
  - `docs/project/PROJECT_GOAL.md`
  - `docs/project/SOURCE_OF_TRUTH.md`
  - `docs/architecture/credential-safety-boundary.md`
  - `docs/architecture/real-connector-adapter-design.md`
  - `docs/architecture/connector-implementation-order.md`
  - `docs/audit/missing-systems.md`
  - `docs/audit/technical-debt.md`
  - `docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md`

### Updated files

- Added: `src/domain/credentialRef.ts`
- Added: `src/domain/connectorSafety.ts`
- Updated: `src/domain/connectorRequest.ts`
- Updated: `src/domain/connectorError.ts`
- Updated: `src/domain/connectorReadiness.ts`
- Updated: `src/domain/realConnectorAdapter.ts`
- Updated: `docs/architecture/real-connector-adapter-design.md`
- Updated: `PROJECT_STATE.md`

### Boundary decisions

- `CredentialRef` is now a first-class non-secret domain type.
- `ConnectorRequest` carries safe input summaries/content, sanitized metadata, and optional `CredentialRef`.
- `ConnectorError` diagnostics are restricted to sanitized scalar values.
- `ConnectorReadiness` now includes credential requirement metadata without credential values.
- `BaseRealConnectorAdapter` returns sanitized failed responses for wrong-adapter routing, not-ready adapters, and missing `CredentialRef`.

### Preserved non-goals

- No real AI API integration
- No API key input UI
- No credential persistence
- No provider SDK dependency
- No Tauri / SQLite / secure-store implementation
- No execution path is wired to live providers

### Validation

- `npm run build`: pass
- `npm run lint`: pass
- `npm run typecheck`: pass
- Direct safety check: pass (`makeConnectorRequest`, `makeConnectorError`, and `BaseRealConnectorAdapter` not-ready path redact credential-like values)
- Browser QA: pass via preview server `http://127.0.0.1:4175/` and headless Edge/CDP
  - App shell loaded
  - Roadmap tab opened
  - Connector readiness rendered 7 cards
  - `real: yes` count stayed 0
  - not-configured count stayed 5
  - credential-like value scan returned false
  - console entries / runtime exceptions: 0

## Phase credential-safety-boundary

- Branch: `docs/credential-safety-boundary`
- Date: 2026-05-26
- Model: GPT-5.4 high (user-reported requirement baseline; runtime metadata not exposed in this workspace)
- Scope: architecture clarification before any real AI adapter work
- Source alignment:
  - `docs/project/PROJECT_GOAL.md`
  - `docs/project/SOURCE_OF_TRUTH.md`
  - `docs/source-specs/01_要件定義書_完全版.md`
  - `docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md`
  - `docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md`
  - `docs/source-specs/situation-assistant/05_AIエージェント運用設計書_状況補佐官_完全版.md`

### Updated files

- Updated: `docs/architecture/credential-safety-boundary.md`
- Updated: `PROJECT_STATE.md`

### Decision summary

- Credential values are not ordinary app data and remain outside normal browser-side product state.
- Workflow JSON, template data, run history, logs, metrics, prompts, UI state, localStorage, and exported bundles must not persist credential values.
- Future real adapters must receive `CredentialRef` only; raw credential values must be resolved inside a secure boundary.
- Mock remains the default mode until readiness, prompt boundary, log boundary, and secure resolution are all in place.
- This phase stays architecture-only: no real API connection, no API key UI, no persistence change, no Tauri, no SQLite.

### localStorage policy

- Allowed: non-secret UI settings, workflow draft state, non-secret template data, non-secret run history summaries
- Forbidden: credential values, auth headers, API key settings, raw provider payloads, prompt bodies with secrets, free-text `node.config`

### Browser QA checklist defined

- Added explicit pre-real-adapter checks for UI, console, localStorage, workflow export, templates, run history, logs, metrics, prompt generation, `node.config` exclusion, mock fallback, and readiness-safe status display.
- Browser QA execution: not run in this phase because the change is documentation-only; the checklist is defined for the next real-adapter gate.

### Validation

- `npm run build`: pass
- `npm run lint`: pass
- `npm run typecheck`: pass

## Phase 1d: Situation Assistant briefing MVP

- Branch: `feat/situation-assistant-briefing-mvp`
- Date: 2026-05-26
- Model: GPT-5.4 high（request metadata で確認）
- Source specs consulted:
  - `PROJECT_STATE.md`
  - `AGENTS.md`
  - `docs/project/PROJECT_GOAL.md`
  - `docs/project/SOURCE_OF_TRUTH.md`
  - `docs/project/PLAN_PROTOCOL.md`
  - `docs/project/STOP_RULES.md`
  - `docs/source-specs/00_ドキュメント体系_README.md`
  - `docs/source-specs/01_要件定義書_完全版.md`
  - `docs/source-specs/02_機能仕様書_完全版.md`
  - `docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md`
  - `docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md`
  - `docs/source-specs/05_AIエージェント運用設計書_完全版.md`
  - `docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md`
  - `docs/source-specs/07_実装ロードマップ_完全版.md`
  - `docs/source-specs/situation-assistant/00_ドキュメント体系_README.md`
  - `docs/source-specs/situation-assistant/01_要件定義書_状況補佐官_完全版.md`
  - `docs/source-specs/situation-assistant/02_機能仕様書_状況説明生成_完全版.md`
  - `docs/source-specs/situation-assistant/03_UI_UX_状況ブリーフィング設計書_完全版.md`
  - `docs/source-specs/situation-assistant/04_システム設計書_状況説明生成基盤_完全版.md`
  - `docs/source-specs/situation-assistant/05_AIエージェント運用設計書_状況補佐官_完全版.md`
  - `docs/source-specs/situation-assistant/06_QA_セキュリティ_受け入れ基準_状況説明生成_完全版.md`
  - `docs/source-specs/situation-assistant/07_実装ロードマップ_状況補佐官_完全版.md`

### 実装ファイル

- Added: `src/domain/briefing.ts`
- Added: `src/domain/briefingInputCollector.ts`
- Added: `src/domain/briefingPromptBuilder.ts`
- Added: `src/adapters/briefing/BriefingAdapter.ts`
- Added: `src/adapters/briefing/MockBriefingAdapter.ts`
- Added: `src/hooks/useBriefingGenerator.ts`
- Added: `src/components/BriefingPanel.tsx`
- Updated: `src/components/BottomMonitor.tsx`
- Updated: `src/components/AppShell.tsx`
- Updated: `src/storage/localAppSettings.ts`
- Updated: `src/index.css`
- Updated: `PROJECT_STATE.md`

### 追加した domain vocabulary

- `BriefingSeverity = 'info' | 'warn' | 'error'`
- `BriefingStatus = 'idle' | 'generating' | 'done' | 'error'`
- `BriefingInputMode = 'all' | 'latest-run' | 'errors-only'`
- `BriefingResult` — `what / why / how / next / severity / isMock / generatedAt`
- `BriefingState` — non-persistent な UI state。`result` / `error` / `generatedAt` / `inputMode` を保持。
- `BriefingInput` — credential-safe に収集された workflow / metrics / execution / connectors / HUD / runHistory / logs / errors の読み取り専用入力。
- `collectBriefingInput(args)` — workflow / executionGraph / connectorJobs / HUD / runHistory から安全な説明入力を導出する pure function。
- `buildBriefingPrompt(input)` — 4D prompt を構築する pure function。

### Adapter boundary

- `BriefingAdapter.generate({ prompt, input })` で prompt 文字列と構造化入力を受ける future-compatible な境界を追加。
- Phase 1d は `MockBriefingAdapter` のみを使用。UI / domain / adapter を分離したため、将来の実 AI adapter は同じ境界へ差し替え可能。

### UI surface

- BottomMonitor の既存タブ群は保持したまま末尾に `ブリーフィング` タブを追加。
- `BriefingPanel` は empty state / input mode selector / generate button / generating state / error banner / severity badge / generatedAt / mock banner / 4D sections を表示。
- state は `useBriefingGenerator` を BottomMonitor 内で保持し、tab を切り替えてもセッション中は維持、reload 後は消える。

### Safety / credential filtering

- `BriefingInputCollector` は `node.config` をまるごと収集対象外にした。
- `payload` / artifact content / prompt 全文 / credential 値 / raw payload は briefing 入力にも UI 出力にも含めない。
- `password`, `token`, `key`, `secret`, `apiKey`, `credential`, `authorization`, `bearer` を大文字小文字無視で含む文字列を skip するフィルタを実装。
- UI は React text node のみで描画し、`dangerouslySetInnerHTML` は未使用。

### 永続化への影響

- 新しい localStorage key は追加していない。
- BriefingState / briefing result の永続化はしていない。
- Run History schema 変更なし。briefing result を run history へ保存しない。
- `localAppSettings` は既存 `activeTab` の許容値に `Briefing` を追加したのみ。

### build / lint / typecheck

- `npm run build`: pass（bundle size warning は既存どおり）
- `npm run lint`: pass
- `npm run typecheck`: pass

### Browser QA

- Preview server: `http://127.0.0.1:4174/`
- App load / reload: pass
- 既存 BottomMonitor tabs: `認知HUD` / `ログ` / `ストレージ` を確認し regression なし
- `ブリーフィング` tab 追加: pass
- Empty state / generate / generating / 4D sections / severity badge / mock banner: pass
- Input mode differences: pass
  - `全ログ`: 参照ログ 33 件
  - `最新 Run のみ`: 参照ログ 8 件
  - `エラーのみ`: 参照ログ 2 件
- Failed path briefing: `error` severity / failure-oriented copy を確認
- Review-required path briefing: `warn` severity / review-oriented copy を確認
- Storage tab run history count: `2 件` を確認
- Cognitive HUD tab: `確認待ちが 1 件あります` を確認
- Console error / warn: 0 件
- External resource requests: 0 件（localhost 以外の resource entry なし）

### Non-goals preserved

- 実 AI API 接続なし
- API key settings / SDK dependency 追加なし
- briefing history persistence なし
- Run History schema 変更なし
- Tauri / SQLite / IndexedDB / Zustand / streaming / audio / video / avatar なし

### Known risks

- `latest-run` は latest run の最新ログ群に絞る挙動であり、full trace / step detail を保持するわけではない。trace store 導入後に richer input へ広げる余地がある。
- mock briefing は deterministic template であり、自然言語の深い因果説明は将来の real adapter 導入待ち。
- 現状の credential keyword filter は substring ベースで conservative に skip するため、`key` を含む無害な文字列も除外されうる。

### 次の推奨Phase

1. Phase SA-2: 実 AI adapter 境界の具体化前に credential-safety boundary を architecture docs と settings UX で確定する。
2. Phase SA-3: trace store / run detail view と連動し、briefing input を log count から step-level evidence へ拡張する。
3. HUD と Briefing の連携強化として focus target クリック連動を追加する。

### PR

- PR #26 — `feat: add situation assistant briefing MVP`
- https://github.com/wit-maker/agent-workflow-studio/pull/26

## Phase 1c: Cognitive HUD foundation

- Branch: `feat/cognitive-hud-foundation`
- Date: 2026-05-26
- Model: Claude Opus 4.7 (推奨モデル)
- PR #23 / #24 で整った Run History 基盤に乗せて、現在状態から「今、何を見るべきか / どこが詰まっているか / どこが危険か / 次に何をすべきか」を導出する Cognitive HUD foundation を read-only view layer として追加。

### 変更ファイル

- Added: `src/domain/cognitiveHud.ts` — `HudSnapshot` / `HudSignal` / `HudCounts` / `deriveHudSnapshot(input)` を定義する pure 関数群。
- Added: `src/components/CognitiveHudPanel.tsx` — HUD snapshot を表示する read-only UI panel。
- Updated: `src/components/BottomMonitor.tsx` — `HUD` (`認知HUD`) タブを先頭に追加。`hudSnapshot` prop を受け取り `CognitiveHudPanel` を表示。
- Updated: `src/components/AppShell.tsx` — `useMemo` で `deriveHudSnapshot({ workflow, executionGraph, connectorJobs, runHistoryCount })` を計算して BottomMonitor へ渡す。
- Updated: `src/storage/localAppSettings.ts` — `VALID_MONITOR_TABS` に `'HUD'` を追加（永続化 tab 一覧）。
- Updated: `src/index.css` — `.cognitive-hud-*` クラスのスタイル追加。
- Updated: `PROJECT_STATE.md`

### 追加した domain vocabulary

`src/domain/cognitiveHud.ts`:

- `HudAlertLevel = 0 | 1 | 2 | 3 | 4 | 5` (`RiskState['level']` と整合)
- `HudPriority = 'normal' | 'watch' | 'alert' | 'critical'` (`HudState['priority']` と整合)
- `HudFocusTargetType = 'node' | 'step' | 'workflow' | 'connector' | 'storage' | 'none'`
- `HudSignalKind = 'workflow_status' | 'node_failure' | 'review_required' | 'bottleneck' | 'queue_pressure' | 'connector_attention' | 'storage_notice' | 'run_history'`
- `HudSignal` — 単一シグナルの読み取り専用表現。`alertLevel` / `priority` / `kind` / `title` / `detail` / `targetType` / `targetId` / `targetLabel` を保持。
- `HudCounts` — 派生したカウント値 (`totalNodes` / `runningNodes` / `queuedNodes` / `failedNodes` / `reviewRequiredNodes` / `blockedNodes` / `retryReadyNodes` / `connectorJobsFailed` / `connectorJobsReviewRequired` / `connectorJobsRetryable` / `runHistoryCount`)。
- `HudSnapshot` — `alertLevel` / `priority` / `summary` / `recommendedAction` / `focusTarget*` / `signals[]` / `counts`。
- `deriveHudSnapshot(input)` — `{ workflow, executionGraph, connectorJobs, runHistoryCount }` のみから snapshot を導出する pure function。localStorage / React state / 外部 API / 時計に依存しない。
- `mapAlertLevelToPriority(level)` / `hudPriorityLabels` / `hudSignalKindLabels` — ラベル変換ヘルパー。

### Signal priority

- L5 critical: workflow `failed` / 失敗ノードあり
- L4 critical: workflow `review_required` / 確認待ちノード / 確認待ちステップ / `blocked` ノード
- L3 alert: ボトルネック / コネクタージョブ failed / コネクタージョブ review_required / 再試行候補
- L2 watch: 実行中ノード / 待機列 / `retryCount >= 2`
- L1 watch: 実行履歴あり / paused or cancelled workflow
- L0 normal: いずれも該当なし

シグナルは `alertLevel` 降順 → priority rank 降順 → `id` 安定順でソートし、先頭シグナルから `focusTarget*` / `summary` / `recommendedAction` を導出する。

### 追加した UI surface

- BottomMonitor タブ `認知HUD` を先頭に追加（既存タブ順は維持）。
- `CognitiveHudPanel` 表示要素:
  - ヘッダー: priority に応じて color band (`hud-priority-critical/alert/watch/normal`)、`summary`、alert level、priority label、focus target、signal count
  - 推奨アクション 1 行
  - カウントタイル: ノード合計 / 実行中 / 待機列 / 確認待ち / 失敗 / 停止 / 再試行可 / コネクター失敗 / コネクター確認 / 実行履歴
  - 主要シグナル一覧（上位 6 件、超過分は件数で表示）

### 保存しないもの

このフェーズでは追加の永続化を行わない。HUD snapshot は現在状態から都度導出する view であり、保存モデルではない。

- 新しい localStorage キーなし
- Run History schema 変更なし
- Trace store / Situation Assistant briefing / 外部 API / Tauri / SQLite / IndexedDB / Credential / Prompt 本文 / Log 本文 / Artifact 本文 / node config の HUD 保存 — いずれも未着手

### build / lint / typecheck

- `npm run build`: pass (549.80 kB / gzip 163.70 kB、chunk size warning は既存)
- `npm run lint`: pass (0 errors, 0 warnings)
- `npm run typecheck`: pass (`tsc -b`)

### Browser QA

- Dev server: `http://localhost:5173/`
- アプリ起動: pass
- 初期ワークフロー表示: pass（12 ノード）
- BottomMonitor に `認知HUD` タブ: pass（先頭タブとして追加）
- 実行前 sample workflow: L3 alert / priority 警戒 / 主要シグナル「ボトルネック: チェック」（初期 metrics の bottleneckNodeId 由来。HUD は正しく導出）
- Run All 1 回目（failed 出口）: L5 critical / priority 危険 / 主要シグナル `workflow-failed` / `connector-failed: Claude Mock` / `retry-candidate: チェック` / `queue-pressure` / `run-history: 1 件`
- Run All 2 回目（review_required 出口）: L4 critical / priority 危険 / 主要シグナル `node-review: チェック` / `step-review: チェック` / `workflow-review-required` / `bottleneck` / `connector-review` / `queue-pressure`
- 承認して続行 後: L4 → L3 alert へ更新、review シグナル消失、`run-history: 2 件` に更新
- Storage タブ: `実行履歴: 2 件（localStorage 暫定保存 / 最新 50 件）` 維持
- Reload 後: アプリ起動 / 認知HUD タブ存在 / Run History count 2 件保持
- Console runtime error: なし（React Flow の width/height warning は pre-existing）

### Gemini review 対応 (2026-05-26)

- **comment_id=3298946166**: `countNodes` が `HudCounts` 全部を返してダミー 0 で埋めていた点を解消。`countNodesByStatus(workflow)` に改名し、ノード由来カウントだけを返す `NodeStatusCounts` 型を返す。connector / runHistory 系は `deriveHudSnapshot` 側で組み立てる。
- **comment_id=3298946171**: `connectorJobsRetryable` の `< 3` マジックナンバーを廃止。`retryPolicy.canRetry(job.retryCount)` を import して `DEFAULT_RETRY_POLICY` と同期。
- **comment_id=3298946176**: workflow が `failed` で `counts.failedNodes === 0` のとき、`executionGraph.failedStepId` を見て該当ステップの `nodeTitle` を summary に出すように改善。ステップも不明な場合は汎用 fallback。Browser で「ワークフローが失敗しました（失敗ステップ: チェック）。」を確認。

### 未解決リスク

- `runHistoryCount` のみを受け取り、最新 record の `status` までは見ていない。将来 Run History detail view を入れる際に直近 run の sentiment も HUD に反映できる。
- HUD タブはこのフェーズでは read-only。Focus target をクリックして Canvas / Inspector / Queue へジャンプする動線は未実装（Phase 1d 以降の候補）。

### 次の推奨Phase

1. Cognitive HUD interactivity — `focusTarget` クリックで Canvas / Inspector / Queue へジャンプ
2. Trace store foundation — 各 Run record に紐づく logs / steps / artifact の暫定スナップショット
3. Situation Assistant text briefing MVP — `WorkflowDocument` / Run History / HUD snapshot を入力とするブリーフィング基盤
4. Run History detail view — 履歴 record 一覧、詳細プレビュー、絞り込み

---

## Run History Lifecycle Hardening

- Branch: `fix/run-history-lifecycle-hardening`
- Date: 2026-05-25
- Model: Claude Opus 4.7
- PR #23 reviewer 留意事項 #1 への対応

### 概要

PR #23 で導入した `wasRunningRef + useEffect([isRunning, workflow.logs, workflow.status])` による間接的な実行終了検知を廃止し、**明示的な `runFinished` アクション**によるライフサイクルイベントに置き換えた。

### 変更内容

1. **`runFinished` アクション** — `workflowActions.ts` に追加。
   - Payload: `runId: string`, `workflowStatus: WorkflowStatus`, `runStatus: WorkflowRunStatus`
   - `setRunning(false)` + `setWorkflowStatus(...)` の 2 dispatch を 1 dispatch に統合。
2. **`clearCompletedRun` アクション** — `workflowActions.ts` に追加。
3. **`completedRun` フィールド** — `WorkflowState` に `{ runId: string; runStatus: WorkflowRunStatus } | null` を追加。
   - `createWorkflowState` 初期値: `null`
   - `runFinished` で `{ runId, runStatus }` をセット。
   - `clearCompletedRun` で `null` に戻す。
4. **`runNodeFailed` の変更なし** — `handleReturnReviewStep` が `runNodeFailed` 経由で `isRunning: false` を設定するため現状維持。
5. **`workflowLogsRef` は不使用** — `react-hooks/refs` lint ルールが render 中の `ref.current` 書き込みを禁止するため、`workflowLogsRef` は追加しなかった。`useEffect` は `workflow.logs` を直接参照する。
6. **`useEffect([state.completedRun, workflow.logs])` に置き換え** — 旧 `useEffect([isRunning, workflow.logs, workflow.status])` + `wasRunningRef` を削除し、`state.completedRun` を主要監視対象とする単一 `useEffect` に変更。`workflow.logs` も依存配列に含めるが、`state.completedRun` が null のときは early return するため log-only の再発火は no-op になる。
   - `state.completedRun.runId === pendingRunRef.current?.runId` を確認してから record を保存。
   - 保存後、`clearCompletedRun` を dispatch。
7. **`runPlannedWorkflow` の exit point を更新** —
   - `decision.result === 'failed'` 出口: `runFinished(runId, 'failed', 'failed')`
   - `decision.result === 'review_required'` 出口: `runFinished(runId, 'review_required', 'review_required')`
   - 通常完了出口: `setWorkflowStatus('success')` dispatch を削除し `runFinished(runId, 'success', 'success')` に統合。
8. **`stopRun` の更新** — `setRunning(false)` + `setWorkflowStatus('paused')` を `runFinished(stopRunId, 'paused', 'cancelled')` 1 dispatch に置き換え。`stopRunId` は `executionGraph?.runId ?? pendingRunRef.current?.runId ?? ''` から取得。

### 削除したもの

- `wasRunningRef: useRef(false)` — 間接的な isRunning edge 検知 ref
- `WorkflowRunStatus` の `AppShell.tsx` 内 inline import — reducer が runStatus を保持するため不要に

### PR #23 reviewer 留意事項 #1 以外の追加修正 (task doc 6 fixes)

1. **Fix 1: 不明ステータス → success 昇格を禁止** — `mapWorkflowStatusToRunStatus` helper を `runHistory.ts` に追加。不明 status は `failed` にフォールバック。
2. **Fix 2: `review_required` で pending run を早期クリアしない** — `useEffect` で `runStatus === 'review_required'` のとき `pendingRunRef.current` を null にしない。`handleApproveReviewStep` / `handleReturnReviewStep` に `runFinished` dispatch を追加し、同一 `runId` で record を上書き（`appendRunRecord` の dedup を意図的に利用）。
3. **Fix 3: キャンセル後の late async dispatch を防止** — `runPlannedWorkflow` の for ループ内、`await executeNodeStep(...)` の直後に `runToken` ガードを追加。
4. **Fix 4: `plannedConnectionCount` をプラン範囲にスコープ** — `countPlannedConnections(workflow, plan.nodes)` helper を追加。selected/fromSelected 実行時に全接続を数えず、両端が planned node set 内の接続のみカウント。
5. **Fix 5: localStorage 書き込みエラーを可視化** — `writeHistory` の catch を `console.warn` に変更。
6. **Fix 6: 不明 planner mode → mock フォールバックを廃止** — `mapRunPlannerMode` の型シグネチャを `'all' | 'selected' | 'fromSelected' | 'dryRun'` に絞り、exhaustive switch に変更。

### Browser QA 確認

- `failed` 出口: 実行 → failed record 保存 ✓
- `cancelled` 出口: 実行中に停止 → cancelled record 保存 ✓
- `review_required` 出口: REVIEW サイクル → review_required record 保存 ✓
- ランタイムエラーなし ✓
- Storage タブの「実行履歴: N 件」が正しく更新される ✓

### 追加・更新ファイル

- Updated: `src/state/workflowActions.ts` — `WorkflowRunStatus` import, `runFinished` / `clearCompletedRun` actions
- Updated: `src/state/workflowReducer.ts` — `WorkflowRunStatus` import, `completedRun` フィールド, `runFinished` / `clearCompletedRun` reducer cases
- Updated: `src/domain/runHistory.ts` — `mapRunPlannerMode` 型を絞る, `mapWorkflowStatusToRunStatus` helper 追加
- Updated: `src/storage/runHistoryStorage.ts` — `writeHistory` catch に `console.warn` 追加
- Updated: `src/components/AppShell.tsx` — `wasRunningRef` 削除, `countPlannedConnections` helper 追加, `useEffect([state.completedRun, workflow.logs])` に置き換え, `runPlannedWorkflow` / `stopRun` / `handleApproveReviewStep` / `handleReturnReviewStep` の exit dispatch 更新

### 未解決リスク

- `continueMainSequence` 内に `runToken` ガードなし — `handleApproveReviewStep` 経由の continuation は停止操作を受け付けない（既存の制限）。Phase 1c 以降での対応を推奨。

---

## Phase 1b: Durable Run History foundation

- Branch: `feat/durable-run-history-foundation`
- Date: 2026-05-25
- Model: Claude Opus 4.7 (推奨モデル相当)

### 実装内容

PR #22 で導入した `RunState` / `WorkflowDocument` / 既存 `WorkflowRunLog` を土台に、
将来の実行履歴 / 監査ログ / 状況補佐官 / 認知HUD が参照できる **Run Record の型と最小保存導線** を additive に追加した。

1. **Run History domain model** — `src/domain/runHistory.ts` を新規追加。
   - `WorkflowRunMode` = `'validate' | 'mock' | 'dryRun' | 'partial' | 'full' | 'replay'`
   - `WorkflowRunStatus` = `'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'review_required'`
   - `WorkflowRunRecord` 型に `runId / workflowId / workflowTitle / workflowSchemaVersion / mode / status / startedAt / finishedAt / durationMs / nodeCount / connectionCount / logCount / errorCount / warningCount / artifactId / sourceWorkflowDocument` を定義。
   - `WorkflowRunHistory` 型に `schemaVersion '1.0' / records[] / updatedAt` を定義。
   - `CURRENT_RUN_HISTORY_SCHEMA_VERSION = '1.0'` を export。
2. **Run Record 作成 pure 関数** — `createWorkflowRunRecord(input)` を実装。
   - `Workflow` でも `WorkflowDocument` でも入力可。
   - `logs` を渡せば `logCount / errorCount / warningCount` を自動集計。
   - `startedAt / finishedAt` から `durationMs` を導出。
   - 外部API / ブラウザAPI / 時計に依存しない。テスト容易な deterministic 構造。
   - `mapRunPlannerMode(...)` で既存 `RunMode`（`'all' | 'selected' | 'fromSelected' | 'dryRun' | 'validate'`）を `WorkflowRunMode` に変換。
3. **localStorage 保存層** — `src/storage/runHistoryStorage.ts` を新規追加。
   - `loadRunHistory()` / `saveRunHistory(history)` / `appendRunRecord(record)` / `clearRunHistory()`。
   - 上限 `MAX_RUN_HISTORY_ENTRIES = 50`（最新50件で切り詰め）。
   - 不正JSONは安全に破棄し empty history を返す。
   - 同じ `runId` が既にある場合は新しい record で置換。
   - localStorage は暫定保存。将来 Tauri / SQLite に移行可能な分離構造。
4. **Storage key 登録** — `STORAGE_KEYS.RUN_HISTORY = 'agent-workflow-studio.run-history.v1'` を追加し、`storageValidation` / `PersistencePanel` / `localStorageAdapter.clearAll()` に反映。
5. **Run All 完了後の record 追加** — `AppShell.tsx` で:
   - `runPlannedWorkflow` 起動時に `pendingRunRef` に `runId / startedAt / mode / workflowSnapshot / plannedNodeCount / plannedConnectionCount` を記録。
   - `useEffect([isRunning, workflow.logs, workflow.status])` 内で `isRunning` が true→false に遷移したら、`workflow.logs.filter(runId === pending.runId)` から集計値を作り、`workflow.status` から `WorkflowRunStatus` を判定して `appendRunRecord(...)` を呼ぶ。
   - `workflow.status === 'paused' / 'cancelled'` → `cancelled` record として保存（停止ボタン経由を含む）。
6. **Storage タブに 1 行表示** — `BottomMonitor` に `runHistoryCount: number` プロパティを追加し、Storage タブで `実行履歴: N 件（localStorage 暫定保存 / 最新 50 件）` を表示。既存ログ表示 / Persistence パネル / ImportExport は壊さない。
7. **Storage 全リセット連動** — `handleResetStorage()` で `pendingRunRef.current = null` と `setRunHistory(loadRunHistory())` を実施。

### 追加・更新ファイル

- Added: `src/domain/runHistory.ts`
- Added: `src/storage/runHistoryStorage.ts`
- Updated: `src/storage/storageKeys.ts` — `RUN_HISTORY` キー追加
- Updated: `src/storage/localStorageAdapter.ts` — `clearAll()` から `clearRunHistory()` を呼ぶ
- Updated: `src/storage/storageValidation.ts` — `RUN_HISTORY` を JSON 形式として登録、ラベル `実行履歴`
- Updated: `src/components/PersistencePanel.tsx` — `RUN_HISTORY` ラベル追加
- Updated: `src/components/BottomMonitor.tsx` — `runHistoryCount` prop 追加、Storage タブに 1 行表示
- Updated: `src/components/AppShell.tsx` — `pendingRunRef` / `wasRunningRef` / `runHistory` state、Run 完了時の `useEffect` で record 保存、`runPlannedWorkflow` 起動時の pending 登録、`handleResetStorage` 連動
- Updated: `PROJECT_STATE.md`

### Run History の保存形式

```json
{
  "schemaVersion": "1.0",
  "records": [
    {
      "runId": "run-2026-05-25T10:12:05.498Z",
      "workflowId": "workflow-bootstrap-mvp",
      "workflowTitle": "Agent Workflow Studio Bootstrap MVP",
      "workflowSchemaVersion": "1.0",
      "mode": "full",
      "status": "failed",
      "startedAt": "2026-05-25T10:12:05.498Z",
      "finishedAt": "2026-05-25T10:12:21.203Z",
      "durationMs": 15705,
      "nodeCount": 12,
      "connectionCount": 13,
      "logCount": 33,
      "errorCount": 2,
      "warningCount": 0
    }
  ],
  "updatedAt": "2026-05-25T10:12:21.210Z"
}
```

`sourceWorkflowDocument` フィールドは入力が `WorkflowDocument` の場合のみ自動付与される（現状の `Workflow` 入力では undefined）。

### Credential / Prompt 保存回避の説明

Run Record に含まれるのは **集計値とメタデータのみ**：
- `runId / workflowId / workflowTitle / workflowSchemaVersion / mode / status / startedAt / finishedAt / durationMs`
- `nodeCount / connectionCount / logCount / errorCount / warningCount`
- `artifactId`（参照のみ。本体は保存しない）
- `sourceWorkflowDocument`（workflowId / schemaVersion / title のみ）

明示的に保存しないもの：
- Credential / API key / token
- Prompt 全文
- ノード config の中身
- `WorkflowRunLog.message` / `WorkflowRunLog.payload` 本文
- `WorkflowArtifact.content` 本文

`logs` 全文は `appendRunRecord` 経由では永続化されない。`createWorkflowRunRecord` は logs を **集計してから捨てる**（参照は保持しない）。

### build / lint

- `npm run build`: pass (536.24 kB / gzip 160.41 kB、chunk size warning は既存)
- `npm run lint`: pass (0 errors, 0 warnings)
- `npm run typecheck`: script なし → `npm run build` 内の `tsc -b` を代替として確認済み

### Browser QA

- Dev server: `http://localhost:5173/`
- アプリ起動: pass（12 ノード初期表示）
- ストレージタブ初期表示: pass（`実行履歴: 0 件` 表示）
- Run All 実行 1 回目: pass（`failed` outcome → record 1 件追加、`実行履歴: 1 件`）
- Record 内容確認: `runId / workflowId / mode='full' / status='failed' / durationMs=15705 / nodeCount=12 / connectionCount=13 / logCount=33 / errorCount=2 / warningCount=0`（credential / prompt / log message 本文は含まれない）
- 停止ボタン: pass（`cancelled` record 追加、合計 2 件）
- Reload: pass（2 件保持）
- 再度 Run All: pass（3 件目 record 追加）
- Storage タブ整合性: pass（StorageBoundaryPanel / ImportExportPanel / PersistencePanel すべて表示）
- Persistence テーブルに「実行履歴 1.2 KB 保存済み」: pass
- Console error: なし
- 既存 Run All の挙動: 変更なし（ログ / メトリクス / 成果物 / status 推移は従来通り）

### 未解決リスク

- `runPlannedWorkflow` の `useEffect`-based 終了検知は `isRunning` の遷移に依存。reducer が `isRunning` を経由しない終了パス（将来追加されるなら）には漏れる可能性がある。
- Run All のサンプル ワークフローは `runCountRef.current % 3` で outcome 周期的に切り替わるため、Browser QA で `PASS` outcome を観測するには 2 回連続で実行する必要がある（既存挙動）。
- Run record は localStorage に最新50件のみ保存。多くの実行を高速に積むと古い record から失われる。
- Run record は logs / artifact 本文を参照しない設計のため、後から詳細 trace を遡るには Phase 1c 以降で別途 trace store が必要。
- 既存 Workflow 入力では `sourceWorkflowDocument` フィールドは undefined。`WorkflowDocument` 中心の保存導線が整ったら自動付与に切替できる。

### 次の推奨Phase

1. **Phase 1c**: Cognitive HUD foundation — `HudState` / `RiskState` を使った状態モデル実装
2. **Run History detail view**: 履歴 record の一覧UI、詳細プレビュー、絞り込み（mode / status / time）
3. **Trace store foundation**: 各 record に紐づく logs / steps / artifact の暫定スナップショット（localStorage / IndexedDB のどちらかで）
4. **Situation Assistant text briefing MVP** — `WorkflowDocument` / Run History / metrics を入力とするブリーフィング基盤
5. **`WorkflowDocument` を Run Record 生成入力へ統一** — `Workflow` → `WorkflowDocument` 変換関数追加後、`createWorkflowRunRecord` 入力を `WorkflowDocument` 中心に切替

---

## Phase 1: Workflow Domain Model Hardening

- Branch: `feat/workflow-domain-model-hardening`
- Date: 2026-05-25
- Model: claude-sonnet-4-6（許容モデル範囲内で続行。型追加・migration placeholder 中心の作業のため適切と判断）

### 実施内容

Source Spec §1〜§4 に照らし、現行 MVP の domain model を additive に硬化した。
`Workflow` 型は置き換えず、`WorkflowDocument` を保存・実行・監査用の新規上位形式として追加。

1. **WorkflowDocument 型整備** — `src/domain/workflowDocument.ts` を新規作成。`WorkflowDocument` / `WorkflowDocumentMetadata` / `WorkflowViewport` / `WorkflowRunConfig` / `WorkflowMigrationResult` / `CURRENT_WORKFLOW_SCHEMA_VERSION = '2.0'` を定義。
2. **NodeCategory 正規化** — `NodeCategory` 型（英語内部キー 14種）と `normalizeNodeCategory()` を `workflow.ts` に追加。旧 Japanese カテゴリを migration placeholder で吸収。
3. **状態語彙追加** — `RunState` / `RiskState` / `HudState` / `ReviewState` / `ApprovalState` を `workflow.ts` に追加。将来の Run History / Cognitive HUD / Situation Assistant の接続点を確保。
4. **`cancelled` ステータス追加** — `WorkflowStatus` / `WorkflowNodeStatus` に `cancelled` を追加。`workflowStatusLabels` / `statusLabels` / `workflowStatuses` / `workflowNodeStatuses` を同期更新。
5. **Migration placeholder** — `normalizeWorkflowDocument()` / `migrateWorkflowDocument()` を実装。`schemaVersion` なし旧形式・1.0・1.1・不明バージョンを安全に受け付け、`2.0` へ補完。不正データは `success: false` + `error` を返す。
6. **Import 正規化** — `validateWorkflowImport` が `normalizeNodeCategory()` を呼ぶよう更新。`schemaVersion '2.0'` を受け付けるよう拡張。
7. **localStorage 正規化** — `loadCurrentWorkflow()` がロード時に全ノードの category を `normalizeNodeCategory()` で正規化。旧 Japanese カテゴリを持つ既存データも自動変換される。
8. **UI display 更新** — `NodeCard` / `ReactFlowNode` / `PartsPalette` が `nodeCategoryLabels` を使って日本語表示。内部フィルタは英語キーのまま維持。

### 追加・更新ファイル

- Added: `src/domain/workflowDocument.ts`
- Updated: `src/domain/workflow.ts` — `NodeCategory` / `normalizeNodeCategory()` / `RunState` / `RiskState` / `HudState` / `ReviewState` / `ApprovalState` / `cancelled` を追加、`WorkflowSchemaVersion` を名前付き型として export
- Updated: `src/domain/displayLabels.ts` — `nodeCategoryLabels` 追加、`workflowStatusLabels` / `statusLabels` に `cancelled` 追加
- Updated: `src/domain/sampleWorkflow.ts` — category を英語内部キーへ正規化
- Updated: `src/state/workflowSelectors.ts` — `normalizeNodeCategory` import、`cancelled` をバリデーター配列に追加、schemaVersion '2.0' 受け付け、category 正規化
- Updated: `src/storage/localWorkflowState.ts` — `loadCurrentWorkflow` でロード時 category 正規化
- Updated: `src/components/NodeCard.tsx` — `nodeCategoryLabels` 使用
- Updated: `src/components/ReactFlowNode.tsx` — `nodeCategoryLabels` 使用
- Updated: `src/components/PartsPalette.tsx` — `nodeCategoryLabels` 使用、`getCategoryLabel()` ヘルパー追加
- Updated: `PROJECT_STATE.md`

### build / lint / typecheck

- `npm run build`: pass（531.02 kB / gzip 159.06 kB、chunk size warning は既存）
- `npm run lint`: pass（0 errors）
- `npm run typecheck`: script なし → `npm run build` の `tsc -b` を代替として確認済み

### Browser QA

- Dev server: `http://127.0.0.1:5173/`
- 初期ワークフロー 12ノード表示: pass
- PartsPalette カテゴリボタン（起点 / 入力取得 / 整形・前処理 / 分岐・ルーティング / 実行）: pass
- ノードカード category ラベル正規化: pass
- ノード選択: pass（Inspect で確認）
- Run All（34ログ、ステータス更新）: pass
- Storage タブ（55.1 KB、各キー保存済み）: pass
- localStorage に英語カテゴリキー保存確認: pass
- Console errors: none

### import/export compatibility

- 旧 schemaVersion なし JSON → `normalizeWorkflowDocument` で `2.0` 補完、安全に処理
- 旧 Japanese category（開始/入力/変換 etc.）→ `normalizeNodeCategory` で英語キーへ変換
- 不正 JSON → 既存 reject パスを維持
- 既存 bundle（schemaVersion 1.0）→ `validateWorkflowImport` 内で `1.0` として受け入れ継続

### 旧 Japanese カテゴリ → 英語キー 対応表

| 旧表示 | 英語内部キー | 新表示 |
|---|---|---|
| 開始 | trigger | 起点 |
| 入力 | input | 入力取得 |
| 変換 | transform | 整形・前処理 |
| 制御 | branch | 分岐・ルーティング |
| 実行 | execute | 実行 |
| 接続 | execute | 実行 |
| 品質 | check | 検査 |
| 回収 | aggregate | 集約 |
| 出力 | output | 出力 |
| 記録 | record | 記録 |
| テンプレート | template | テンプレート |
| その他 | execute | 実行 |

### 未解決リスク

- `WorkflowDocument` は `Workflow` と並存しており、まだ実行・保存フローの中心にはなっていない。将来 Phase で `Workflow` → `WorkflowDocument` へ統一するかどうかを判断する必要がある。
- `edges` / `connections` の命名統一は未判断（`normalizeWorkflowDocument` で両方を受け付けることで回避中）。
- `loadCurrentWorkflow` のカテゴリ正規化はワークフロー本体のみ。テンプレート内のノード category は保存時のまま（`normalizeSavedWorkflowTemplate` を将来拡張すると完全）。
- chunk size warning は既存問題で今回は対象外。

### 次の推奨作業

1. **Phase 1b**: Durable Run History foundation — `RunState` を使った run record の永続化モデル設計
2. **Phase 1c**: Cognitive HUD foundation — `HudState` / `RiskState` を使った state model 実装
3. **Situation Assistant text briefing MVP** — `WorkflowDocument` / run logs / metrics を入力とするブリーフィング基盤
4. `WorkflowDocument` を実際の保存・復元フローに組み込む（`Workflow` からの変換関数追加）

---

## Goal / Plan v2 Source Specs and MVP Audit

- Branch: `docs/source-specs-goal-plan-v2`
- Date: 2026-05-25
- Scope: docs-only Source of Truth整備とMVP監査。大規模UI実装、実API接続、Tauri、SQLite、Credential値保存は未実施。

### モデルゲート

- Requested: `GPT-5.5 xhigh`
- Allowed fallback: `GPT-5.5 high`
- Actual: GPT-5 ベースの Codex
- Result: 指定モデルとは不一致。作業開始時に不一致を明示し、ユーザーから継続指示があったため、この事実を記録して続行した。

### 実施内容

- `docs/project/` に Goal / Plan / Source of Truth / Stop Rules を追加。
- `docs/audit/` に current implementation map、spec coverage matrix、missing systems、technical debt を追加。
- `AGENTS.md` に Source of Truth階層、Stop Rules、Goal / Plan / Task / Prompt分離、typecheck運用を追記。
- 既存の AI Workflow Lab 原文source specsは削除・要約・改変していない。

### 追加・更新ファイル

- Added: `docs/project/PROJECT_GOAL.md`
- Added: `docs/project/PLAN_PROTOCOL.md`
- Added: `docs/project/SOURCE_OF_TRUTH.md`
- Added: `docs/project/STOP_RULES.md`
- Added: `docs/audit/current-implementation-map.md`
- Added: `docs/audit/spec-coverage-matrix.md`
- Added: `docs/audit/missing-systems.md`
- Added: `docs/audit/technical-debt.md`
- Updated: `AGENTS.md`
- Updated: `PROJECT_STATE.md`

### build / lint / typecheck

- `npm run build`: pass (`tsc -b && vite build`, bundle 507.68 kB / gzip 152.69 kB)
- `npm run lint`: pass
- `npm run typecheck`: missing script
- TypeScript check substitute: `npm run build` 内の `tsc -b` を代替として実行済み。
- Build warning: Vite chunk size warningあり。今回のdocs-only変更による新規UI/code regressionではない。

### Browser QA

- Dev server: `http://127.0.0.1:5173/`
- App starts: pass
- Initial workflow visible: pass（12ノード、13接続を確認）
- BottomMonitor visible: pass（ログ / メトリクス / キュー / 出力 / 実行グラフ / 評価 / エージェント / ストレージ）
- Queue tab: pass（コネクタージョブキュー、確認待ち、再試行候補の表示を確認）
- Agent tab: pass（Codex Mock等のmock connectorとCredential安全境界を確認）
- Storage tab: pass（localStorage保存状況とリセット導線を確認）
- Console errors: none
- Docs-only changes did not break UI: pass

### 分かったこと

- 現在MVPは、Canvas / Inspector / BottomMonitor / Template / localStorage / mock execution / mock connector queue までの入口を持つ。
- Source specs上の `07_実装ロードマップ_完全版.md` は最新remoteで追加済みで、Phase 0はまさに今回の監査成果物を完了条件としている。
- `package.json` には `typecheck` script がないため、現状は `npm run build` の `tsc -b` がTypeScript checkを兼ねている。

### 最大構想との差分

- Cognitive HUD（UI-11）は専用状態モデル・設定UIともに未実装。
- UI-12の実行履歴 / 監査ログは一部履歴と一時ログのみで、durable run history / trace / audit logは未整備。
- Run modesは Run All / Selected / From Selected / Dry Run中心で、Validate / Stop / Resume / Replayは不足。
- localStorage MVPはあるが、Tauri filesystem / SQLite / secure credential store は未実装。
- Mock connectorsはあるが、real adapter契約、接続テスト、読み取り専用/書き込み承認境界は未実装。

### 次の推奨Phase

1. Phase 1: Workflow Domain Model hardening
2. `WorkflowDocument`、category normalization、RunState / RiskState / HudState、migration placeholderを整備
3. その後に durable run history / trace / audit log と Cognitive HUD の土台へ進む

### 未解決リスク

- モデル指定不一致のまま継続したため、Goal / Source of Truth判断は将来レビュー対象にする。
- `AppShell.tsx` に実行・保存・キュー調整が集中しており、runtime/storage分離前に複雑化しやすい。
- run logs / connector queue / metrics はreloadで消えるため、監査・再現・Replayの土台として不足。
- Source specsとMVPカテゴリ名に差分があり、部品追加前に正規化が必要。

---

## M17-M20 Storage Adapter and Real Connector Design Foundation

- Branch: `feature/storage-adapter-and-real-connector-design`
- Commits:
  - M17: `440e5c8` `feat: consolidate storage adapter boundary`
  - M18: `13c17b9` `feat: harden workflow bundle import export`
  - M19: `da859f9` `feat: define real connector adapter interfaces`
  - M20 base: `3a5157a` `feat: add connector implementation roadmap documentation and domain model`
  - M20 completion: follow-up commit with Roadmap UI/docs integration

### Completed Scope

| Milestone | Status | Notes |
|---|---|---|
| M17 | Complete | Storage adapter boundary, localStorage implementation file, validation, migrations, storage health UI |
| M18 | Complete | Workflow/full-bundle export, import validation, import confirmation UI, architecture note |
| M19 | Complete | Real connector adapter request/response/error/readiness interfaces and architecture note |
| M20 | Complete | Connector implementation order, roadmap domain model, BottomMonitor Roadmap tab, readiness snapshot, architecture note |

### Verification

- `npm run typecheck`: pass
- `npm run build`: pass
- `npm run lint`: pass
- Browser QA: app launch pass
- Browser QA: Storage tab and storage health pass
- Browser QA: Connector readiness snapshot pass
- Browser QA: Connector roadmap pass
- Browser QA: Run All pass
- Browser QA: console errors none observed

### PR #20 review fix after PR #21 merge

- PR #21 `docs/source-specs-goal-plan-v2` is already merged into `main`.
- PR #20 branch `feature/storage-adapter-and-real-connector-design` is rebased on latest `main` and remained clean before this fix pass.
- Scope remained inside M17-M20 hardening only. No Tauri, SQLite, Zustand, real API, credential storage, or Source of Truth redesign work was added.

#### Fixed review findings

- `src/domain/importValidation.ts`
  - Removed unsafe shallow `Workflow` casting.
  - Validates `workflow` through `validateWorkflowImport(...)`.
  - Rejects malformed template entries and duplicate template ids.
  - Normalizes and validates optional `settings` safely.
- `src/storage/storageValidation.ts`
  - Distinguishes JSON-backed keys from plain string keys.
  - Treats `agent-workflow-studio:canvas-mode` as valid plain text instead of corrupted JSON.
  - Reports corruption only for actually broken JSON entries.
- `src/components/AppShell.tsx`
  - Replaced direct template save/list/delete calls with `storageAdapter` entry points.
  - Full bundle import now restores `settings` and replaces template storage intentionally.
  - Workflow-only bundle import keeps merge-by-id behavior for templates.
  - BottomMonitor active tab and canvas mode persistence now flow through saved settings.
- `src/components/ImportExportPanel.tsx`
  - Full bundle export now includes `settings`.
  - Import preview now explains merge vs replace behavior explicitly.
  - Full bundle import path passes `settings` through to the app shell.
  - Fixed stale bundle read race: `fileSelectionCountRef` is now incremented before the `if (!file) return` early-exit, so canceling the file picker (no file selected) also advances the counter and invalidates any in-flight read from the previous selection.
- `src/components/BottomMonitor.tsx`
  - Reads persisted active tab from settings and forwards settings into full bundle export.
- `src/domain/connectorReadiness.ts`
  - Mock-only connectors are now reported as `mock` instead of `not-configured`.

#### Validation detail (latest pass — 2026-05-25)

- `npm run typecheck`: pass
- `npm run build`: pass (530.05 kB / gzip 158.67 kB; chunk size warning is pre-existing)
- `npm run lint`: pass
- Module-level validation:
  - valid full bundle import: pass (`settings` restored as `react-flow` / `Roadmap`)
  - malformed workflow import: rejected safely
  - malformed template entry import: rejected safely
  - duplicate template id import: rejected safely
  - storage health with plain string canvas mode: pass
  - storage health with corrupted workflow JSON only: correctly flags only the workflow key
  - connector readiness: `human-review` and `local-mock` now report `mock`

#### Browser QA detail (latest pass — 2026-05-25)

- Dev server: `http://127.0.0.1:5173/`
- Initial workflow visible: pass (`有効な接続 13 件`)
- Storage health panel: pass (`.storage-boundary-panel` visible)
- Export Current Workflow button: visible and reachable
- Export Full Bundle button: visible and reachable
- Active monitor tab persistence: pass (`Roadmap` stayed active after reload)
- Canvas mode persistence: pass (`React Flow` stayed active after reload)
- Connector readiness panel: pass (7 readiness cards shown)
- Connector roadmap panel: pass (8 roadmap rows shown)
- Agent connector panel: pass (6 mock connector cards shown)
- Run All: pass (34 log entries observed after run)
- Console errors: none
- In-app browser limitation:
  - Download events are unsupported, so Browser QA could not directly capture exported files.
  - File picker automation is unsupported, so Browser QA could not drive bundle file selection.
  - Import/export content safety was verified through direct module execution against the same validation code paths.

#### Remaining risks

- `handleImportBundle(...)` replace/merge policy lives inside `AppShell.tsx` rather than a shared import service.
- Full bundle import restores app settings and template storage, but snapshots/run-history remain outside bundle scope.
- Browser QA still depends on supplemental module checks for file-based import/export because the in-app browser cannot automate downloads or file pickers.

#### Next recommended work

1. Extract bundle import policy into a small domain/storage service so merge/replace rules stop living in `AppShell.tsx`.
2. Add a lightweight automated import/export regression script around `validateImportBundle(...)` and storage health checks.
3. Keep Phase 1 domain model hardening separate from this PR unless a new review finding forces that escalation.

### Not Included

- Tauri
- SQLite
- Zustand
- real API calls
- credential input or storage
- `.env` creation
- OS Keychain
- Codex/Hermes/Grok live integration

### Next Candidates

1. Human Review connector adapter wrapper.
2. Manual Connector / Local Mock adapter wrapper.
3. Claude CLI style local adapter or Codex CLI style local adapter after the safe adapter lifecycle is proven.

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

---

## Phase issue31-concept-layer-alignment

- Branch: `docs/issue31-full-concept-alignment`
- Date: 2026-05-26
- Model: Claude Opus 4.7（required は Claude Sonnet 4.6 High。不一致のままユーザー明示指示で続行）
- Source alignment:
  - `docs/project/concept-layer-correction.md`（補助 Source of Truth）
  - GitHub Issue #31 本文（`gh issue view 31` で取得確認済み）

### 目的

Issue #31 の概念修正を、リポジトリ内ドキュメント全体へ反映する。実装変更は行わない（プロダクトコード / 設定ファイルは変更しない）。

### 反映した概念修正

- **認知HUD** は HUDタブではなく、**注意配分編集レイヤー / 状況認識編集レイヤー / 意思決定支援レイヤー**である。Critical 短音通知などの音を含む表現チャネル群を扱う。
- **状況説明生成レイヤー** は、ワークフロー状態を**過去・現在・未来の時間軸**で説明する後段レイヤー。
- **状況補佐官** は、状況説明生成レイヤーを**人間向けの役割として表現したもの**。ブリーフィングタブ / TTS / アバター / 動画生成のいずれか単独ではない。
- **text briefing MVP** は、状況補佐官の全体ではなく、状況説明生成レイヤーの**最小出力チャネルの 1 つ**。
- 単純な「補佐官 ＞ 認知HUD」ではなく、**ワークフロー実行状態 → 観測 → 認知HUD → 状況説明生成 → テキスト/音声/アバター/動画/次アクション** という変換パイプライン。
- 音声・アバター・動画は MVP スコープ外だが、状況補佐官の**当初発想**（自動ニュース動画生成の要領で状況を解説する）として削除・縮小しない。

### 現在の MVP 表示面と本来仕様の分離

| MVP 表示面 | 本来仕様での位置づけ |
|---|---|
| BottomMonitor `認知HUD` タブ / `CognitiveHudPanel` | 認知HUD本体ではなく、HUD サマリ / シグナル一覧（命名上は `HudSummaryPanel` / `HudSignalList` が妥当） |
| BottomMonitor `ブリーフィング` タブ / `BriefingPanel` | 状況説明生成レイヤーの最小出力チャネル（4D テキスト出力） |
| BottomMonitor `実行詳細` タブ / `RunDetailPanel` | Run Trace step evidence の読み取り専用ビューア（補助領域） |

### 更新ファイル

- Updated: `docs/project/SOURCE_OF_TRUTH.md` — `concept-layer-correction.md` を補助 SoT として位置づけ、概念定義サマリと Priority 表更新
- Updated: `docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md` — 注意配分編集レイヤーとしての再定義、5 設計次元、表現チャネル（音含む）、MVP 表示面の補助領域化、状況説明生成レイヤーとの関係を追記
- Updated: `docs/source-specs/situation-assistant/00_ドキュメント体系_README.md` — 概念修正サマリと MVP / 本来仕様の分離を追記
- Updated: `docs/source-specs/situation-assistant/01_要件定義書_状況補佐官_完全版.md` — 解く問題に過去/現在/未来軸、MVP スコープと最終構想の分離、当初発想の保持、役割群、認知HUD との隣接関係
- Updated: `docs/source-specs/situation-assistant/02_機能仕様書_状況説明生成_完全版.md` — 9 サブ機能、10 代表ノード、本来仕様パイプライン、動画化・音声化トリガポリシー
- Updated: `docs/source-specs/situation-assistant/03_UI_UX_状況ブリーフィング設計書_完全版.md` — ブリーフィングタブを「最小出力チャネルの表示先」と位置づけ、将来の音声/アバター/動画チャネルを記述
- Updated: `docs/source-specs/situation-assistant/04_システム設計書_状況説明生成基盤_完全版.md` — マルチチャネル基盤設計、Voice/Avatar/Video/Highlight Adapter を将来拡張として記述、`BriefingScript` 中間体の意図
- Updated: `docs/source-specs/situation-assistant/05_AIエージェント運用設計書_状況補佐官_完全版.md` — 役割境界（計画 AI ではない）、入力材料の参照ポリシー、マルチチャネル安全境界、役割逸脱検出
- Updated: `docs/source-specs/situation-assistant/06_QA_セキュリティ_受け入れ基準_状況説明生成_完全版.md` — 概念整合の受け入れ基準（CC-01〜CC-05）、停止条件に概念縮小禁止を追加
- Updated: `docs/source-specs/situation-assistant/07_実装ロードマップ_状況補佐官_完全版.md` — SA-5〜SA-9 を追加（サブ機能展開 / 音声 / アバター / 動画 / 次アクション）
- Updated: `docs/audit/current-implementation-map.md` — MVP 表示面と本来仕様の分離テーブル、Cognitive HUD / Situation Narration Layer の実装 vs 仕様マトリクス
- Updated: `docs/audit/spec-coverage-matrix.md` — UI-11 / Cognitive HUD / Situation Narration Layer 行を概念修正に整合させ、UI-13 を追加
- Updated: `docs/audit/missing-systems.md` — 「Cognitive HUD — full layer elements」「Situation Narration Layer — full layer elements」を追加
- Updated: `docs/audit/technical-debt.md` — 「Concept Layer Debt」を追加（命名・構造上の概念誤解リスク）
- Updated: `PROJECT_STATE.md` — 本セクション追加

### 変更しなかったもの（意図的）

- TypeScript / React / CSS / `package.json` / 設定ファイル
- `docs/project/concept-layer-correction.md`（既に Source of Truth として保存済み、本タスクでは触らない）
- 本体 source-specs の 01 / 02 / 04 / 05 / 06 / 07（概念修正は SOURCE_OF_TRUTH.md と 03 認知HUD設計書、situation-assistant 配下に集約。本体 source-specs と概念修正文書の整合は SOURCE_OF_TRUTH.md の優先順位ルールでカバー）
- 既存 Phase 履歴（本セクションは末尾 append のみ）

### Validation

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run build`: pass（Vite chunk size warning は既存）

### Git

- Branch: `docs/issue31-full-concept-alignment`
- Commit: `docs: align issue 31 concept layers across specs`
- Push: pushed

### Notes

- 必須モデル `Claude Sonnet 4.6 High` 不一致のまま、ユーザー指示で Opus 4.7 High で続行。
- 本タスクは docs only。プロダクト UI 機能の実装は SA-1 以降で別ブランチが扱う。


