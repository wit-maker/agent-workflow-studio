# Current Implementation Map

Last updated: 2026-05-30

This map records what the current MVP actually contains. It does not redefine the full product goal.

## UI Shell Migration (Issue #34)

The UI shell migrated from **panel-first** (TopBar + .workspace-grid: Palette / Canvas+StagePreview / Inspector + BottomMonitor) to **cognitive workspace shell**, then to a Canvas First Game HUD shell:

```
Always-on : CanvasCommandHud (status / run / canvas controls / drawer toggles)
Canvas    : CognitiveWorkflowCanvas (= ReactFlowCanvas primary + HUD overlays)
Left      : WorkspaceLeftRail as Palette HUD drawer
Right     : WorkspaceRightPanel as Detail HUD drawer
Bottom    : DetailDrawerDock as collapsible Console HUD
Overlay   : CognitiveHudOverlay + SelectedObjectHud + SelectedEdgeHud + CriticalOverlay
```

`BottomMonitor` is no longer the primary authoring surface. Its tabs (認知HUD / ブリーフィング / 実行詳細 / etc.) remain available but are **Detail Surfaces**, not the cognitive HUD or situation assistant proper.

## Concept Layer Note (Issue #31)

> See `docs/project/concept-layer-correction.md` for the authoritative concept definitions.

Several MVP surfaces look like they implement the full cognitive HUD or full Situation Assistant, but they do not. They are **provisional MVP display surfaces** for those concept layers. The table below lists every such surface explicitly so the gap is not lost.

| MVP display surface | What it actually is | What it is NOT |
|---|---|---|
| BottomMonitor `認知HUD` tab | A summary view of HUD signals derived from current runtime state. | Not the cognitive HUD itself. The cognitive HUD is an attention-allocation layer that spans Canvas / Inspector / notifications / modals. |
| `CognitiveHudPanel` component | Read-only HUD summary list. Better named `HudSummaryPanel` / `HudSignalList`. | Not a full HUD with badges on nodes/edges, focus overlays, dimming, intervention cards, or critical audio cues. |
| BottomMonitor `ブリーフィング` tab + `BriefingPanel` | Minimum output channel of the Situation Narration Layer (4D text only, mock-only). | Not the Situation Assistant as a whole. Voice, avatar, video, dynamic highlight, timeline narration, incident replay are out of scope but not removed from spec. |
| BottomMonitor `実行詳細` tab + `RunDetailPanel` | Read-only Run Trace step evidence viewer. | Not durable trace store, not replay engine, not deep linking. |
| BottomMonitor `Roadmap` tab | Connector readiness snapshot. | Not real connector implementation. |

These MVP surfaces are useful and intentional. They are listed here so that "implemented" is never confused with "the full layer is done."

## Screens

| Area | Current implementation | Notes |
|---|---|---|
| Always-on HUD | `CanvasCommandHud` shows compact run state, alert level, zoom mode, model, safety state, Run/Selected/FromSelected/Dry/Stop/Reset/Undo/Redo/Export/Import/Canvas mode, and Palette/Detail/MiniMap/Console toggles. | Model is still static text; richer iconography can improve later. |
| Left | `WorkspaceLeftRail` exposes Components (`PartsPalette`) plus WIP scaffold tabs as a collapsible Palette HUD drawer. | Library/Templates tabs are scaffold; existing data still reachable via Console HUD. |
| Center | `CognitiveWorkflowCanvas` primarily uses `ReactFlowCanvas`, overlays `CognitiveHudOverlay`, `SelectedObjectHud`, `SelectedEdgeHud`, `WorkflowGroupLayer`, and right-bottom `CanvasMiniMapHud`. StagePreview is no longer a constant canvas footer. | True coordinate-following HUD, path dimming, and focus highlighting are not implemented. |
| Right | `WorkspaceRightPanel` switches between Situation / Inspector / Assistant / Human Review inside an on-demand Detail HUD drawer. | Inspector is the existing component reused as one mode. |
| Bottom | `DetailDrawerDock` wraps `BottomMonitor` as collapsible Console HUD. All existing tabs preserved for compatibility. | Tabs are no longer the primary surface for HUD / Briefing / Run Detail. |
| Overlay | `CognitiveHudOverlay` shows central HUD card + focus when HUD priority ≠ normal. `SelectedObjectHud` shows selected-node local HUD context. `SelectedEdgeHud` shows selected-edge flow context. `CriticalOverlay` foregrounds a banner only at priority=critical. | Path dimming, coordinate-following HUD placement, rich central HUD variants, and critical short-tone audio are not implemented. |
| Stage/output | Output review remains available through Console HUD / existing BottomMonitor tabs and right detail surfaces. | Diff and publish preparation remain partial or missing. |

