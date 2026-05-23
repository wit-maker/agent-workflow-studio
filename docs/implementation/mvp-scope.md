# MVP Scope

## Included

- Twelve MVP parts from the source specifications.
- Visible workflow canvas with typed nodes and connection lines.
- Node selection and inspector detail.
- Local-only run simulation.
- Metrics for tokens, estimated cost, latency, success rate, retry count, and
  bottleneck.
- Check result display using PASS or REVIEW mock outcomes.
- Stage preview for generated artifacts.
- Logs and execution timeline.

## Explicitly Excluded

- Real Codex, Hermes, Grok/X, Claude, Gemini, GitHub, Drive, or Web API calls.
- Credential persistence.
- Real file upload processing.
- Cloud synchronization.
- User accounts and RBAC.
- Tauri desktop packaging.
- Database schema design.
- Full drag-and-drop canvas editing.

## Acceptance Mapping

- AC-001 to AC-003: covered by AppShell, PartsPalette, WorkflowCanvas, and sample
  workflow.
- AC-004: covered by selected-node inspector.
- AC-005 to AC-008: covered by local mock run simulation and log panel.
- AC-009: covered by BottomMonitor.
- AC-010 to AC-012: covered by StagePreview and Template Save node.
- AC-013: covered by `getConnectionError` and `canConnect`.
- AC-014 to AC-015: covered by README, AGENTS, and this scope document.
