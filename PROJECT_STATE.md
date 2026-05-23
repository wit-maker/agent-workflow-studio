# Project State

Last updated: 2026-05-23

## Current Phase

Bootstrap MVP foundation.

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

## Not Implemented Yet

- Real external API connections.
- Credential storage.
- Tauri desktop wrapper.
- Durable JSON save/load UI.
- Drag-and-drop node creation.
- Port-level interactive connection editing.
- Automated tests beyond build and lint.

## Next Work

1. Improve node and edge interaction details.
2. Add workflow JSON export/import.
3. Split monitor tabs for logs, metrics, queue, and output.
4. Add editable inspector fields and template-save mock storage.
5. Decide whether to introduce Zustand or keep a reducer-based state model.

## Known Risks

- The source instruction recommends GPT-5.5 xhigh/high; this session identified
  the active agent as GPT-5-based and cannot self-switch models.
- Vite generated current latest package versions, so future dependency changes
  should be reviewed before extending the app.
- Git user identity was missing globally, so this repository uses a local
  `wit-maker` noreply identity for the bootstrap commit.
