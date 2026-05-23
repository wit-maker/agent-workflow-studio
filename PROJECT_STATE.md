# Project State

Last updated: 2026-05-23

## Current Phase

Phase 2 connection, template, and local history foundation.

## Completed

- Created a new local repository for `agent-workflow-studio`.
- Scaffolded React + TypeScript + Vite with npm.
- Imported the two AI Workflow Lab source specifications into
  `docs/source-specs/`.
- Added project constitution, architecture note, MVP scope note, and README.
- Added minimal domain types, sample workflow data, connection validation, and
  bottleneck calculation.
- Added the initial UI skeleton with top bar, parts palette, canvas, inspector,
  stage preview, and bottom monitor.
- Added a local-only mock run simulation with node statuses, logs, metrics,
  PASS/REVIEW outcome, and mock artifact output.
- Tightened `AGENTS.md` model gate so non-recommended or unknown models must
  stop unless the user explicitly overrides.
- Added useReducer-based workflow state management.
- Added editable Inspector fields for title, description, agent role, and config
  JSON.
- Added Workflow JSON export and import with minimum shape validation.
- Split BottomMonitor into Logs, Metrics, Queue, and Output tabs.
- Split StagePreview into Preview, Markdown, and JSON tabs.
- Added visible connection validation in Canvas and Inspector.
- Added port-level connection visibility from node input/output types.
- Added form-based connection creation and deletion without drag-and-drop.
- Strengthened connection validation for missing nodes, same-node links, carries,
  ports, unsupported targets, and unknown kinds.
- Added localStorage-backed template save/load/delete mock.
- Added localStorage-backed workflow snapshot save/load/delete history.
- Strengthened import validation for connection endpoints and artifact content.

## Not Implemented Yet

- Real external API connections.
- Credential storage.
- Tauri desktop wrapper.
- Drag-and-drop node creation.
- Drag-and-drop connection editing.
- Full port objects with required/optional metadata.
- Automated tests beyond build and lint.

## Next Work

1. Add drag connection affordances.
2. Add explicit port objects with required/optional metadata.
3. Add error routes and retry routes to the run simulator.
4. Add template version naming and metadata editing.
5. Revisit Zustand only if reducer state becomes hard to follow.

## Known Risks

- Model gate is strict: if the model is not GPT-5.5 high or GPT-5.5 xhigh,
  implementation must stop unless the user explicitly overrides.
- Vite generated current latest package versions, so future dependency changes
  should be reviewed before extending the app.
- Git user identity was missing globally, so this repository uses a local
  `wit-maker` noreply identity for the bootstrap commit.

## Phase 1 Verification

- Model: GPT-5.5 high confirmed by user before implementation.
- Branch: `feature/ui-state-and-json-foundation`.
- `npm run build`: success.
- `npm run lint`: success.
- Browser QA: verified tabs, Inspector editing, local mock run, logs, metrics,
  artifact output, and connection validation display.

## Phase 2 Verification

- Model: GPT-5.5 high confirmed by user before implementation.
- Branch: `feature/connection-template-local-history`.
- `npm run build`: success.
- `npm run lint`: success.
- Browser QA: verified connection editor visibility, port visibility,
  connection create/delete, template save UI, local history save UI, existing
  Run behavior, metrics, and artifact output.
