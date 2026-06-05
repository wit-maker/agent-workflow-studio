# Active Plan

Last updated: 2026-06-05

## Purpose

This is the single active planning entrypoint for Agent Workflow Studio.

Use this file to decide the next implementation slice. Other plan-like files are retained as source records, implementation history, or task handoff notes. They should not be treated as competing current plans unless this file links to them as the active detail for a selected slice.

## Current Planning Rule

- Keep GitHub issue state separate from repository planning documents. Updating this file does not open, close, or label GitHub issues.
- GitHub issue comments may be used only when the user explicitly allows them; comments should point back to this repo plan and must not claim broad epics are closed by thin slices.
- Keep `docs/source-specs/**` read-only as source material.
- Keep `PROJECT_STATE.md` as chronological implementation history, not the primary plan selector.
- Keep old task prompts under `docs/tasks/**` as historical task records unless this file explicitly marks one as the active task.
- Use small, user-visible vertical slices. Do not close broad design epics with a thin slice.

## Open Issue Priority Roadmap

GitHub currently has four open broad product epics. They are source inputs for planning, not branch-sized tasks.

| Priority | Issue | Role in planning | Current state | Active next direction |
|---|---|---|---|---|
| P0 | #31 Concept Guardrail | Always-on guardrail for every plan, implementation, and QA pass. | The repo distinguishes Cognitive HUD, Situation Narration Layer, Situation Assistant, and text briefing MVP. `CONCEPT_CHECKLIST.md` adds a lightweight classification gate. | Apply the checklist to every UI/domain/QA slice so MVP surfaces and safe projections are not described as the full layer. |
| P1 | #34 UI System Redesign | Parent product surface direction. | Canvas First shell, dark HUD surface, minimal HUD controls, on-demand drawers, semantic focus, notification/density overlay, and central HUD state cues exist. | Continue state-based Canvas First / Game HUD behavior, interaction hardening, and visual attention work without returning to panel-first growth. |
| P1-child | #37 Game HUD Canvas First Completion | Implementation track under #34. | Major foundation is landed: selected node/edge HUD, MiniMap, zoom mode, workflow grouping, inline preview, dark HUD theme, safe Run Detail / Edge HUD links. | Treat remaining work as state-based HUD QA, visual attention behavior, and interaction hardening slices, not as a second competing plan. |
| P1 delivery spine | #46 Five-pillar MVP | Vertical delivery strategy. | A mock-only path connects parts operation, mock connector/runtime, HUD attention, safe audit, Run Detail timeline, Situation Assistant replay cue, and template/history guidance. | Choose slices that thicken the connected path across Scratch-like operation, mock connector/runtime, HUD attention, safe audit, Situation Assistant, and template/history. |

Runtime Audit remains a detail backlog in `docs/implementation/runtime-audit-next-phase.md`. It becomes active only when this file selects a slice that advances #37 or #46 through Runtime Audit work.

## Current Recommended Order

The selected active roadmap is **Five-Pillar MVP Roadmap**. The detail document is `docs/implementation/FIVE_PILLAR_MVP_ROADMAP.md`.

Current slice:

2. **UI shell replay / flow-pressure attention slice**
   - Issue alignment: #34, #37, #46.
   - Goal: strengthen Canvas First route evidence with replay-ready and flow-pressure cues using safe audit-derived metadata.
   - Expected path: Scratch operation -> mock connector/runtime -> safe runtime trace -> HUD focus -> Run Detail replay -> 4D briefing -> template/history hint.
   - Constraint: metadata/view-model helpers first; no new persistence boundary, no raw payloads, no expression evaluation, no real API behavior.

Next implementation slice after this PR:

3. **Scratch connection feedback / mock connector state slice**
   - Issue alignment: #34, #37, #46.
   - Goal: make add/connect/select/delete feedback and fixed mock connector states visibly feed the same safe HUD / Run Detail / 4D briefing path.
   - Expected path: PartsPalette operation -> valid/invalid React Flow connection -> mock connector state -> safe runtime event -> HUD pressure cue -> Run Detail / 4D explanation.
   - Constraint: keep reducer architecture, Japanese labels, English identifiers, shared selector/domain validation, and mock-only connector behavior.

Phase roadmap order:

| Phase | Focus | Implementation boundary |
|---|---|---|
| 1 | Plan Selection / Guardrail | Select this roadmap, update implementation docs, apply `CONCEPT_CHECKLIST.md`, no product code required. |
| 2 | UI Shell Recomposition | Keep Canvas First primary; demote monitor-style surfaces to detail drawers; add failure/review/validation/replay/bottleneck attention states. |
| 3 | Five-Pillar Vertical Slice Thickening | Keep one connected mock path across parts, connector/runtime, safe audit, HUD focus, Run Detail, 4D briefing, template/history. |
| 4 | Scratch Layer | Harden `PartsPalette` and React Flow add/connect/select/delete flows while preserving Japanese labels and English identifiers. |
| 5 | n8n-like Mock Connector Layer | Expand fixed mock Trigger/Action/Adapter/Retry/Error Route/Human Review/Rate Limit states; write-like mock actions require Human Review Gate. |
| 6 | Workflow Runtime Layer | Preserve Run All / Run Selected / Run From Selected / Dry Run / Validate; add Stop/Resume/Replay only as safe mock runtime events. |
| 7 | Cognitive HUD Layer | Treat HUD as attention allocation: node/edge badges, path dimming, central cards, replay cues, bottleneck/flow pressure, session-only preferences unless planned. |
| 8 | Situation Narration Layer | Add pure mock timeline, summary, cause, future-risk, script, and decision-prompt helpers; no audio/avatar/video generation. |
| 9 | Observation Layer | Represent latency, cost, retry, queue, success/failure rate, and bottleneck state through safe derived metrics only. |
| 10 | Edge Replay / Audit Layer | Continue using `traceAudit.edgeReplayRecords` and safe runtime events; add visual reconstruction candidates from safe metadata only. |
| 11 | Templates / Recipes / Failure Patterns | Extend template/history surfaces with allowlisted success path, failure pattern, and next-action summaries through existing boundaries. |

