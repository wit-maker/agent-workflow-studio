# Concept Checklist

Last updated: 2026-06-03

## Purpose

This checklist turns `docs/project/concept-layer-correction.md` into a small review gate for future implementation, docs, QA, and PR work.

Use it before describing a new surface as Cognitive HUD, Situation Narration Layer, Situation Assistant, Upload Labs-style observability, n8n-style automation, or Scratch-style operation.

The goal is not to block small MVP slices. The goal is to make every slice state what it actually is, what it is not, and which full-product layer it safely projects.

## Required Classification

Every non-trivial UI, domain, audit, runtime, or documentation change touching these concepts should classify the changed surface as one of the following:

| Classification | Meaning | Allowed wording |
|---|---|---|
| Final layer | The change implements a durable part of the target layer, not just a display stub. | "implements part of the Cognitive HUD attention layer" |
| MVP surface | The change is a useful current UI or data surface, but it is not the whole concept. | "minimum output channel", "MVP display surface", "provisional detail surface" |
| Safe projection | The change shows or copies derived metadata from a deeper concept without exposing raw data or claiming full execution semantics. | "safe route metadata projection", "safe audit summary" |
| Detail/history surface | The change helps inspect records, logs, or comparisons, but does not become the main HUD or assistant layer. | "Run Detail view", "audit comparison surface" |
| Out of scope | The change intentionally does not implement this concept yet. | "not an animated replay engine", "not a real connector" |

## Concept Guardrail Questions

Answer these in the plan, PR body, or `PROJECT_STATE.md` entry when the change touches the relevant area.

1. Is this a final layer, MVP surface, safe projection, detail/history surface, or explicitly out of scope?
2. If it mentions Cognitive HUD, does it improve attention allocation rather than adding a static panel?
3. If it mentions Situation Assistant, does it avoid shrinking the assistant to a text briefing tab?
4. If it mentions Situation Narration Layer, does it preserve the past / present / future explanation direction?
5. If it mentions voice, avatar, or video, does it treat them as output channels rather than the essence of the assistant?
6. If it mentions Upload Labs-style behavior, does it address flow, pressure, bottleneck, latency, cost, or route state rather than only metrics text?
7. If it mentions n8n-style behavior, does it address automation route semantics rather than only connected node visuals?
8. If it mentions Scratch-style behavior, does it improve direct manipulation of small reusable parts rather than only playful styling?
9. Does the surface avoid raw config, prompt, payload, artifact body, credential, token, password, and API key exposure?
10. Does the change preserve mock-only boundaries, existing localStorage keys, and adapter boundaries?

## PR / Final Report Snippet

Use this short form when a full checklist would be too heavy:

```text
Concept checklist:
- Classification: MVP surface / safe projection / final layer / detail-history / out of scope
- Cognitive HUD claim: yes/no, and why it is or is not attention allocation
- Situation Assistant claim: yes/no, and why it is not only a text briefing tab
- Safety: raw config/prompt/payload/credential not displayed, stored, or copied
- Persistence/API: no new localStorage key, backend/API, credential storage, or dependency
```

## Common Corrections

Use these replacements when a doc or PR overstates a slice.

| Overstated phrase | Safer replacement |
|---|---|
| "Cognitive HUD is implemented" | "A Cognitive HUD MVP surface / safe projection is implemented" |
| "Situation Assistant is implemented" | "A minimum Situation Assistant output channel is implemented" |
| "Run Detail replay is complete" | "Run Detail can inspect safe snapshots / metadata; animated replay remains out of scope" |
| "Edge runtime policy is implemented" | "Safe policy metadata and fixed mock evaluation are visible; full runtime enforcement remains out of scope" |
| "Connector support exists" | "Mock connector boundary exists; real connector/API behavior remains out of scope" |

## Completion Signal

A slice passes this checklist when a reviewer can tell:

- what layer the change belongs to,
- whether it is final, MVP, safe projection, detail/history, or out of scope,
- what full-product behavior is still missing,
- why no raw data or credential-like value is exposed,
- why the change does not add forbidden persistence, API, dependency, or credential behavior.
