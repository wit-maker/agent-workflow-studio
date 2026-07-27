# ADR: Evidence-first v2 Product Architecture

- Status: Accepted for V2-00 product reset
- Date: 2026-07-28
- Scope: Product direction and architecture boundary only
- Next contract slice: V2-01, selected separately by Terra PM

## Decision

Agent Workflow Studio v2 is an **Evidence-first Local Agent Operations OS**. Its primary product loop is:

```text
compile → execute → observe → approve → replay → compare → promote to recipe
```

The durable execution spine is:

```text
WorkflowDocumentV2
→ immutable ExecutionPlan
→ Capability / Policy / Approval Gate
→ Executor
→ append-only RunEventEnvelope
→ RunSnapshot / RunRecord
→ Attention / Briefing / Comparison projections
→ immutable RecipeRevision / FailurePattern
```

`RunEventEnvelope` is the single source of truth for execution facts. A projection may summarize, filter, compare, or explain those events, but it must not become a second execution authority or silently invent runtime facts.

## Ownership boundaries

### Trusted runtime

Rust/Tauri is the trusted runtime boundary for the future desktop implementation. It owns process lifecycle, cancellation, capability and policy enforcement, approval gates, event append, run persistence, and controlled artifact access. The V2-00 decision does not authorize adding Tauri, Rust, SQLite, or local process execution.

### React application

React owns workflow editing, command issuance, event subscription, and safe projection display. React must not directly access SQLite, the filesystem, a CLI, credentials, or real external APIs. It must not treat a mock connector as a real connector.

### Event and projection model

- `WorkflowDocumentV2` is the editable and saveable document.
- `ExecutionPlan` is created at execution start and is immutable for that run.
- `RunEventEnvelope` is append-only and contains safe execution facts and references, never raw prompt, raw provider payload, artifact body, credential, token, password, or API key values.
- `RunSnapshot` and `RunRecord` are durable, safe reconstructions and indexes over the event sequence.
- HUD, Run Detail, briefing, and comparison are pure projections of events and safe run records.
- `RecipeRevision` and `FailurePattern` are immutable, traceable reuse assets derived from explicitly approved evidence; promotion is not implicit success.

## v2 MVP gate

The v2 MVP is not complete when a HUD card or a mock run is merely visible. The gate requires a version-frozen workflow to:

1. create a durable run;
2. append a safe `RunEventEnvelope` sequence;
3. reconstruct the same run state from that sequence after restart;
4. support replay/inspection from the same events;
5. compare safe run evidence; and
6. promote a successful run to an immutable, traceable recipe revision.

The gate is a target for later contract/runtime tasks. V2-00 does not claim that these capabilities are implemented.

## Safety and compatibility constraints

- Raw prompts, payloads, provider bodies, artifact bodies, credentials, tokens, passwords, and API keys are never stored, displayed, copied, or placed in fixtures or summaries.
- Write capabilities require a Human Review gate and safe audit evidence.
- The first executor target is read-only or mock-only until capability, policy, approval, and audit contracts are independently accepted.
- v1 remains available until an explicit cutover decision. It is not deleted as part of the v2 reset.
- The legacy importer is read-only and must not overwrite existing localStorage.
- Real external APIs, credential storage, Tauri, SQLite, dependency changes, and local process execution require their own approved gates.

## Relationship to existing product concepts

The Evidence-first wedge gives the existing concepts a durable backbone; it does not delete or collapse them.

- Cognitive HUD remains an attention-allocation layer over safe run evidence, not the product definition by itself.
- Situation Narration remains a past / present / future explanation layer with multiple output channels; text briefing remains an MVP channel.
- Situation Assistant remains broader than a text briefing tab and should consume safe evidence projections.
- Five-Pillar MVP and Canvas First are delivery and surface strategies subordinate to this architecture decision.
- Existing source specs under `docs/source-specs/**` remain read-only references.

## Consequences

Positive consequences:

- Execution facts have one reconstructable source of truth.
- Restart, replay, comparison, and reuse can share the same evidence contract.
- UI surfaces can evolve as pure projections without becoming hidden runtime authorities.
- Safety boundaries are explicit before real connectors or write-capable execution are considered.

Costs and risks:

- V2-01 must define stable contracts before broad UI or runtime work.
- Existing localStorage and mock-runtime paths are not yet equivalent to durable event-sourced runs.
- Projection correctness requires tests that distinguish conformance, artifact existence, and evaluation evidence.
- v1 compatibility and importer behavior must be preserved during migration.

## V2-00 non-goals

This ADR does not:

- add or modify TypeScript, Rust, Tauri, SQLite, storage keys, dependencies, or UI;
- implement an executor, event store, recipe promotion, replay engine, or real connector;
- remove or rewrite `docs/source-specs/**`;
- close GitHub issues or authorize a cutover;
- claim that the v2 MVP gate has passed.