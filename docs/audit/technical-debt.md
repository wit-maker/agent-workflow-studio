# Technical Debt

Last updated: 2026-06-03

This file lists current limits that may block later work if ignored.

## Concept Layer Debt (Issue #31)

> See `docs/project/concept-layer-correction.md` for the authoritative concept definitions.

These are not bugs — the code works — but the **naming and structure** make it easy for future contributors to misread provisional MVP surfaces as the full layer, which would shrink the final design.

- `CognitiveHudPanel` (component name) reads as "the cognitive HUD." It is actually a summary panel of derived HUD signals. The cognitive HUD as an attention-allocation layer (badges on nodes/edges, central card, focus overlay, dim, intervention) is not implemented. Renaming candidates: `HudSummaryPanel`, `HudSignalList`.
- The BottomMonitor `認知HUD` tab implies HUD lives in a tab. The HUD layer is supposed to span Canvas / Inspector / notifications / modals. Misleading framing should be corrected in docs first, then in UI labels.
- `BriefingPanel` (component) + the `ブリーフィング` tab read as "the Situation Assistant." They are actually the **minimum output channel** of the Situation Narration Layer. Mock voice script, avatar script, visual timeline, and human decision prompt now exist, but real audio/avatar/video rendering, timeline narration, and incident replay are still missing channels.
- `BriefingAdapter` interface currently produces a single `BriefingResult` with text plus mock channel scripts. When real voice / avatar / video adapters land, a shared `BriefingScript` intermediate will be needed so output channels stay coherent. Without it, each channel will reinvent the script and drift apart.
- `BriefingInput` does not yet expose past / present / future axes explicitly. The current 4D template covers it implicitly, but Timeline Narration / Future Risk Predictor will need first-class fields.
- `docs/source-specs/03_UI_UX_認知HUD設計書_完全版.md` was originally terse and risked being read as "HUD = the things in a HUD tab." It has been reframed (Issue #31 alignment), but the underlying naming debt in code remains.
- Audio cue belongs to the cognitive HUD as an expression channel (`Critical 短音通知`); audio briefing belongs to the Situation Narration Layer as an output channel. They are different, and conflating them will damage the HUD design.
- The Situation Assistant's role group (concierge / secretary / narrator / report-relay / situation strategist) is not modeled anywhere in code yet — there is no role switch, no per-role tone control, and no role-aware output channel selection.

These items do not block SA-1, but they should be tracked so that SA-5 onward does not have to invent the missing structure under time pressure.

## UI Shell Debt (Issue #34) — newly introduced by the cognitive workspace migration

- The legacy BottomMonitor and all its tabs (認知HUD / ブリーフィング / 実行詳細 / etc.) are now wrapped by `DetailDrawerDock` as a Bottom Console HUD for compatibility but still duplicate the right panel and overlay. Need a phased deprecation plan once the right panel + overlay reach parity, otherwise contributors will keep adding logic to the Console side.
- The legacy `.app-shell` / `.workspace-grid` / `.top-bar` CSS rules and the `TopBar.tsx` component are no longer rendered but remain in the tree. They should be removed once we are confident no other surface depends on them.
- `WorkspaceLeftRail` Workflow Library / Templates tabs are scaffold placeholders. The full library/template UX should land before the WIP badges become stale.
- `CanvasCommandHud` shows model as static `GPT-5.5 high`. It must read from settings once the model selection lives in product state.
- `CognitiveHudOverlay` now renders central HUD variants driven by semantic focus (`failure`, `approval`, `validation`, `running`, `bottleneck`), `HudNotificationBundle` renders on-demand notification/history/density controls with Replay links, and selected node/edge HUDs use measured viewport-anchored placement with DOM collision rects. Selected node history and Run Detail can read/select durable audit evidence summaries, and node/edge deep links return focus to the canvas. Remaining debt is persisted HUD preferences, durable notification read/ack/pin state, richer very-small-viewport reflow, and policy-backed depth/collapse behavior.
- `node-hud-badge` covers four statuses (failed / review_required / blocked / retry_ready). The full HUD badge spec includes severity, priority, human-gate, and failure-cause variants on top of status.
- `SelectedEdgeHud` and React Flow edges now derive delay / retry / error-route / health from current `ExecutionGraph`, `RunTrace`, `WorkflowConnection`, validation results, optional connection `runtimePolicy` metadata, and a mock-only fixed-preset policy evaluator. Edge selection is lifted to `AppShell` for Run Detail deep links. Remaining debt is turning that safe metadata/read-only projection into full branch graph enforcement, durable route replay, and edge-level audit records. Arbitrary expression evaluation remains intentionally absent.



## Data Model Debt

- `Workflow` is still closer to a browser MVP state object than the full `WorkflowDocument` described in source specs.
- Node category labels differ from the complete source-spec category set.
- `WorkflowNode` lacks first-class risk, HUD, owner, node log, connector binding, and approval metadata.
- Connection kinds are typed, and optional connection `runtimePolicy` metadata can describe condition / delay / retry / error-route summaries. Safe runtime/audit route events now exist as metadata in `RunTrace.runtimeEvents` and `traceAudit.runtimeEvents`, and edge runtime semantics are projected into HUD/React Flow/Run Detail from execution trace state, runtime events, safe policy metadata, and fixed-preset policy evaluation. They are still not enforced as a full branch graph or replayed as a full edge-level audit timeline.
- schemaVersion exists, but migration policy and compatibility tests are not yet implemented.

## Execution Debt

- Run modes cover `all`, `selected`, `fromSelected`, `dryRun`, and mock-only `validate`, but not full Stop, Retry, Error Route, Resume, or Replay behavior.
- Execution is local and mock-oriented; it is not a worker-backed or cancellable runtime.
- Connector jobs live in React state and are lost on reload.
- Retry/review flows are useful for MVP QA but are not durable approval records.
- `AppShell.tsx` owns a large amount of orchestration and may become a bottleneck for runtime/storage separation.

## Observability Debt

- Logs, metrics, queue, and execution graph are visible; completed runs now store a credential-safe `traceAudit` snapshot plus normalized safe `runtimeEvents` inside the existing run history record.
- `RunTrace` exists as a read-only derived view and can be revived from `traceAudit` when current runtime logs are not present. Run Detail can now select current trace or a safe audit snapshot, deep-link node/edge focus, and compare two safe audit snapshots with metadata rows, runtime-event count diff, step-level safe evidence grouping, and focused node/edge scoped diff. This is durable evidence recall and scoped diff, not a full animated replayable audit model.
- There is no durable audit log for safety decisions, approvals, external calls, command risk checks, publish gates, replay, visual multi-run replay animation, or edge-level route event replay. Connection runtime policy summaries and runtime events are safe metadata only, not enforced route behavior.
- Metrics do not yet cover error rate, parallelism, resource load, or policy-backed multi-run regression analysis.

## Storage Debt

- localStorage remains the active persistence layer.
- `IStorageAdapter` exists, but direct local storage helper calls remain in app flows.
- File export/import is present, but not equivalent to local-first desktop persistence.
- Tauri filesystem, SQLite/local database, and secure credential storage are not implemented.
- Workflow, template, app settings, canvas state, and history storage scopes are split across multiple helpers with limited migration support.

## Safety Debt

- Credential values are currently not stored, which is correct, but there is no real secure credential reference/store model yet.
- Mock connector boundaries are documented, but real adapter safety contracts are not implemented.
- Spec check, secret scan placeholder, git guard, publish gate, command risk check, loop limit, and cost limit are not first-class systems.
- Cognitive HUD safety levels L0-L5 are not modeled, so critical warnings cannot yet be prioritized by shared state.

## UI / UX Debt

- React Flow and standard canvas coexist; full migration/retirement strategy is not settled.
- Node add/delete, complex edge editing, auto layout, and DnD interactions remain incomplete or partially browser-QA-limited. MiniMap exists as a HUD, but overview behavior is still basic.
- UI-11 now has session-only notification/history/density controls, but persisted HUD settings and durable notification state are missing. UI-12 now has durable safe trace snapshots, normalized runtime events, run selection, node/edge deep links, safe metadata diff, runtime-event count diff, focused edge safe route-event metadata diff, step-level safe evidence grouping, focused scoped diff, and safe connection policy summaries, but animated replay, full route reconstruction, and audit policy controls are incomplete.
- Inspector lacks first-class prompt, tools, security, test run, last-run details, and settings history panels.

## Template / Reuse Debt

- Templates are localStorage-bound and not versioned as durable product assets.
- Recipe, knowledge, success pattern, failure pattern, and next-best-action systems are missing.
- Template metadata summarizes artifacts and metrics but does not store complete reusable learning history.