## Components

| Component group | Files / modules | Current role |
|---|---|---|
| App shell and layout | `src/components/AppShell.tsx` (state owner), `src/components/workspace/CognitiveWorkspaceShell.tsx` (compat wrapper), `src/components/workspace/GameHudShell.tsx`, `src/components/workspace/CanvasCommandHud.tsx`, `src/components/workspace/WorkspaceLeftRail.tsx`, `src/components/workspace/WorkspaceRightPanel.tsx`, `src/components/workspace/DetailDrawerDock.tsx`, `src/components/workspace/CognitiveWorkflowCanvas.tsx`, `src/components/workspace/CognitiveHudOverlay.tsx`, `src/components/workspace/SelectedObjectHud.tsx`, `src/components/workspace/SelectedEdgeHud.tsx`, `src/components/workspace/CanvasMiniMapHud.tsx`, `src/components/workspace/WorkflowGroupLayer.tsx`, `src/components/workspace/CriticalOverlay.tsx`, `src/components/workspace/SituationPanel.tsx`, `src/components/workspace/AssistantPanel.tsx`, legacy `src/components/TopBar.tsx` / `GlobalRunControl.tsx` / `CurrentStateStrip.tsx` (kept for compatibility/history) | AppShell owns reducer state, run actions, connector queue state, persistence hooks, and renders the Game HUD shell through the compatibility wrapper. |
| Canvas | `WorkflowCanvas.tsx`, `ReactFlowCanvas.tsx`, `ReactFlowNode.tsx`, `NodeCard.tsx`, `ConnectionLine.tsx` | Displays nodes, edges, statuses, port handles, validation feedback, inline previews, zoom-mode classes, minimap HUD, and group layer. |
| Editing | `Inspector.tsx`, `ConnectionEditor.tsx`, `workflowActions.ts`, `workflowReducer.ts` | Handles node field edits, JSON validation, connection create/delete, undo/redo state, import/reset paths. |
| Execution and recovery | `runPlanner.ts`, `runEngine.ts`, `nodeExecutors.ts`, `executionGraph.ts`, `connectorQueue.ts`, `recoveryActions.ts` | Provides local mock run planning, execution summaries, graph state, connector jobs, retry/review/skip/cancel actions. |
| Templates | `TemplateLibrary.tsx`, `TemplatePreview.tsx`, `templateMetadata.ts`, `localTemplates.ts` | Saves, loads, duplicates, searches, previews, and annotates local templates. |
| Safety and connectors | `AgentConnectorPanel.tsx`, `CredentialBoundaryPanel.tsx`, `agentConnectorRegistry.ts`, `credentialPolicy.ts` | Shows mock connector boundaries and credential non-storage policy. |
| Storage | `localWorkflowState.ts`, `localWorkflowHistory.ts`, `localCanvasState.ts`, `localAppSettings.ts`, `storageAdapter.ts`, `storageKeys.ts` | Uses localStorage plus an `IStorageAdapter` boundary prepared for later Tauri/file storage. |

## Data Model

