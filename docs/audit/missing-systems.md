# Missing Systems

Last updated: 2026-05-26

Priority scale:

- P0: needed before the next implementation phase
- P1: needed soon
- P2: needed for the full product

> **Concept layer note (Issue #31)**: The cognitive HUD and Situation Narration Layer currently only have *summary surfaces* in the MVP. As of Issue #34 UI shell migration, those surfaces are now placed in three locations: `CognitiveHudOverlay` (canvas overlay), right panel `Situation` mode, and the demoted BottomMonitor `認知HUD` tab inside `DetailDrawerDock`. The items listed below for those layers are the elements of the **full layer**, not enhancements to the summary tabs. See `docs/project/concept-layer-correction.md`.

## UI Shell Foundation (Issue #34) — landed, but only as foundation

- `CognitiveWorkspaceShell` + region split landed; `CognitiveHudOverlay`, `CriticalOverlay`, `SituationPanel`, `AssistantPanel`, `WorkspaceRightPanel`, `DetailDrawerDock` exist as receivers.
- Still missing (foundation only, not full implementation):
  - Node/edge-level HUD overlay logic (dimming, highlighting, focus path, edge flow health / delay / retry / error route badges)
  - Situation Assistant real channels beyond 4D text (voice, avatar, video, news-style video, dynamic next-action banners)
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
| Durable run history | Logs, metrics, execution graph, connector queue, and review states need a run record model that survives reload. |
| Trace and audit log | Safety, replay, QA, and external adapter work require durable trace/audit records. |
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
| Multi-run comparison and replay | Needed for inspection, regression analysis, and reproducible workflows. |
| Publish and external write workflow | Real write-capable adapters require approval, audit, rollback, and human confirmation. |
| Full HUD UI settings | Users need control over danger visibility, focus, notifications, and collapse rules. |
| Desktop QA matrix | Tauri, file persistence, and secure storage need OS-specific verification. |

## Cognitive HUD — full layer elements

The MVP has `HudSignal` / `HudSnapshot` / `CognitiveHudPanel`. The cognitive HUD as an **attention-allocation layer** still needs the following.

| Element | Why it is needed |
|---|---|
| HUD badges on `NodeCard` / `ConnectionLine` | Attention has to surface where the work is (Canvas), not only in a sidebar tab. |
| Central HUD card | Decisive states (failure, approval needed, danger) need a center-of-screen surface, not a list row. |
| Approval Pending HUD | Approvals must never be hidden in a tab; they need a dedicated, dismissable surface. |
| Failure Cause Card | Failures need a "follow the cause" surface, not a single log line. |
| Focus Overlay / Path Dim | Attention is set by raising the relevant path and dimming the rest, not by adding more rows. |
| Notification Bundle | Bursts of low-priority signals should fold into one summary instead of competing for attention. |
| Critical short audio cue | A short audio cue moves attention without forcing eye contact; it is part of the HUD's expression channels. |
| HUD history | Past HUD states must be reviewable so users can reconstruct "when did this go bad." |
| 5 design dimensions: what / when / where / how / how-much to show | These are the inputs the HUD layer must let designers tune; currently the panel just lists derived signals. |
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
