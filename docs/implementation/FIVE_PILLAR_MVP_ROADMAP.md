# Five-Pillar MVP Roadmap

## この変更でユーザーは何ができるようになったか

Agent Workflow Studio の次期実装を、Canvas First / Game HUD / safe runtime audit の既存基盤を壊さずに、5本柱を小さな vertical slice で太くする順序として進められる。

この文書は `docs/project/ACTIVE_PLAN.md` が選択した実装補助文書である。現在の計画選択は `ACTIVE_PLAN.md` が優先し、この文書は phase の境界、完了条件、禁止事項を具体化する。

## Position

- `docs/source-specs/**` は source material として read-only のまま扱う。
- Broad epics #31 / #34 / #37 / #46 は open 前提であり、薄い slice で閉じたと主張しない。
- 実装は multi-PR とする。全Phaseを1つの巨大PRにまとめない。
- 各PRは、Scratch操作、mock connector/runtime、HUD注意配分、safe audit、Situation Assistant、template/history の接続を意識する。
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
| 4 | Scratch Layer | `PartsPalette` and React Flow add/connect/select/delete flows are hardened without replacing reducer architecture or English identifiers. |
| 5 | Mock Connector Layer | Trigger, Action, Adapter, Retry, Error Route, Human Review, and Rate Limit placeholder states expand as fixed mock policies. Write-like actions require Human Review Gate. |
| 6 | Workflow Runtime Layer | Run All, Run Selected, Run From Selected, Dry Run, and Validate remain. Stop, Resume, and Replay are safe mock runtime behaviors only. `node.type === "check"` remains the behavior source. |
| 7 | Cognitive HUD Layer | HUD acts as attention allocation through badges, dimming, central cards, replay cues, bottleneck/flow-pressure projections, and safe short-tone planning notes where allowed. |
| 8 | Situation Narration Layer | Pure mock helpers provide timeline extraction, situation summary, cause analysis, future risk, briefing script, and human decision prompt outputs. |
| 9 | Observation Layer | Safe derived metrics represent flow pressure, latency, cost, retry, queue, success/failure rate, and bottleneck state. No external telemetry. |
| 10 | Edge Replay / Audit Layer | Existing `traceAudit.edgeReplayRecords` and safe runtime events drive visual reconstruction candidates from metadata only. |
| 11 | Templates / Recipes / Failure Patterns | Existing template/history boundaries gain allowlisted summaries for successful paths, failure patterns, and next-action hints. Loading regenerates workflow, node, and connection IDs. |

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

**UI shell replay / flow-pressure attention slice**

Result: safe runtime events now derive one shared flow-pressure projection for Canvas HUD chips, central HUD overlay, HUD Feed history hints, Run Detail, and 4D Text Briefing MVP.

Boundaries:

- No new storage key.
- No raw prompt, raw payload, raw config, artifact body, credential, token, password, or API key display.
- No expression evaluation.
- No real API behavior.
- Flow pressure is a safe derived view model, not durable telemetry.

## Next Slice Candidate

After the flow-pressure slice, the preferred next implementation slice is:

**Scratch connection feedback / mock connector state slice**

Goal: make add/connect/select/delete feedback and fixed mock connector states visibly feed the same safe HUD / Run Detail / 4D briefing path.

Boundaries:

- Reuse current reducer/runtime/audit structures.
- Preserve Japanese labels and English identifiers.
- Keep invalid connection feedback in shared selector/domain logic.
- Keep connector behavior mock-only.
- Write-like mock actions still require Human Review Gate.
