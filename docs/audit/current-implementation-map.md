# Current Implementation Map

Last updated: 2026-05-25

This map records what the current MVP actually contains. It does not redefine the full product goal.

## Screens

| Area | Current implementation | Notes |
|---|---|---|
| Top bar | `TopBar` exposes save/import/export, run modes, reset, and canvas mode controls. | Stop/validate are not full runtime controls yet. |
| Left sidebar | `PartsPalette` and `TemplateLibrary` provide searchable MVP parts and local templates. | Parts are based on the current 12-node sample definitions. |
| Main canvas | `WorkflowCanvas` and `ReactFlowCanvas` coexist. React Flow mode supports port handles, edge details, invalid connection feedback, and position persistence. | Full React Flow editing, minimap, auto layout, and DnD node creation are incomplete. |
| Right inspector | `Inspector` edits title, description, agent role, config JSON, ports, and connections. | Prompt, tools, security, test run, and settings history are not first-class panels yet. |
| Bottom monitor | `BottomMonitor` includes logs, metrics, queue, output, execution graph, evaluation, agent, and storage tabs. | Trace and durable audit log are not implemented. |
| Stage/output | `StagePreview`, evaluation, rebuild, human review, and artifact version panels expose local output review. | Diff and publish preparation remain partial or missing. |

## Components

| Component group | Files / modules | Current role |
|---|---|---|
| App shell and layout | `src/components/AppShell.tsx`, `src/components/TopBar.tsx` | Owns reducer state, run actions, connector queue state, persistence hooks, and layout composition. |
| Canvas | `WorkflowCanvas.tsx`, `ReactFlowCanvas.tsx`, `ReactFlowNode.tsx`, `NodeCard.tsx`, `ConnectionLine.tsx` | Displays nodes, edges, statuses, port handles, and validation feedback. |
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
