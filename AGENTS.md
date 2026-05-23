# Agent Workflow Studio Agent Rules

## Model Gate

Before implementation work, confirm the active model and choose the lowest-cost
model that is sufficient for the risk and scope of the task.

- GPT-5.5 xhigh:
  - Architecture changes.
  - Specification contradiction adjudication.
  - Security, Credential, or dangerous Git operations.
  - Large refactor decisions.
- GPT-5.5 high / GPT-5.4 high:
  - Normal React/TypeScript implementation.
  - State management.
  - Type design.
  - Specification alignment.
  - Multi-file changes.
- GPT-5.4 medium / GPT-5.4 high:
  - UI component additions.
  - Normal Inspector, Canvas, BottomMonitor, or StagePreview changes.
  - localStorage mocks.
  - JSON import/export improvements.
- GPT-5.4 mini low / medium, or available GPT-5.2 / GPT-5.3 models:
  - Documentation edits.
  - Lint fixes.
  - CSS fine tuning.
  - Copy updates.
  - Small display improvements.

Do not stop only because the current model differs from the recommended model.
Stop only when the model is insufficient for the actual task risk. If the model
is insufficient, report:

```text
モデル変更が必要です。
```

If the user explicitly permits continuing with an otherwise insufficient model,
record that override in `PROJECT_STATE.md` before continuing.

## Repository Separation

This repository is `agent-workflow-studio`. Do not clone, edit, copy from, push
to, or otherwise operate on the existing `ai-workflow-lab` repository during
this project.

## Branch And Git Rules

- Direct work on `main` is allowed only for the first bootstrap commit.
- After bootstrap, use `feature/*` or `fix/*` branches.
- Do not use `git add .`.
- Always inspect `git status` before and after work.
- Review `git diff --stat` before committing.

## Secrets And External Services

- Do not commit `.env`, API keys, credentials, tokens, or local secret files.
- Do not log secrets.
- Do not connect to real external APIs without explicit approval.
- External AI and connector integrations must remain mocked during bootstrap.

## Quality Gate

After implementation, run:

```bash
npm run build
npm run lint
```

If either command cannot be run, record the reason in `PROJECT_STATE.md` and in
the final report.

## Specification Handling

The files in `docs/source-specs/` are authoritative source materials. Do not
silently replace them with generic workflow-app assumptions, and do not rewrite
their original text.
