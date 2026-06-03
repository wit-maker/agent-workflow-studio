# Codex Task: Five Pillar MVP Vertical Slice

Last updated: 2026-06-03

## Purpose

Record the current mock-only vertical slice for the five-pillar MVP plan.

This document does **not** close GitHub issues #31, #34, #37, or #46. Those issues are broad design epics. The slice below is an implementation foothold that proves several paths can connect safely, not evidence that the overall concept, UI system, Canvas First plan, or five-pillar MVP is finished.

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

This is a partial vertical slice. It should be used to guide the next slices, not to shrink the issue acceptance criteria to the current implementation.

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
| #31 | Open epic. Concept layer correction is partially reflected in project/source/audit docs, but the repo must continue treating Cognitive HUD and Situation Narration as full layers, not MVP panels. |
| #34 | Open epic. Canvas First / Game HUD shell foundation exists, but the full AI workflow operating workspace redesign remains ongoing. |
| #37 | Open epic. Current workspace shell implements several Canvas First requirements, but the full Game HUD completion plan requires more state-based HUD QA and interaction hardening. |
| #46 | Open epic. A mock-only vertical slice exists, but five-pillar parity is not complete. Each pillar still needs deeper behavior and QA. |

## Current Non-Goals

These were intentionally outside PR #47 and remain future issue scope, not deleted requirements:

- Real external connector execution.
- Real AI API execution.
- Credential storage.
- Arbitrary expression evaluator.
- Generated audio, avatar rendering, or video rendering.
- Animated replay timeline.
- URL-level deep links.
- Durable notification read/ack/pin state.

## Rechecked Plan Against Open Issues

Use #31, #34, #37, and #46 as active constraints for future work:

1. Keep #31 as the concept guardrail. Every new HUD, briefing, Run Detail, or assistant feature must state whether it is a final layer, an MVP surface, or a safe projection.
2. Advance #34 and #37 through state-based Canvas First slices: failure, review required, validation warning, high cost, delay, bottleneck, and safe route replay should change the canvas/HUD behavior, not only add panels.
3. Advance #46 through connected vertical slices. Each slice should touch the smallest necessary path across part operation, mock connector/runtime, HUD attention, safe audit, assistant explanation, and template/history when relevant.
4. Keep flexibility by adding optional safe metadata and pure view-model helpers before UI wiring. Do not replace stable run history or workflow fields without compatibility.
5. Keep raw data out of every HUD, audit, copy summary, assistant output, and comparison view.

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
