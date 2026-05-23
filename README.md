# Agent Workflow Studio

Agent Workflow Studio is a new local-first React application for designing,
running, observing, and reusing AI work as typed workflow nodes. It is a
separate product and repository from the existing `ai-workflow-lab` project.
The attached AI Workflow Lab documents are kept as source specifications, not
as an instruction to modify the old project.

## Source Specifications

The original specification files are preserved without summarizing or rewriting
their contents:

- `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md`
- `docs/source-specs/AI_Workflow_Lab_画面設計_詳細設計以降_v1.0.md`

The current implementation-to-screen-spec mapping is tracked in
`docs/implementation/SCREEN_SPEC_ALIGNMENT.md`.

## Getting Started

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Current Phase

The app is in the Phase 2 foundation stage: reducer-based workflow state,
Inspector editing, JSON import/export, connection validation, form-based
connection editing, localStorage template mocks, and local workflow snapshot
history are in place.

## Bootstrap MVP Scope

The current MVP includes:

- React + TypeScript + Vite app shell.
- Top bar, left parts palette, main workflow canvas, right inspector, bottom
  metrics/log monitor, and stage preview.
- Twelve visible MVP nodes: Manual Trigger, Text Input, File Input, Normalize,
  Route, AI Execute, External Connector, Check, Aggregate, Output, Run Log, and
  Template Save.
- Minimal domain model, sample workflow, typed connection rules, bottleneck
  calculation, and local mock run simulation.
- Tokens, cost, latency, success rate, bottleneck, logs, and mock artifact
  display.
- Form-based connection editing, local template mocks, and local workflow
  snapshot history.

## External API Status

No real external API is connected. Codex, Hermes, Grok/X, Claude, Gemini,
GitHub, and other services are represented as future connector or role concepts
only. The Run button executes a local mock simulator.

## MVP Exclusions

- No real external API calls.
- No Credential storage.
- No Tauri, SQLite, React Flow, or production database.
- No drag-and-drop connection library yet.
- No production security gate or publish flow yet.

## Implementation Order

1. Add execution graph details, error routes, and retry routes.
2. Add explicit port objects with required/optional metadata.
3. Improve evaluation and review flows.
4. Add richer template metadata and reuse workflows.
5. Evaluate Tauri 2 and durable local storage after the UI model is stable.
