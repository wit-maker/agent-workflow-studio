# Task Records

This directory keeps Codex task prompts, handoff notes, and records of completed or partial implementation slices.

It is not the current plan selector.

Use `docs/project/ACTIVE_PLAN.md` first when deciding what to implement next. A task file becomes active only when `ACTIVE_PLAN.md` explicitly points to it or the user explicitly selects it.

## Rules

- Keep old task files as historical records unless they contain unsafe or misleading instructions that need correction.
- Do not treat a `Next recommended phase` section in an old task file as newer than `docs/project/ACTIVE_PLAN.md`.
- Do not edit GitHub issue state from task-record cleanup unless the user explicitly asks.
- Keep raw config, prompt body, payload body, artifact body, credential, token, password, and API key out of task summaries and copy text.

