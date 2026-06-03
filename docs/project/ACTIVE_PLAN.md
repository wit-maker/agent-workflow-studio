# Active Plan

Last updated: 2026-06-03

## Purpose

This is the single active planning entrypoint for Agent Workflow Studio.

Use this file to decide the next implementation slice. Other plan-like files are retained as source records, implementation history, or task handoff notes. They should not be treated as competing current plans unless this file links to them as the active detail for a selected slice.

## Current Planning Rule

- Keep GitHub issue state separate from repository planning documents. Updating this file does not open, close, label, or comment on GitHub issues.
- Keep `docs/source-specs/**` read-only as source material.
- Keep `PROJECT_STATE.md` as chronological implementation history, not the primary plan selector.
- Keep old task prompts under `docs/tasks/**` as historical task records unless this file explicitly marks one as the active task.
- Use small, user-visible vertical slices. Do not close broad design epics with a thin slice.

## Active Scope

The project currently has four open product-planning tracks inside the repo docs:

| Track | Current state | Active next direction |
|---|---|---|
| Concept guardrail | The repo now distinguishes Cognitive HUD, Situation Narration Layer, Situation Assistant, and text briefing MVP. `docs/project/CONCEPT_CHECKLIST.md` adds a lightweight classification gate for future UI/domain/QA changes. | Apply the checklist in future slices so MVP surfaces and safe projections are not described as the full layer. |
| Canvas First / Game HUD | Canvas First shell, dark HUD surface, minimal HUD controls, MiniMap, zoom mode, selected node/edge HUD, inline previews, grouping, semantic focus, validation-warning state cue, review-required state cue, and on-demand console/drawers exist. | The active state-based HUD slice is complete. Choose a new state slice only after a new plan is selected. |
| Runtime Audit / Run Detail / Edge HUD | Safe runtime events, durable `traceAudit.runtimeEvents`, Run Detail comparison, focused node/edge scoped diff, focused edge safe route-event metadata diff, selected-edge deep link, replay-ready safe runtime timeline view model, and safe connection policy summaries exist. | The active replay-ready audit view-model slice is complete. Animated replay remains a future epic, not part of this active plan. |
| Five-pillar MVP | A mock-only path connects parts operation, mock connector/runtime, HUD attention, safe audit, Run Detail timeline, Situation Assistant replay cue, and template/history guidance without raw data exposure. | The active vertical thickening slice is complete. Choose the next vertical path explicitly before implementation. |

## Current Recommended Order

The previously selected active implementation plan is complete.

Before starting more implementation, select a new small vertical slice from the broad product tracks. Good next candidates are:

1. **Review decision persistence boundary**
   - Goal: clarify whether human review decisions stay session-only or become durable safe audit metadata.
   - Constraint: do not add a new localStorage key unless the active plan explicitly approves it.

2. **Runtime policy enforcement design spike**
   - Goal: document and prototype only fixed preset enforcement behavior for mock execution.
   - Constraint: no arbitrary expression evaluator and no raw expression execution.

3. **Browser QA direct validation harness**
   - Goal: make file picker/download and run-detail comparison checks reproducible when Browser automation cannot complete them.
   - Constraint: validation helper only; no product runtime behavior change.

## Completed Plan Slices

| Slice | Result |
|---|---|
| Concept checklist | `docs/project/CONCEPT_CHECKLIST.md` now defines the final layer / MVP surface / safe projection / detail-history / out-of-scope classification gate. |
| Edge route metadata diff | `RunDetailPanel` focused edge comparison now includes safe route-event metadata rows and recent safe route-event summaries. |
| Validation-warning HUD behavior | Validation focus now creates a compact state cue in the central HUD and highlights the `Val` command in the always-on HUD. |
| Review-required HUD behavior | Approval semantic focus now creates a compact review-required state cue and highlights Detail / Run Detail entry points from the always-on HUD. |
| Replay-ready audit view model | `RunDetailPanel` now shows a safe runtime metadata timeline derived from `RunTrace.runtimeEvents` or revived audit snapshots. |
| Five-pillar vertical thickening | The safe runtime timeline now feeds Situation Assistant input and mock briefing output through a visible Replay cue. |

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
| `docs/implementation/runtime-audit-next-phase.md` | Runtime Audit detail backlog; subordinate to this file. |
| `docs/implementation/runtime-audit-integration-plan.md` | Historical worktree integration plan for the landed Runtime Audit phase. |
| `docs/tasks/**` | Historical task prompts and completed or partial slice records. |

## Safety Boundary

Do not store, display, summarize, or copy raw config, raw prompt, raw payload, artifact body, credential, token, password, or API key.

Do not add backend/API behavior, real AI calls, credential storage, dependencies, or new localStorage keys unless the user explicitly asks and the plan is updated first.

Do not propose or continue `xhigh` unless the user explicitly writes `ALLOW_XHIGH`.

