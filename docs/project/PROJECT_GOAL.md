# Project Goal

Last updated: 2026-07-28

## North Star

Agent Workflow Studio is a local-first AI agent workflow work OS.

Its final goal is to let a human safely compose multiple AI agents, design work, execute it, observe it, inspect it, improve it, and reuse successful patterns.

This repository must not drift into any of the following:

- a plain chat UI
- an n8n clone
- a React Flow demo
- a mock-only prototype that shrinks the long-term goal

## Core Values

All implementation choices are judged by three values:

```text
safe to use
visible to understand
reusable after success
```

If a change does not move the product closer to safe, visible, reusable AI agent operation, it should be deferred.
## Evidence-first v2 Product Wedge

Version 2 makes **Evidence-first Local Agent Operations OS** the primary product wedge. The product is not only a workflow editor or an execution HUD: it helps a human understand what was planned, what actually happened, what requires attention, and which successful or failed patterns can be reused.

The durable product loop is:

```text
compile → execute → observe → approve → replay → compare → promote to recipe
```

The execution spine is defined in `docs/architecture/v2-evidence-first-adr.md`:

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

`RunEventEnvelope` is the single source of truth for execution facts. HUD, Run Detail, briefing, and comparison are pure, safe projections reconstructed from run events; they are not independent runtime authorities. This architecture preserves the existing safe / visible / reusable values while giving v2 a durable evidence model.

The v2 MVP gate is a version-frozen workflow that can produce a durable run, reconstruct the same state from its `RunEventEnvelope` sequence after restart, and promote a successful run into an immutable, traceable recipe revision. This is a product direction and acceptance gate; it does not authorize real external execution, credential storage, Tauri, SQLite, or v1 removal.

## Goal / Plan / Task / Prompt

| Layer | Role | Contains | Must not contain |
|---|---|---|---|
| Goal | Long-term north star | final state, judgment rules, safety principles, product identity | file-level implementation instructions |
| Plan | Current-phase strategy | current state, order of work, risks, acceptance criteria | shrinking the final goal to fit the MVP |
| Task | One PR / branch / work unit | files to change, exact constraints, validation steps | project-wide redefinition |
| Prompt | Current agent instruction | branch, scope, report format, one-time constraints | rules that should live only in chat memory |

## MVP Position

The current MVP is an entry point, not the product ceiling.

It currently proves that workflow nodes, typed-ish ports, local mock execution, logs, metrics, templates, and local persistence can coexist in one interface. Future phases must expand this toward the complete system: durable run history, trace and audit logs, cognitive HUD, safety gates, real adapter boundaries, local desktop persistence, and reusable knowledge assets.

## Non-Negotiables

- Do not save credential values in workflow JSON, templates, logs, metrics, browser storage, or audit artifacts.
- Do not connect UI directly to external APIs; go through adapter boundaries.
- Do not delete, summarize, or rewrite original AI Workflow Lab source specs.
- Do not treat MVP shortcuts as final product decisions.
- Do not call a phase complete without build, lint, TypeScript check coverage, Browser QA, and `PROJECT_STATE.md` updates.
