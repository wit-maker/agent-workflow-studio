# Codex Task: Runtime Audit Integration Captain

## Repository

```text
C:\dev\github\wit-maker\agent-workflow-studio
```

## Branch

```text
codex/runtime-audit-integration-captain
```

## Base

```text
codex/runtime-audit-integration-base
```

## Model Gate

Use:

```text
GPT-5.5 high
```

ALLOW_XHIGH is not present. Do not propose or continue xhigh.

## Start Checks

Run before editing:

```powershell
git rev-parse HEAD
git branch --show-current
git status --short
```

Expected branch:

```text
codex/runtime-audit-integration-captain
```

If this worktree is dirty before you start, do not implement. Report the diff owner first.

## Goal

Create the Integration Captain documentation for the Runtime Audit parallel worktree phase. This is a documentation and coordination PR only.

## Allowed Files

```text
docs/implementation/runtime-audit-integration-plan.md
docs/tasks/Codex_Task_Runtime_Audit_Integration_Captain.md
```

## Forbidden Files

```text
src/**
PROJECT_STATE.md
docs/source-specs/**
package.json
package-lock.json
vite.config.*
tsconfig*.json
```

## Required Content

Document all of the following:

- Integration base branch setup.
- Worktree safety rules.
- Model gate: GPT-5.5 high, no xhigh without ALLOW_XHIGH.
- PR merge order.
- Lane file ownership.
- PR acceptance criteria.
- Per-merge validation.
- Final static validation.
- Final Browser QA.
- JSON import/export fallback validation when Browser cannot use downloads or file pickers.
- Stop conditions for dirty worktrees, file boundary violations, unsafe raw data, new localStorage keys, real API/AI/credential behavior, and validation failures.

## Safety Constraints

Do not:

- Edit implementation files.
- Edit source specs.
- Add dependencies.
- Add backend/API behavior.
- Add credential storage.
- Add localStorage keys.
- Use reset, rebase, or force overwrite.

## Validation

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Vite chunk-size warning is acceptable if there are no TypeScript, lint, build, or runtime errors.

## Pull Request

After validation passes:

1. Stage only the allowed documentation files.
2. Commit with:

```text
docs: add runtime audit integration captain plan
```

3. Push the branch.
4. Open a draft PR against:

```text
codex/runtime-audit-integration-base
```

PR body must include:

- Changed files.
- Validation results.
- Browser QA: not applicable for docs-only PR.
- Raw data safety statement.
- Storage statement confirming no new localStorage key.
