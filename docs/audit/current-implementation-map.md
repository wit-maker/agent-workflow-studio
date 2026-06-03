# Current Implementation Map

Last updated: 2026-06-03

This map records what the current MVP actually contains. It does not redefine the full product goal.

## Open Issue Roadmap Alignment

The current implementation should be read against four open broad epics:

| Issue | Current implementation stance | Still-open epic gap |
|---|---|---|
| #31 Concept Guardrail | `concept-layer-correction.md`, `SOURCE_OF_TRUTH.md`, `CONCEPT_CHECKLIST.md`, and this audit map separate final layers from MVP surfaces. | Future plans still need to apply the checklist so Cognitive HUD / Situation Narration / Situation Assistant are not shrunk to panels. |
| #34 UI System Redesign | `GameHudShell` and canvas overlays moved the product away from panel-first UI. | The full AI workflow operating workspace still needs more state-based HUD behavior, visual attention policy, and cross-surface orchestration. |
| #37 Game HUD Canvas First Completion | Major Canvas First acceptance items are implemented: minimal HUD, selected node/edge HUD, MiniMap, zoom mode, grouping, inline preview, dark canvas, and safe Run Detail links. | Remaining work is interaction hardening, state-based QA, visual attention behavior, and replay-backed HUD behavior. |
| #46 Five-pillar MVP | A mock-only vertical path connects parts operation, mock connector/runtime, HUD attention, safe audit, Situation Assistant output, and template/history guidance. | The five pillars still need to be thickened through small vertical slices; real connectors, real AI, credential store, generated media, and animated replay remain out of current MVP scope. |

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

## Runtime Audit Worktree Phase

The Runtime Audit parallel worktree phase landed the safe route-event foundation without introducing backend/API behavior, credential storage, dependencies, or new localStorage keys.

| Lane | Current implementation | Boundary |
|---|---|---|
| Shared Contract | `src/domain/runtimeAuditContract.ts` defines the shared safe event contract and normalization boundary used by runtime and audit code. | Contract events are derived metadata only; no raw config, prompt, payload, artifact body, credential, token, or API key belongs in this shape. |
| Runtime Events | `RunTrace.runtimeEvents` can carry safe route/runtime events produced during mock execution. | Current run events remain mock-run observations, not real adapter telemetry. |
| Durable Audit | `traceAudit.runtimeEvents` stores the safe event metadata inside existing run history records, and old records without the field normalize to `[]`. | This reuses the existing run history key; it is not a new audit store or new localStorage scope. |
| Run Detail Replay / Diff | `RunDetailPanel` comparison includes runtime event count metadata, step evidence grouping, focused node/edge scoped diff, focused edge safe route-event metadata rows when two safe audit snapshots are selected, and a replay-ready safe runtime timeline for the selected current trace or revived audit snapshot. | This is metadata ordering and safe projection, not animated replay or full route reconstruction. |
| Edge HUD Deep Link | `SelectedEdgeHud` can keep the selected edge and open Run Detail in an edge-focused context. Safe copy summary includes the Run Detail focus label. | This is a session-state deep link, not a persistent URL router or durable replay engine. |
| Direct QA Harness | `npm.cmd run qa:direct` exercises import/export validation, safe audit/run history summaries, two-run Run Detail comparison, current-trace timeline focus, selected Edge HUD safe copy, legacy audit normalization, and storage-key registry checks without Browser file picker/download support. | This supplements Browser QA; it does not replace rendered interaction QA. |
| Review Decision Boundary | `reviewDecisionAudit.ts` derives a safe session-only review decision summary, and `HumanReviewPanel` displays the persistence boundary near the decision controls. | Review decisions are not durable approval records yet. If made durable later, they must be stored as safe metadata inside an existing run history record, not a new localStorage key. |

## Concept Layer Note (Issue #31)

> See `docs/project/concept-layer-correction.md` for the authoritative concept definitions.

