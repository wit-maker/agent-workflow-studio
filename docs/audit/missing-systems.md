# Missing Systems

Last updated: 2026-06-02

Priority scale:

- P0: needed before the next implementation phase
- P1: needed soon
- P2: needed for the full product

> **Concept layer note (Issue #31)**: The cognitive HUD and Situation Narration Layer currently only have *summary surfaces* in the MVP. As of Issue #34 UI shell migration, those surfaces are now placed in three locations: `CognitiveHudOverlay` (canvas overlay), right panel `Situation` mode, and the demoted BottomMonitor `認知HUD` tab inside `DetailDrawerDock`. The items listed below for those layers are the elements of the **full layer**, not enhancements to the summary tabs. See `docs/project/concept-layer-correction.md`.

## UI Shell Foundation (Issue #34) — landed, now Canvas First foundation

- `GameHudShell` now makes React Flow canvas the primary surface and turns palette/detail/BottomMonitor into on-demand HUD drawer/console surfaces.
- `CanvasCommandHud`, `HudNotificationBundle`, `CanvasMiniMapHud`, `WorkflowGroupLayer`, `SelectedObjectHud`, and `SelectedEdgeHud` exist as receivers.
- Zoom mode (`overview / map / normal / detail / deep`) and inline preview are implemented as class/data projections.
- Selected node/edge HUDs now use measured HUD size plus DOM collision rects for command HUD, drawers, MiniMap, Console, and React Flow controls; Game HUD mode also disables the legacy 1024px horizontal body scroll.
- Selected edge HUD and React Flow edges now derive runtime state / health / observed route / evidence count from `WorkflowConnection`, `ExecutionGraph`, `RunTrace`, connection validation, and optional safe connection `runtimePolicy` metadata.
- HUD notification bundle, run-history summary, and session-only `quiet / balanced / deep` density policy now exist as read-only HUD projections.
- Run Detail can now select current trace or durable safe `traceAudit` snapshots, and can deep-link node/edge focus back to the canvas.
- Run Detail has a two-run comparison view for safe audit metadata, step-level safe evidence grouping, and focused node/edge scoped diff.
- Still missing (foundation only, not full implementation):
  - Advanced HUD placement policy with priority-weighted escape zones, viewport-specific density reduction, and animated reflow
  - Animated replayable trace/audit-backed semantic focus. Current semantic focus is a current-state read-only projection from failure / approval / validation / retry / running / bottleneck signals, while completed runs now keep safe trace/audit snapshots for evidence recall and Run Detail selection.
  - Richer visual emphasis rules beyond the current central HUD variants and semantic edge/node focus
  - Enforced edge runtime contract, expression evaluation, edge-level audit events, and durable route replay beyond the current optional `runtimePolicy` metadata, read-only projection, and selection deep link
  - Situation Assistant real channels beyond 4D text (voice, avatar, video, news-style video, dynamic next-action banners)
  - Durable notification read / ack / pin state and persisted HUD preferences beyond the current session-only density projection
  - Critical short-tone audio channel
  - Workflow Library / Templates promotion from Detail Drawer to Left Rail
  - Removal of duplicate BottomMonitor tabs once their right-panel / overlay counterparts are complete

## P0

| System | Why it is needed |
|---|---|
| Source of Truth references in agent rules | Future agents need one clear priority order before changing domain model, storage, or safety behavior. |
| Coverage audit baseline | The team needs a stable Done/Partial/Missing/Risk map before selecting the next implementation phase. |
| Model-gate recording discipline | Goal/Plan/Source of Truth work must not silently claim a different model than the one used. |
| Next-phase selection criteria | The repo should choose whether to harden domain model, run history, HUD, safety gates, or storage next based on the audit, not on convenience. |
| Explicit non-goals for this audit phase | No real API, Tauri, SQLite, credential value storage, or large UI implementation should enter this branch. |

## P1

| System | Why it is needed |
|---|---|
| WorkflowDocument model | The current `Workflow` is useful but not yet the full saved/executed/audited document described by source specs. |
| Category normalization | MVP categories need mapping to complete source-spec categories before the parts library grows. |
| Durable run history | Safe trace/audit summaries now survive in run history records, but logs, metrics timeline, connector queue, and review states still need a richer run record model. |
| Trace and audit log | Safe `traceAudit` snapshot recall and Run Detail run selection exist. Connection `runtimePolicy` summaries can be shown safely, but safety, animated replay, QA, and external adapter work still require replayable audit records and policy-backed events. |
| Validate / Stop / Resume / Replay run modes | The run model must expand before full execution/runtime work. |
| Cognitive HUD state model | HUD cannot be added as decoration; L0-L5 priority, alert, focus, and depth concepts need data support. |
| Safety gate model | Spec check, secret scan placeholder, git guard, publish gate, command risk check, cost/loop limits, and approval records need a shared shape. |
| Adapter interface for external services | Real connectors need explicit mock/real boundaries, connection tests, read/write modes, and log contracts. |
| Storage adapter adoption plan | Direct localStorage call sites need a migration path through the adapter before Tauri/file persistence. |

## P2

| System | Why it is needed |
|---|---|
| Tauri filesystem persistence | Required for local desktop behavior beyond browser localStorage. |
| SQLite / local database | Needed for durable run history, audit logs, templates, and search at product scale. |
| Secure credential store | Required before real credential-bearing integrations. |
| Recipes and knowledge assets | Templates need to evolve into reusable success patterns, failure patterns, and knowledge cards. |
| Multi-run comparison and replay | Run Detail now has two-run safe audit metadata comparison plus step-level safe evidence grouping, focused node/edge scoped diff, and safe connection policy summaries, but visual replay animation, edge-level durable route diff, and reproducible route replay are still needed for inspection, regression analysis, and reproducible workflows. |
| Publish and external write workflow | Real write-capable adapters require approval, audit, rollback, and human confirmation. |
| Full HUD UI settings | Session-only density/danger/collapse projection exists, but users still need persisted control over danger visibility, focus, notifications, and collapse rules. |
| Desktop QA matrix | Tauri, file persistence, and secure storage need OS-specific verification. |

## Cognitive HUD — full layer elements

The MVP has `HudSignal` / `HudSnapshot` / `CognitiveHudPanel`. The cognitive HUD as an **attention-allocation layer** still needs the following.

| Element | Why it is needed |
|---|---|
| HUD badges on `ConnectionLine` / React Flow edges | `SelectedEdgeHud` exists for selected edges, but always-on edge badges / path attention still need to surface on the flow path itself. |
| Collision-aware selected object HUD | Selected-node and selected-edge HUDs now use measured card size and DOM collision rects, but advanced priority rules, density reduction, and animated reflow are still missing. |
| Rich central HUD card | Current-state variants exist for failure / approval / validation / running / bottleneck, but they are not yet user-tunable or backed by durable HUD history. |
| Approval Pending HUD | Approval state can drive semantic focus and central HUD content, but approvals still need a dedicated, dismissable surface and durable decision record. |
| Failure Cause Card | Failure cause focus exists as a central HUD variant and semantic path, and selected HUD / Run Detail can read/select durable safe evidence summaries. Animated replay and richer cause analysis are still missing. |
| Semantic Focus Overlay / Path Dim | Current-state semantic focus now highlights failure / approval / validation / retry / running / bottleneck paths. It can share step evidence through `traceAudit`, but replayable attention history and richer policy controls are still missing. |
| Notification Bundle | On-demand notification bundling now exists as a read-only projection; durable read/ack/pin and notification routing policies are still missing. |
| Critical short audio cue | A short audio cue moves attention without forcing eye contact; it is part of the HUD's expression channels. |
| HUD history | Run-history summaries now appear in the HUD feed and can open Run Detail replay; a durable HUD-state timeline that reconstructs "when did this go bad" is still missing. |
| 5 design dimensions: what / when / where / how / how-much to show | Session-only density/danger/collapse labels exist, but these controls are not yet persisted, per-user, or policy-backed. |
| Cross-surface HUD orchestration | The HUD must coordinate Canvas, Inspector, BottomMonitor, modals, and notifications, not live in one panel. |

## Situation Narration Layer — full layer elements

The MVP has the 4D mock text briefing as the **minimum output channel**. The full layer needs the following sub-functions and output channels.

### Sub-functions (engines)

| Element | Why it is needed |
|---|---|
| Timeline Extractor | Selects the important event sequence from logs / trace so downstream sub-functions reason about meaningful events, not all log lines. |
| Situation Summarizer | Short-form summary of "what is happening now" separated from the longer detail. |
| Cause Analyzer | Maps error / trace / diff into candidate causes, so explanations include *why*, not just *what*. |
| Future Risk Predictor | Uses current state + past failures to say what could happen next. Required for the past→present→future axis. |
| Briefing Script Writer | Builds a single explanation script shared by text / voice / avatar / video channels so they stay coherent. |
| Human Decision Prompt | Turns the explanation into concrete approve / reject / retry options. |

### Output channels (chosen per situation, not always all on)

| Element | Why it is needed |
|---|---|
| Timeline Narration | Past → present → future story, not a one-shot snapshot. |
| Incident Replay | Step-by-step replay of failure / stall / pending approval, so users can rewatch how the state arrived. |
| Avatar Briefing (Avatar Narrator) | Honors the original concept — narrator / presenter / sim-game commentator role. |
| Audio Alert Briefing (Voice Generator) | Spoken explanation for important state changes, distinct from the HUD's critical short cue. |
| Visual Explanation Render (Highlight Renderer) | Dynamic highlight on the workflow graph itself while explaining. |
| Workflow News Video (Briefing Video Composer) | News-style automatic video for failure / approval / cost spike / stall / multi-AI disagreement / important success / long idle resume. The founding analogy of the Situation Assistant. |
| Next Action Briefing (standalone) | A surface that shows only "what to do next" when that is the user's question. |

### Role group (one assistant, many roles)

| Element | Why it is needed |
|---|---|
| Concierge | Guide users to the next place to look. |
| Secretary | Organize records / summaries / diffs / history. |
| Narrator | Explain via text / voice / avatar / video. |
| Report-relay agent (報連相) | Push state changes as reports / contacts / consultations. |
| Situation strategist (状況参謀) | Combine past / present / future and surface risk + next action. |

Removing any of these because the text-only MVP looks complete would shrink the final design. The MVP is one channel; this list is the layer.