| Model | Current state | Gap |
|---|---|---|
| `Workflow` | Has id, optional schemaVersion, name, status, nodes, connections, metrics, logs, artifact, timestamps. | Not yet a full `WorkflowDocument` with viewport, runConfig, templates, metadata, migrations, and audit identity. |
| `WorkflowNode` | Has type, title, category, status, agentRole, typed inputs/outputs, optional ports, config, position, metrics, lastRun. | Missing explicit owner, risk state, HUD state, node logs, and normalized connector bindings. |
| `WorkflowConnection` | Has source/target node and port ids, `ConnectionKind`, carried data types, status, and metrics. | Does not yet model all runtime trace, approval, resource, or audit semantics. |
| Data types | `WorkflowDataType` covers text, files, prompts, context, result, evidence, decision, artifact, logs, metrics, errors, JSON, command, review, and related types. | CredentialRef is intentionally absent from normal data flow. Some source-spec data classes are not yet modeled separately. |
| Run state | Node and workflow statuses include idle, queued, running, success, failed, skipped, review_required, blocked, paused, archived, and retry_ready. | Cancelled/paused/replay state is incomplete in runtime behavior. |

## Save / Load

| Capability | Current state |
|---|---|
| Workflow autosave | Current workflow is saved to localStorage and restored at startup. |
| Import/export | Workflow JSON import/export exists with validation and normalization paths. |
| Templates | Templates are persisted to localStorage with metadata and backward-compatible normalization. |
| History snapshots | Workflow history exists in localStorage. |
| Adapter boundary | `IStorageAdapter` exists, but many call sites still use direct local storage helpers. |
| Not persisted | Run logs, connector queue, runtime metrics, and review queue do not survive reload as durable run history. |

## Execution

| Capability | Current state |
|---|---|
| Run modes | Implemented UI/runtime modes are Run All, Run Selected, Run From Selected, and Dry Run. |
| Planner | `planWorkflowRun` chooses target nodes and emits a local queue. |
| Mock runner | Local executor updates node status, artifact, metrics, logs, execution graph, and connector jobs. |
| Recovery | Failed/review-required connector jobs can be retried, marked reviewed, skipped, or cancelled in React state. |
| Missing | Validate mode, Stop, Resume, Replay, durable run cancellation, async worker execution, real execution plans, and persisted run records. |

## Observability

| Capability | Current state |
|---|---|
| Logs | Workflow logs appear in BottomMonitor and include mock connector messages. |
| Metrics | Tokens, cost, latency, success rate, queue count, retry count, and bottleneck node are shown. |
| Queue | Active nodes and connector jobs are visible in the queue tab. |
| Execution graph | Review/error/retry/skip routes are summarized. |
| Evaluation | Local evaluation scores and rebuild requests are visible. |
| Missing | Durable trace, node log history, audit log, multi-run comparison, error rate, parallelism, and resource load. |

## Templates

| Capability | Current state |
|---|---|
| Save/load | Local workflow templates can be saved, loaded, deleted, duplicated, and searched. |
| Metadata | Template metadata captures tags, category, node/connection count, port summary, evaluation summary, artifact version count, run metrics, and artifact preview. |
| Safety | Loading uses confirmation and resets runtime statuses for reuse. |
| Missing | Recipes, knowledge cards, success/failure pattern libraries, shared assets, version editing, and variable/fixed part separation. |

## Safety Controls

| Capability | Current state |
|---|---|
| Credential boundary | UI and docs state that credential values are not stored in UI state, localStorage, templates, logs, or metrics. |
| Mock boundary | Agent connectors are marked mock and do not call real APIs. |
| Delete/reset confirmation | Destructive UI paths include confirmation flows. |
| Human review | Local review-required flow exists for mock execution. |
| Missing | Spec check, secret scan, git guard, publish gate, command risk check, durable approval records, and HUD-backed safety levels. |

## Mock Connectors / Adapters

