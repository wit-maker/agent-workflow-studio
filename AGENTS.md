# Agent Workflow Studio Agent Rules

## Model Gate

Before major implementation work, confirm the active model and compare it with
the recommended models:

- GPT-5.5 xhigh for architecture, risk, repository policy, and hard judgment.
- GPT-5.5 high for normal implementation, UI skeletons, typed models, docs, and
  review.

If the active model differs, record that fact in the work report and return
architecture-sensitive decisions to GPT-5.5 xhigh.

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
