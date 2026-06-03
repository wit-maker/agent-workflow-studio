# Active Plan

Last updated: 2026-06-03

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

The previously selected issue-roadmap slices are complete. The next implementation should be chosen as a new small vertical slice against #31 / #34 / #37 / #46, with the concept checklist applied before coding.

Suggested next candidates:

1. **Revived audit snapshot runtimeEvents tightening**
   - Issue alignment: #37, #46.
   - Goal: ensure revived `traceAudit` snapshots consistently expose normalized safe `runtimeEvents` to every Run Detail timeline/replay path.
   - Constraint: no new localStorage key; continue using existing run history records only.
2. **HUD notification read/ack/pin session behavior**
   - Issue alignment: #34, #37.
   - Goal: harden on-demand HUD notification behavior without making it a permanent panel.
   - Constraint: session state first; persisted settings require a separate plan.
3. **Concept naming cleanup plan**
   - Issue alignment: #31.
   - Goal: reduce naming that makes MVP panels look like full concept layers.
   - Constraint: docs/UI label slice first; component renames only when low-risk.

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
| `docs/tasks/**` | Historical task prompts and completed or partial slice records. |

## Safety Boundary

Do not store, display, summarize, or copy raw config, raw prompt, raw payload, artifact body, credential, token, password, or API key.

Do not add backend/API behavior, real AI calls, credential storage, dependencies, or new localStorage keys unless the user explicitly asks and the plan is updated first.

Do not propose or continue `xhigh` unless the user explicitly writes `ALLOW_XHIGH`.