Several MVP surfaces look like they implement the full cognitive HUD or full Situation Assistant, but they do not. They are **provisional MVP display surfaces** for those concept layers. The table below lists every such surface explicitly so the gap is not lost.

| MVP display surface | What it actually is | What it is NOT |
|---|---|---|
| BottomMonitor `認知HUD` tab | A summary view of HUD signals derived from current runtime state. | Not the cognitive HUD itself. The cognitive HUD is an attention-allocation layer that spans Canvas / Inspector / notifications / modals. |
| `CognitiveHudPanel` component | Read-only HUD summary list. Better named `HudSummaryPanel` / `HudSignalList`. | Not a full HUD with badges on nodes/edges, focus overlays, dimming, intervention cards, or critical audio cues. |
| BottomMonitor `ブリーフィング` tab + `BriefingPanel` | Minimum output channel of the Situation Narration Layer (4D text, replay cue, voice script, avatar script, decision prompt, visual timeline; all mock-only). | Not the Situation Assistant as a whole. Voice, avatar, video, dynamic highlight, timeline narration, incident replay are out of scope but not removed from spec. |
| `HumanReviewPanel` persistence notice | A visible session-only persistence boundary plus safe audit summary projection for current Human Review decisions. | Not a durable approval record, not an external approval workflow, and not a new storage scope. |
| BottomMonitor `実行詳細` tab + `RunDetailPanel` | Read-only Run Trace step evidence viewer that can select current runtime trace or revived safe audit snapshots from run history, with node/edge focus deep links back to the canvas. It also has a replay-ready safe runtime timeline, a two-run safe audit comparison view with metadata rows, runtime event counts, step-level safe evidence grouping, focused node/edge scoped diff, focused edge safe route-event metadata diff, and safe connection `runtimePolicy` summaries inside the same panel. | Not an animated replay engine, not full edge-level route reconstruction, not timeline scrubber, and not visual replay animation. |
| BottomMonitor `Roadmap` tab | Connector readiness snapshot. | Not real connector implementation. |

These MVP surfaces are useful and intentional. They are listed here so that "implemented" is never confused with "the full layer is done."

## Screens

| Area | Current implementation | Notes |
|---|---|---|
| Always-on HUD | `CanvasCommandHud` shows compact run state, alert level, semantic attention source, trace/audit evidence source chip, zoom mode, model, safety state, HUD density chip, Run/Selected/FromSelected/Dry/Stop/Reset/Undo/Redo/Export/Import/Canvas mode, and Palette/Detail/MiniMap/Console/Notification/Density toggles. When validation focus is active, the `Val` action gets an attention state. When review-required focus is active, Detail and Run Detail entry points get attention states. | Model is still static text; richer iconography can improve later. |
| Left | `WorkspaceLeftRail` exposes Components (`PartsPalette`) plus WIP scaffold tabs as a collapsible Palette HUD drawer. | Library/Templates tabs are scaffold; existing data still reachable via Console HUD. |
| Center | `CognitiveWorkflowCanvas` primarily uses `ReactFlowCanvas`, overlays `CognitiveHudOverlay`, anchored `SelectedObjectHud`, anchored `SelectedEdgeHud`, `WorkflowGroupLayer`, and right-bottom `CanvasMiniMapHud`. StagePreview is no longer a constant canvas footer. | HUD placement uses measured card size and DOM collision rects. Semantic focus highlights current failure/approval/validation/retry/running/bottleneck attention paths. Selected node HUD can show durable audit evidence summaries. Selected edge selection is now lifted to `AppShell`, so Run Detail and canvas HUDs can deep-link to the same edge selection. |
| Right | `WorkspaceRightPanel` switches between Situation / Inspector / Assistant / Human Review inside an on-demand Detail HUD drawer. | Inspector is the existing component reused as one mode. |
| Bottom | `DetailDrawerDock` wraps `BottomMonitor` as collapsible Console HUD. All existing tabs preserved for compatibility. | Tabs are no longer the primary surface for HUD / Briefing / Run Detail. |
| Overlay | `CognitiveHudOverlay` shows central HUD variants for semantic attention, including compact validation-warning and review-required state cues when those semantic focus paths are active. `HudNotificationBundle` shows on-demand HUD feed, run history summary, density settings, and Replay links into Run Detail. `SelectedObjectHud` shows selected-node local HUD context and node-scoped durable audit evidence near the selected node while avoiding measured HUD surfaces. `SelectedEdgeHud` shows selected-edge flow context plus runtime route, optional connection runtime policy, source/target step status, evidence count, trace source, health, next action, and an Open Run Detail focus link near the selected flow. `CriticalOverlay` foregrounds failure/danger variants when semantic or HUD priority is critical. | Durable notification read/ack/pin state, edge-level durable replay, animated audit replay, and critical short-tone audio are not implemented. |
| Stage/output | Output review remains available through Console HUD / existing BottomMonitor tabs and right detail surfaces. | Diff and publish preparation remain partial or missing. |

