# Project Goal

Last updated: 2026-05-25

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
