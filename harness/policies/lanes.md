# Lanes and worktrees

## Assignment contract

Terra must give Luna:

- task ID and user-visible outcome;
- exact base SHA;
- expected `codex/<task-id>-<slug>` branch;
- dedicated worktree path;
- allowed and forbidden paths;
- dependency state;
- acceptance criteria and required evidence;
- public contracts that must remain unchanged;
- owner gates and stop rules.

Luna verifies the contract before editing. Detached HEAD, wrong branch, wrong
base, unexpected dirty state, or a shared checkout is a stop condition.

## Isolation

- One writing task equals one Codex task, worktree, branch, and PR.
- Never run concurrent write agents in the same checkout.
- Parallelize read-only investigation when useful; serialize overlapping writes.
- Do not edit `harness/state/STATE.md` manually. Terra regenerates it after
  lifecycle changes.
- Luna may add task-local evidence and handoff records on its branch.

## PR lifecycle

Luna implements, validates, commits explicit files, pushes, and opens the PR.
Terra reviews the exact commit. Requested changes return to that Luna lane.
Terra merges approved work, validates the updated base, and creates the next
fresh Luna lane. Luna never merges its own PR.
