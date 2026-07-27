# Task-shaped lanes and worktrees

## Assignment contract

Terra must give Luna:

- task ID and user-visible outcome;
- exact base SHA;
- expected `codex/<task-id>-<slug>` branch;
- selected task shape (`read-only`, `shared-single-writer`, or `isolated-lane`);
- worktree path when isolation is selected;
- allowed and forbidden paths;
- dependency state;
- acceptance criteria and required evidence;
- public contracts that must remain unchanged;
- owner gates and stop rules.

Luna verifies the contract before editing. Detached HEAD, wrong branch, wrong
base, or unexpected dirty state is a stop condition. A shared checkout is
allowed only for an explicitly assigned serialized single-writer task.

## Isolation

- Read-only exploration, logs, and review use subagents without a writing lane.
- A small bounded fix may use one serialized Luna writer in the current
  checkout when no other writer is active, Terra will inspect the full diff and
  validation, and separate PR provenance is not needed.
- Long-lived, broad, parallel, or independently reviewed work uses one Codex
  task, worktree, branch, and PR per isolated lane.
- Never run concurrent write agents in the same checkout.
- Parallelize read-only investigation when useful; serialize overlapping writes.
- Do not edit `harness/state/STATE.md` manually. Terra regenerates it after
  lifecycle changes.
- Luna may add task-local evidence and handoff records on its branch.

## PR lifecycle

Luna implements, validates, commits explicit files, pushes, and opens the PR.
Terra reviews the exact commit. Requested changes return to that Luna lane.
Terra merges approved work, validates the updated base, and selects the next
task shape. Luna never merges its own PR.
