# Missing Systems

Last updated: 2026-05-25

Priority scale:

- P0: needed before the next implementation phase
- P1: needed soon
- P2: needed for the full product

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
