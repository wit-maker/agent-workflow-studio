# Technical Debt

Last updated: 2026-05-25

This file lists current limits that may block later work if ignored.

## Data Model Debt

- `Workflow` is still closer to a browser MVP state object than the full `WorkflowDocument` described in source specs.
- Node category labels differ from the complete source-spec category set.
- `WorkflowNode` lacks first-class risk, HUD, owner, node log, connector binding, and approval metadata.
- Connection kinds are typed, but many edge semantics are visual/metadata only and not yet enforced by the runtime.
- schemaVersion exists, but migration policy and compatibility tests are not yet implemented.

## Execution Debt

- Run modes cover `all`, `selected`, `fromSelected`, and `dryRun`, but not full Validate, Stop, Retry, Error Route, Resume, or Replay behavior.
- Execution is local and mock-oriented; it is not a worker-backed or cancellable runtime.
- Connector jobs live in React state and are lost on reload.
- Retry/review flows are useful for MVP QA but are not durable approval records.
- `AppShell.tsx` owns a large amount of orchestration and may become a bottleneck for runtime/storage separation.

## Observability Debt

- Logs, metrics, queue, and execution graph are visible but not stored as durable run records.
- There is no dedicated trace model.
- There is no durable audit log for safety decisions, approvals, external calls, command risk checks, or publish gates.
- Metrics do not yet cover error rate, parallelism, resource load, or multi-run comparisons.

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
- Node add/delete, complex edge editing, minimap, auto layout, and DnD interactions remain incomplete or partially browser-QA-limited.
- UI-11 cognitive HUD settings and UI-12 durable run history/audit log are largely missing.
- Inspector lacks first-class prompt, tools, security, test run, last-run details, and settings history panels.

## Template / Reuse Debt

- Templates are localStorage-bound and not versioned as durable product assets.
- Recipe, knowledge, success pattern, failure pattern, and next-best-action systems are missing.
- Template metadata summarizes artifacts and metrics but does not store complete reusable learning history.
