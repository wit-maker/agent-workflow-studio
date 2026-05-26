# Spec Coverage Matrix

Last updated: 2026-05-26

Status values:

- Done: MVP behavior substantially exists.
- Partial: useful MVP behavior exists, but full spec is not complete.
- Missing: no meaningful implementation yet.
- Mismatch: implementation shape differs from the source-spec model and needs reconciliation.
- Risk: current implementation may block or distort later phases if not handled.

> **Concept layer note (Issue #31)**: For the cognitive HUD and the Situation Narration Layer, the current MVP exposes summary surfaces (`認知HUD` tab, `ブリーフィング` tab, `実行詳細` tab). These surfaces are **provisional MVP display panels**, not the full layers. The "Spec area" rows below are intentionally evaluated against the full source-spec layer, not against the MVP surface. See `docs/project/concept-layer-correction.md` and `current-implementation-map.md` for the concept-layer split.

## UI Coverage

| Spec area | Status | Current coverage | Gap / risk |
|---|---|---|---|
| UI-01 Main canvas | Partial | Standard and React Flow canvases show 12 nodes, 13 edges, status, ports, validation, and run controls. | Full editing, minimap, auto layout, DnD node creation, node deletion, and complete React Flow migration are incomplete. |
| UI-02 Parts library | Partial | Searchable MVP part list shows categories, descriptions, and I/O. | Agent role/data type filters and reliable add-from-library workflow need hardening. |
| UI-03 Input / collection | Partial | Text/file input nodes exist as sample nodes. | Input source management, acquisition settings, normalization status, and previews are not first-class screens. |
| UI-04 Processing / control flow | Partial | Route, check, retry/error/review paths exist in mock execution. | Branch/parallel design, retry policy editing, and visual control-flow authoring are incomplete. |
| UI-05 Artifact stage | Partial | Preview/Markdown/JSON-like artifact display, evaluation, review, and version panels exist. | Diff, publish preparation, durable approval, and artifact persistence are incomplete. |
| UI-06 Block editing | Partial | Inspector edits title, description, role, config JSON, ports, and connections. | Prompt, tools, security, test run, last-run detail, and settings history are missing. |
| UI-07 External connection / AI integration | Partial | Agent tab shows mock connectors and credential boundary. | Real adapter connection state, test connection, credential references, and read/write approval modes are missing. |
| UI-08 Observation / execution monitor | Partial | Logs, metrics, queue, output, execution graph, evaluation, agent, and storage tabs exist. | Durable trace/audit, multi-run comparison, error rate, parallelism, and resource load are missing. |
| UI-09 Evaluation / rebuild | Partial | PASS/REVIEW/FAIL mock flow, local evaluation, human review, rebuild requests, and artifact versions exist. | Diff-based review, persistent human decisions, and improvement prompt accumulation are missing. |
| UI-10 Reinforced reuse state | Partial | Template save/load/search/duplicate/preview exists with metadata. | Recipes, knowledge, success/failure pattern assets, sharing, and version editing are missing. |
| UI-11 Cognitive HUD settings | Missing | No dedicated HUD settings screen. After Issue #34 shell migration, the cognitive HUD now has three receiver surfaces — `CognitiveHudOverlay` (canvas), right panel `Situation` mode, and `CriticalOverlay` (root) — plus node-level HUD badges for failed/review/blocked/retry. The Detail Drawer `認知HUD` tab is a summary view of derived signals, not the HUD layer itself. | HUD priority, danger levels, notification settings, depth, collapse rules, edge-level HUD overlays, central HUD card with rich content, approval-pending HUD, failure-cause card, focus overlay, path dim, notification bundle, critical short audio cue, and HUD history are not modeled. |
| UI-13 Cognitive Workspace Shell (Issue #34) | Partial | Top/Left/Center/Right/Bottom/Overlay region split landed via `CognitiveWorkspaceShell`. Right panel is mode-switchable (Situation/Inspector/Assistant/HumanReview). BottomMonitor demoted to collapsible `DetailDrawerDock`. | Edge-level overlays, node-level dim/highlight logic, full per-region content (Workflow Library, Templates), removal of duplicate BottomMonitor tabs, and assistant non-text channels are not implemented. |
| UI-12 Run history / audit log | Partial | Local workflow history, transient logs, durable run record list, and read-only Run Detail evidence panel exist. | Audit log, replay, reproduction, diff, and export are not complete. |
| UI-13 Situation Narration Layer (added) | Partial | 4D mock text briefing exists as the **minimum output channel** (`BriefingPanel`). | Timeline Narration, Incident Replay, Avatar Briefing, Audio Alert Briefing, Visual Explanation Render, Workflow News Video, Briefing Video Composer, Next Action Briefing standalone, role switch (concierge / secretary / narrator / report-relay / situation strategist) are missing. Voice / avatar / video are MVP-out but must not be removed from spec. |

## Functional Coverage

| Area | Status | Current coverage | Gap / risk |
|---|---|---|---|
| Node categories | Mismatch | MVP has categories such as 開始, 入力, 変換, 制御, 実行, 接続, 品質, 回収, 出力, 記録, テンプレート. | Full source categories include 起点, 入力取得, 整形・前処理, 分岐・ルーティング, 検査, 集約, 観測, 改善, 認知HUD, 安全・権限. Mapping needs normalization before scaling parts. |
| Data types | Partial | `WorkflowDataType` covers many content, control, artifact, metric, error, command, and review types. | CredentialRef must remain outside normal data flow; richer document/source/trace types may be needed. |
| Edge types | Done | `ConnectionKind` covers data, instruction, result, decision, evidence, log, error, retry, approval, resource, template, and improvement. | Runtime semantics for every edge type are not fully implemented. |
| Run modes | Partial | Run All, Run Selected, Run From Selected, and Dry Run exist. | Validate, Mock Run as explicit mode, Stop, Retry as full run mode, Error Route, Resume, and Replay are incomplete. |
| Metrics / trace / audit log | Risk | Tokens, cost, latency, success rate, queue count, retry count, bottleneck, logs, and execution graph exist in UI. | Trace and audit log are not durable. Logs/queue/metrics do not survive reload as run records. |
| Cognitive HUD | Partial | `HudSignal` / `HudSnapshot` / `HudCounts` derive a priority + summary panel. Node/edge statuses and bottleneck indicators are visible. | Cognitive HUD as an **attention-allocation layer** (selection / compression / emphasis / notification / intervention) spanning Canvas / Inspector / modals is missing. HUD badges on nodes/edges, central HUD card, approval-pending HUD, failure-cause card, focus overlay, path dim, notification bundle, critical short audio cue, HUD history, and the 5 design dimensions (what / when / where / how / how-much to show) are not modeled. |
| Situation Narration Layer | Partial | 4D mock text briefing (`BriefingPanel`) reads HUD snapshot, run trace step evidence, logs, metrics, and connector jobs. | This is the **minimum output channel** only. Timeline Extractor, Situation Summarizer, Cause Analyzer, Future Risk Predictor, Briefing Script Writer, Voice Generator, Avatar Narrator, Visual Highlight Renderer, Briefing Video Composer, Next Action Briefing, Human Decision Prompt, role group switch, past→present→future timeline narration, incident replay are missing. Voice / avatar / video must remain in spec even while MVP-out. |
| Safety gates | Partial | Credential boundary, mock connector boundary, confirmations, review-required flow, and docs exist. | Spec check, secret scan placeholder, git guard, publish gate, shell command risk check, loop/cost limits, and durable approval gate are missing. |
| Templates / recipes / knowledge | Partial | Local templates with metadata, preview, duplicate, search, and load confirmation exist. | Recipes, knowledge cards, success/failure pattern capture, versioning, and next-best-action are missing. |
| External adapters | Risk | Mock registry and connector jobs exist. UI states real APIs are not connected. | Real adapter interfaces for Codex, Claude Code, Gemini, Hermes, Grok/X, GitHub, Local Shell, and File System are missing or conceptual. |
| Local-first / Tauri / file storage | Risk | localStorage persistence and `IStorageAdapter` exist; Tauri/file storage docs exist. | App still relies on direct localStorage helpers; file persistence, Tauri filesystem, SQLite/local DB, secure credential store, and migrations are missing. |