| Area | Current state |
|---|---|
| Mock connectors | Codex, Claude, Gemini, Hermes, Grok/X Search, and Human Review mock connectors are registered. |
| Connector execution queue | Each planned run can create `ConnectorJob` records in React state. |
| Adapter boundary | `IStorageAdapter` exists for persistence; external service adapters remain mock registry concepts. |
| Real connectors | Codex, Claude Code, Gemini, Hermes, Grok/X Search, GitHub, Local Shell, and File System real adapters are not implemented. |

## Cognitive HUD / Situation Narration Layer — implemented vs. spec

This section breaks the two concept layers into "what currently exists in code" vs. "what the source spec requires." Use it together with `spec-coverage-matrix.md` and `missing-systems.md`.

### Cognitive HUD

| Spec element (本来仕様) | MVP status | MVP surface (if any) |
|---|---|---|
| HudSignal type | Implemented as `HudSignal` in `src/domain/cognitiveHud.ts` | — |
| HudSnapshot / HudCounts | Implemented as `HudSnapshot` / `HudCounts` | `CognitiveHudPanel` |
| Priority Score / L0–L5 alert level | Partial — alert level + priority derived per signal | `CognitiveHudPanel` |
| HUD badge on NodeCard / ConnectionLine | Partial — node status badges exist on `NodeCard` / `ReactFlowNode`; connection HUD badges are missing | `node-hud-badge` |
| Selected object HUD (選択時の浮遊HUD) | Partial — selected node and selected edge get canvas-local HUD context with quick actions; coordinate-following placement is still missing | `SelectedObjectHud`, `SelectedEdgeHud` |
| Central HUD card (画面中央のHUDカード) | Partial — central card receiver exists for non-normal priority, but rich approval/failure/focus variants are missing | `CognitiveHudOverlay` |
| Approval Pending HUD | Missing (signals exist in list form only) | — |
| Failure Cause Card | Missing | — |
| Focus Overlay / Path Dim (不要経路の減光) | Missing | — |
| Notification Bundle (通知まとめ) | Missing | — |
| Critical short audio cue | Missing | — |
| HUD history (HUD表示履歴) | Missing | — |
| Cognitive HUD as attention-allocation layer spanning Canvas / Inspector / modals | Missing as a layer; only the summary panel exists | `CognitiveHudPanel` is a summary, not the layer |

### Situation Narration Layer (Situation Assistant)

| Spec element (本来仕様) | MVP status | MVP surface (if any) |
|---|---|---|
| BriefingInput collector (credential-safe) | Implemented | — |
| 4D text briefing (What / Why / How / Next) | Implemented (mock-only) | `BriefingPanel` |
| Situation Summary (short form) | Partial (folded into What) | `BriefingPanel` |
| Situation Detail (long form) | Partial (folded into Why) | `BriefingPanel` |
| Timeline Narration (past → present → future) | Missing | — |
| Incident Replay | Missing | — |
| Workflow News Video | Missing | — |
| Avatar Briefing | Missing | — |
| Audio Alert Briefing | Missing | — |
| Visual Explanation Render (dynamic highlight) | Missing | — |
| Next Action Briefing (standalone) | Partial (folded into Next) | `BriefingPanel` |
| Timeline Extractor / Situation Summarizer / Cause Analyzer / Future Risk Predictor / Briefing Script Writer | Missing | — |
| Voice Generator / Avatar Narrator / Visual Highlight Renderer / Briefing Video Composer | Missing | — |
| Human Decision Prompt | Missing | — |
| Role group (concierge / secretary / narrator / report-relay / situation strategist) | Missing as switchable role | — |
| Run Trace step evidence as input | Implemented | feeds `BriefingPanel` |

The MVP `BriefingPanel` is the **minimum output channel** of this layer. Removing voice / avatar / video / dynamic highlight / news video from spec because the MVP only outputs text would shrink the final design and is explicitly disallowed.