## Components

| Component group | Files / modules | Current role |
|---|---|---|
| App shell and layout | `src/components/AppShell.tsx` (state owner), `src/components/workspace/CognitiveWorkspaceShell.tsx` (compat wrapper), `src/components/workspace/GameHudShell.tsx`, `src/components/workspace/CanvasCommandHud.tsx`, `src/components/workspace/HudNotificationBundle.tsx`, `src/components/workspace/WorkspaceLeftRail.tsx`, `src/components/workspace/WorkspaceRightPanel.tsx`, `src/components/workspace/DetailDrawerDock.tsx`, `src/components/workspace/CognitiveWorkflowCanvas.tsx`, `src/components/workspace/CognitiveHudOverlay.tsx`, `src/components/workspace/SelectedObjectHud.tsx`, `src/components/workspace/SelectedEdgeHud.tsx`, `src/components/workspace/CanvasMiniMapHud.tsx`, `src/components/workspace/WorkflowGroupLayer.tsx`, `src/components/workspace/CriticalOverlay.tsx`, `src/components/workspace/SituationPanel.tsx`, `src/components/workspace/AssistantPanel.tsx`, legacy `src/components/TopBar.tsx` / `GlobalRunControl.tsx` / `CurrentStateStrip.tsx` (kept for compatibility/history) | AppShell owns reducer state, run actions, connector queue state, session-only selected edge/run-detail selection, persistence hooks, and renders the Game HUD shell through the compatibility wrapper. |
| Canvas | `WorkflowCanvas.tsx`, `ReactFlowCanvas.tsx`, `ReactFlowNode.tsx`, `NodeCard.tsx`, `ConnectionLine.tsx` | Displays nodes, edges, statuses, port handles, validation feedback, inline previews, zoom-mode classes, minimap HUD, group layer, selection focus, semantic attention focus, and runtime edge class projections. |
| Editing | `Inspector.tsx`, `ConnectionEditor.tsx`, `workflowActions.ts`, `workflowReducer.ts` | Handles node field edits, JSON validation, connection create/delete, optional connection runtime policy editing, undo/redo state, import/reset paths. |
| Execution and recovery | `runPlanner.ts`, `runEngine.ts`, `nodeExecutors.ts`, `executionGraph.ts`, `connectorQueue.ts`, `recoveryActions.ts`, `runTrace.ts`, `runAudit.ts`, `runAuditRouteEvents.ts`, `runtimeAuditContract.ts`, `runtimeEvents.ts`, `runtimeEventSummary.ts`, `runDetail.ts`, `edgeRuntimePolicy.ts` | Provides local mock run planning, fixed-preset connection policy route gating, safe runtime route events, execution summaries, graph state, connector jobs, retry/review/skip/cancel actions, current run trace evidence, durable safe audit snapshot creation/revival, read-only run replay view models, replay-ready safe runtime timeline view models, and safe audit comparison view models with metadata, runtime event count diff, step evidence grouping, focused node/edge scope, and focused edge route-event metadata diff. |
| Templates | `TemplateLibrary.tsx`, `TemplatePreview.tsx`, `templateMetadata.ts`, `localTemplates.ts` | Saves, loads, duplicates, searches, previews, and annotates local templates. |
| Safety and connectors | `AgentConnectorPanel.tsx`, `CredentialBoundaryPanel.tsx`, `agentConnectorRegistry.ts`, `credentialPolicy.ts` | Shows mock connector boundaries and credential non-storage policy. |
| Storage | `localWorkflowState.ts`, `localWorkflowHistory.ts`, `localCanvasState.ts`, `localAppSettings.ts`, `storageAdapter.ts`, `storageKeys.ts` | Uses localStorage plus an `IStorageAdapter` boundary prepared for later Tauri/file storage. |

