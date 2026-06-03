# Codex Task: Five Pillar MVP Vertical Slice

Last updated: 2026-06-03

## Purpose

Close the open five-pillar MVP plan as a mock-only vertical slice.

The slice keeps these pillars connected at the same level:

- Scratch-like part operation.
- n8n-like mock connector automation.
- Workflow execution.
- Cognitive HUD attention guidance.
- Situation Assistant explanation output.

## Implemented Slice

The current app supports the thin end-to-end path:

```text
Parts palette / node selection
-> mock connector-ready workflow
-> Run / Run selected / Run from selected / Dry run / Validate
-> safe run trace and runtime audit metadata
-> Canvas HUD attention and selected node/edge HUD
-> Run Detail replay / diff / focused edge context
-> Situation Assistant briefing with text, voice script, avatar script, visual timeline, and human decision prompt
-> template save / load / duplicate / delete
```

## Flexibility Boundary

Stable contracts:

- Runtime audit records safe metadata only.
- Run Detail consumes derived view models.
- Edge HUD and runtime audit use stable node/edge ids.
- Situation Assistant output is derived from safe HUD / Run Detail / execution summaries.

Flexible internals:

- Visual wording and HUD density can change.
- Mock connector execution can grow as long as credential values are not stored or displayed.
- Runtime policy presets can add optional modes without replacing old modes.
- Assistant output channels can gain real renderers later, but the current schema remains mock-only.

## Safety Rules

- Do not store or display raw config, raw prompt, raw payload, artifact body, credential, token, password, or API key.
- Do not add a new localStorage key for this slice.
- Do not add backend/API calls, real AI calls, credential storage, external assets, or dependencies.
- Do not evaluate arbitrary user expressions. `expression` policy metadata is safe display only.

## Issue Alignment

| Issue | Current status |
|---|---|
| #31 | Concept layer correction is reflected in project/source/audit docs. |
| #34 | Canvas First / Game HUD shell is implemented. |
| #37 | Game HUD Canvas First completion plan is implemented as the current workspace shell. |
| #46 | Five-pillar MVP is complete as a mock-only vertical slice. |

## Remaining Non-Goals

These remain intentionally outside this MVP closure:

- Real external connector execution.
- Real AI API execution.
- Credential storage.
- Arbitrary expression evaluator.
- Generated audio, avatar rendering, or video rendering.
- Animated replay timeline.
- URL-level deep links.
- Durable notification read/ack/pin state.

## QA Checklist

Static:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Browser:

- Initial render.
- Canvas render.
- Palette toggle.
- Detail toggle.
- Console toggle.
- MiniMap toggle.
- Validate mode.
- Run.
- Run selected.
- Run from selected.
- Dry run.
- Selected node HUD.
- Selected edge HUD.
- Run Detail.
- Situation Assistant briefing generation.
- Voice / Avatar / Visual Timeline / Decision sections visible.
- Template save / load path available.
- No console errors.
- No external script/link/image requests.

Fallback:

- If file picker or download cannot be automated, validate import/export boundaries through direct code-path tests.
