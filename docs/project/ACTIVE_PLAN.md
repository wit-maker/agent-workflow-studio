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
| Canvas First / Game HUD | Canvas First shell, dark HUD surface, minimal HUD controls, MiniMap, zoom mode, selected node/edge HUD, inline previews, grouping, semantic focus, validation-warning state cue, and on-demand console/drawers exist. | Continue state-based HUD behavior one state at a time: review required, high cost, delay, bottleneck, failure, or approval. |
| Runtime Audit / Run Detail / Edge HUD | Safe runtime events, durable `traceAudit.runtimeEvents`, Run Detail comparison, focused node/edge scoped diff, focused edge safe route-event metadata diff, selected-edge deep link, and safe connection policy summaries exist. | Keep the route metadata diff as a safe projection; future work is replay-ready ordering, not full animated replay yet. |
| Five-pillar MVP | A thin mock-only path connects parts operation, mock connector/runtime, HUD attention, safe audit, Situation Assistant output, and template reuse. | Thicken one vertical path at a time without adding real APIs, credential storage, new localStorage keys, or raw data exposure. |

## Current Recommended Order

1. **Five-pillar vertical thickening**
   - File area: choose a minimal path before implementation.
   - Goal: strengthen one connected user flow across parts, mock runtime, HUD attention, safe audit, assistant explanation, and template/history.
   - Constraints: mock-only; no backend/API/credential storage/dependency/new localStorage key.
   - Model guidance: `GPT-5.5 high`.

2. **Next state-based Game HUD slice**
   - File area: `src/domain/cognitiveHud.ts`, workspace HUD components, CSS only as needed.
   - Goal: one runtime state changes the canvas/HUD behavior clearly without adding a permanent panel.
   - Candidate next state: review required, because it already exists in safe runtime state and Human Review UI.
   - Model guidance: `GPT-5.5 high`.

3. **Replay-ready audit view model**
   - File area: `src/domain/runDetail.ts`, `src/domain/runtimeEventSummary.ts`, and tests or direct validation only if needed.
   - Goal: order safe runtime route events into a replay-friendly timeline without adding animation UI yet.
   - Constraints: safe metadata only, no raw config/prompt/payload/credential, no new localStorage key.
   - Model guidance: `GPT-5.5 high`.

## Completed Plan Slices

| Slice | Result |
|---|---|
| Concept checklist | `docs/project/CONCEPT_CHECKLIST.md` now defines the final layer / MVP surface / safe projection / detail-history / out-of-scope classification gate. |
| Edge route metadata diff | `RunDetailPanel` focused edge comparison now includes safe route-event metadata rows and recent safe route-event summaries. |
| Validation-warning HUD behavior | Validation focus now creates a compact state cue in the central HUD and highlights the `Val` command in the always-on HUD. |

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