## Completed Plan Slices

| Slice | Result |
|---|---|
| Concept checklist | `docs/project/CONCEPT_CHECKLIST.md` now defines the final layer / MVP surface / safe projection / detail-history / out-of-scope classification gate. |
| Edge route metadata diff | `RunDetailPanel` focused edge comparison now includes safe route-event metadata rows and recent safe route-event summaries. |
| Validation-warning HUD behavior | Validation focus now creates a compact state cue in the central HUD and highlights the `Val` command in the always-on HUD. |
| Review-required HUD behavior | Approval semantic focus now creates a compact review-required state cue and highlights Detail / Run Detail entry points from the always-on HUD. |
| Replay-ready audit view model | `RunDetailPanel` now shows a safe runtime metadata timeline derived from `RunTrace.runtimeEvents` or revived audit snapshots. |
| Five-pillar vertical thickening | The safe runtime timeline now feeds Situation Assistant input and mock briefing output through a visible Replay cue. |
| Browser QA direct validation harness | `npm.cmd run qa:direct` now reproduces import/export validation, two-run safe audit comparison, selected edge focus, Edge HUD safe copy, legacy audit normalization, and storage-key checks without Browser file picker/download support. |
| Review decision persistence boundary | Human Review now shows the persistence boundary: current decisions are session-only; any future durable form must be safe metadata inside an existing run history record, with sensitive notes excluded from safe summaries. |
| Runtime policy route enforcement design spike | Mock run now applies fixed preset connection policy pass/non-pass to route gating: passing presets continue on `main`, failing presets create `skip`, and `expression` remains metadata-only without evaluation. |
| Animated replay UI candidate | `RunDetailPanel` now exposes a metadata-only replay candidate with Play/Pause, frame navigation, progress, and frame markers derived only from safe runtime timeline items. |
| Revived audit snapshot runtimeEvents tightening | Revived `traceAudit` snapshots now copy normalized safe `runtimeEvents` back into `RunTrace`, so Run Detail timeline/replay paths use the same safe events for current traces and selected audit snapshots. |
| HUD notification read/ack/pin session behavior | `HudNotificationBundle` now supports session-only read, acknowledge, and pin state. Acknowledged unpinned notifications leave the active list; pinned notifications stay visible without creating storage. |
| Concept naming cleanup | User-facing labels now describe the current text explanation surface as `4D Text Briefing MVP` / `4D説明`, reducing the chance that the MVP panel is mistaken for the full Situation Assistant. |
| Edge-level durable replay record | `traceAudit.edgeReplayRecords` now stores safe edge-level replay summaries derived from safe runtime events inside existing run history records. `RunDetailPanel`, `SelectedEdgeHud`, and React Flow edge runtime classes can surface selected-edge replay evidence without raw payloads or new storage keys. |
| Five-pillar roadmap selection | `docs/implementation/FIVE_PILLAR_MVP_ROADMAP.md` now makes the all-phase roadmap the selected planning spine while preserving small vertical-slice delivery and the existing safety boundaries. |
| UI shell replay / flow-pressure attention | `RunTrace.runtimeEvents` now drives a safe flow-pressure projection shared by Canvas HUD chips, central HUD overlay, HUD Feed history hints, Run Detail, and 4D Text Briefing MVP without new storage or raw payload display. |

## Plan Document Roles

| File | Role |
|---|---|
| `docs/project/ACTIVE_PLAN.md` | Single current planning entrypoint. |
| `PROJECT_STATE.md` | Chronological implementation record, validation record, and recent gap notes. |
| `docs/project/PROJECT_GOAL.md` | Long-term product identity and judgment criteria. |
| `docs/project/SOURCE_OF_TRUTH.md` | Source priority and conflict resolution. |
| `docs/project/PLAN_PROTOCOL.md` | How future plans should be written and completed. |
| `docs/project/CONCEPT_CHECKLIST.md` | Lightweight guardrail for classifying MVP surfaces, final layers, safe projections, and out-of-scope claims. |
| `docs/audit/current-implementation-map.md` | What exists now. |
| `docs/audit/spec-coverage-matrix.md` | Done/Partial/Missing coverage against the specs. |
| `docs/audit/missing-systems.md` | Missing full-product systems and why they matter. |
| `docs/audit/technical-debt.md` | Known implementation and naming debt. |
| `docs/implementation/runtime-audit-next-phase.md` | Runtime Audit detail backlog; subordinate to this file and only active when #37 or #46 selects a runtime-audit slice. |
| `docs/implementation/runtime-audit-integration-plan.md` | Historical worktree integration plan for the landed Runtime Audit phase. |
| `docs/implementation/FIVE_PILLAR_MVP_ROADMAP.md` | Selected five-pillar delivery roadmap; subordinate to this file for current slice order and guardrails. |
| `docs/tasks/**` | Historical task prompts and completed or partial slice records. |

## Safety Boundary

Do not store, display, summarize, or copy raw config, raw prompt, raw payload, artifact body, credential, token, password, or API key.

Do not add backend/API behavior, real AI calls, credential storage, dependencies, or new localStorage keys unless the user explicitly asks and the plan is updated first.

Do not propose or continue `xhigh` unless the user explicitly writes `ALLOW_XHIGH`.