## Data Model

| Model | Current state | Gap |
|---|---|---|
| `Workflow` | Has id, optional schemaVersion, name, status, nodes, connections, metrics, logs, artifact, timestamps. | Not yet a full `WorkflowDocument` with viewport, runConfig, templates, metadata, migrations, and audit identity. |
| `WorkflowNode` | Has type, title, category, status, agentRole, typed inputs/outputs, optional ports, config, position, metrics, lastRun. | Missing explicit owner, risk state, HUD state, node logs, and normalized connector bindings. |
| `WorkflowConnection` | Has source/target node and port ids, `ConnectionKind`, carried data types, status, metrics, and optional safe `runtimePolicy` metadata for condition / delay / retry / error-route summaries. Runtime edge HUD derives observed route/health from execution graph, run trace, safe runtime events, connection validation, optional policy, and fixed-preset policy evaluation. | Does not yet enforce condition/retry semantics as full branch graph runtime contracts, does not evaluate arbitrary expressions, and does not yet provide animated edge-level replay. |
| Data types | `WorkflowDataType` covers text, files, prompts, context, result, evidence, decision, artifact, logs, metrics, errors, JSON, command, review, and related types. | CredentialRef is intentionally absent from normal data flow. Some source-spec data classes are not yet modeled separately. |
| Run state | Node and workflow statuses include idle, queued, running, success, failed, skipped, review_required, blocked, paused, archived, and retry_ready. `runFinished` clears the active execution step so Stop/Cancel does not keep an Active Run focus. | Cancelled/paused/replay state is still incomplete in runtime behavior. |

## Save / Load

| Capability | Current state |
|---|---|
| Workflow autosave | Current workflow is saved to localStorage and restored at startup. |
| Import/export | Workflow JSON import/export exists with validation and normalization paths. |
| Templates | Templates are persisted to localStorage with metadata and backward-compatible normalization. |
| History snapshots | Workflow history exists in localStorage. Run history records can include optional safe `traceAudit` snapshots and safe `traceAudit.runtimeEvents` under the existing run history key. |
| Adapter boundary | `IStorageAdapter` exists, but many call sites still use direct local storage helpers. |
| Not persisted | Raw run logs, connector queue, full runtime metrics timeline, and review queue do not survive reload. Safe trace/audit summaries do survive in run history records. |

## Execution

| Capability | Current state |
|---|---|
| Run modes | Implemented UI/runtime modes are Run All, Run Selected, Run From Selected, Dry Run, and mock-only Validate. |
| Planner | `planWorkflowRun` chooses target nodes and emits a local queue. |
| Mock runner | Local executor updates node status, artifact, metrics, logs, execution graph, connector jobs, and fixed-preset connection policy route gates. |
| Recovery | Failed/review-required connector jobs can be retried, marked reviewed, skipped, or cancelled in React state. |
| Missing | Full Stop/Resume/Replay behavior, durable run cancellation, async worker execution, real execution plans, and persisted run records beyond existing local run history summaries. |

## Observability

