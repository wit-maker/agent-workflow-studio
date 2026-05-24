# Stop Rules

Last updated: 2026-05-25

Stop before implementation when any rule below applies.

## Model and Planning

- The task touches Goal, Source of Truth, safety, credentials, architecture, or a large refactor and the active model is unknown or below the required model, unless the user explicitly allows continuation and the mismatch is recorded in `PROJECT_STATE.md`.
- The task would mix long-term Goal changes with local implementation changes without a plan.
- The task is too large for one branch-sized change.

## Source of Truth

- The requested change would shrink the long-term Agent Workflow Studio goal to fit the current MVP.
- The requested change would rewrite or remove original source specs under `docs/source-specs/`.
- Source priority is unclear and the conflict affects product behavior, safety, storage, or external connections.

## Credential and External Service Safety

- Credential values might be stored in workflow JSON, templates, logs, metrics, localStorage, or audit files.
- UI would connect directly to a real external API without an adapter boundary.
- A write-capable real connector is being added without human approval, run logging, and a safety gate.
- A command, file, Git, publish, or delete operation has unclear blast radius.

## Git and Release Safety

- The work requires direct commit or push to `main` or `develop`.
- The task requires `git add .`.
- There are unrelated dirty changes that would be mixed into the task.
- Browser QA is required but cannot be run, and the task would still be marked complete.

## Required Response When Stopping

When stopping, report:

- which stop rule triggered
- current branch and dirty state
- what source or decision is needed
- the smallest safe next step