| Capability | Current state |
|---|---|
| Logs | Workflow logs appear in BottomMonitor and include mock connector messages. |
| Metrics | Tokens, cost, latency, success rate, queue count, retry count, and bottleneck node are shown. |
| Queue | Active nodes and connector jobs are visible in the queue tab. |
| Execution graph | Review/error/retry/skip routes and safe runtime events are summarized and projected into selected-edge HUD / React Flow runtime edge classes / Run Detail metadata diff / Run Detail replay-ready timeline. Fixed preset connection runtime policies can now gate mock routes as `main` or `skip`; expression metadata is still displayed but not evaluated. |
| Evaluation | Local evaluation scores and rebuild requests are visible. |
| Missing | Animated replay engine, enforced edge runtime policy, full edge-level visual route reconstruction, node log history, visual multi-run replay animation, error rate, parallelism, and resource load. Safe `traceAudit` snapshot selection/recall, metadata comparison, replay-ready event ordering, step evidence grouping, and focused scoped diff exist. |

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
| Selected object HUD (選択時の浮遊HUD) | Partial — selected node and selected edge get canvas-local HUD context with quick actions and viewport-anchored placement | `SelectedObjectHud`, `SelectedEdgeHud` |
| Central HUD card (画面中央のHUDカード) | Partial — central card receiver exists for non-normal priority, but rich approval/failure/focus variants are missing | `CognitiveHudOverlay` |
| Approval Pending HUD | Missing (signals exist in list form only) | — |
| Failure Cause Card | Missing | — |
| Focus Overlay / Path Dim (不要経路の減光) | Partial — selected node/edge highlight their local path and dim irrelevant nodes/edges | `ReactFlowCanvas`, `ReactFlowNode` |
| Notification Bundle (通知まとめ) | Missing | — |
| Critical short audio cue | Missing | — |
| HUD history (HUD表示履歴) | Missing | — |
| Cognitive HUD as attention-allocation layer spanning Canvas / Inspector / modals | Partial — canvas selection/focus layer plus on-demand notification/history/density overlay exists, but durable notification state and cross-modal intervention policy are incomplete | `CognitiveHudPanel` remains a summary, not the layer |

### Situation Narration Layer (Situation Assistant)

| Spec element (本来仕様) | MVP status | MVP surface (if any) |
|---|---|---|
| BriefingInput collector (credential-safe) | Implemented | — |
| 4D text briefing (What / Why / How / Next) | Implemented (mock-only) | `BriefingPanel` |
| Situation Summary (short form) | Partial (folded into What) | `BriefingPanel` |
| Situation Detail (long form) | Partial (folded into Why) | `BriefingPanel` |
| Timeline Narration (past → present → future) | Partial — mock visual timeline and replay cue exist, backed by safe runtime metadata counts. | `BriefingPanel` |
| Incident Replay | Partial — Run Detail has replay-ready safe runtime timeline, but no animation or scrubber. | `RunDetailPanel` |
| Workflow News Video | Missing | — |
| Avatar Briefing | Missing | — |
| Audio Alert Briefing | Missing | — |
| Visual Explanation Render (dynamic highlight) | Missing | — |
| Next Action Briefing (standalone) | Partial (folded into Next) | `BriefingPanel` |
| Timeline Extractor / Situation Summarizer / Cause Analyzer / Future Risk Predictor / Briefing Script Writer | Missing | — |
| Voice Generator / Avatar Narrator / Visual Highlight Renderer / Briefing Video Composer | Missing | — |
| Human Decision Prompt | Partial — mock decision prompt exists in briefing output. | `BriefingPanel` |
| Role group (concierge / secretary / narrator / report-relay / situation strategist) | Missing as switchable role | — |
| Run Trace step evidence as input | Implemented | feeds `BriefingPanel` |
| Safe runtime replay metadata as input | Implemented | feeds `BriefingPanel` Replay cue |

The MVP `BriefingPanel` is the **minimum output channel** of this layer. Removing voice / avatar / video / dynamic highlight / news video from spec because the MVP only outputs text would shrink the final design and is explicitly disallowed.
