# Run Trace and Step Evidence Foundation

Last updated: 2026-05-26

## Purpose

This document defines the run / step evidence foundation used by Situation Assistant briefing before SA-2 or real connector adapters are implemented.

This phase does not add real AI API calls, credential input UI, new persistence, trace storage, Tauri, SQLite, or briefing history. It only adds credential-safe derived domain structures that can explain the current workflow situation with better evidence.

## Run History vs Run Trace

Run History is the durable, localStorage-backed summary of completed runs.

Run History stores only aggregate metadata:

- run id
- workflow id and title
- run mode and status
- start / finish / duration
- node and connection counts
- log / error / warning counts
- optional artifact id

Run Trace is the current, derived execution detail model.

Run Trace is built from in-memory workflow state, execution graph, connector jobs, logs, and run history summaries. It is not persisted in this phase. It is safe to rebuild at any time from current runtime state.

## Step Evidence

Step Evidence is a compact, credential-safe explanation unit attached to a run or a step.

Supported `EvidenceKind` values:

- `node_status`
- `connector_job`
- `connector_error`
- `metric`
- `log_entry`
- `human_review`
- `artifact_summary`
- `safety_gate`
- `retry_event`

Evidence exists to answer:

- what step changed
- why it matters
- whether it is error / warning / info
- which run or step it belongs to
- whether it is safe to pass into briefing input

## Allowed Briefing Input

The briefing input may receive:

- workflow id, name, status, node count, connection count
- node status summaries
- execution step status summaries
- connector job status summaries
- sanitized connector error summaries
- retry candidate summaries
- review_required evidence summaries
- HUD summaries and selected signals
- run history aggregates
- metrics aggregates
- artifact title / format / status summary
- safety warning counts and exclusion counts

## Forbidden Briefing Input

The briefing input must not receive:

- credential values
- API keys
- bearer tokens
- passwords
- secrets
- auth headers
- raw provider request payloads
- raw provider response payloads
- full prompt body
- full artifact content
- `node.config` free text
- unfiltered log payloads
- arbitrary exception objects

Evidence collection must skip or sanitize any string that looks credential-like before it reaches the briefing prompt or UI.

## Credential Boundary Relationship

This foundation follows `docs/architecture/credential-safety-boundary.md`.

Credential values are not normal app data. `RunTrace`, `RunStepEvidence`, `RunDetailSummary`, and `BriefingInput` may carry safe metadata and summaries only. They must not carry credential values or provider auth material.

If a future step evidence source needs credentials to fetch details, the fetch must happen inside the secure credential boundary and return only sanitized evidence summaries.

## Connector Adapter Boundary Relationship

This foundation follows `docs/architecture/real-connector-adapter-design.md`.

Real adapters remain disabled unless readiness allows real execution. Adapter request and error contracts must return sanitized summaries only. `ConnectorError.details` and `ConnectorRequest.metadata` must not become raw evidence stores.

Step Evidence may refer to:

- connector id
- connector label
- job id suffix or safe source reference
- safe status
- sanitized error code / message

Step Evidence must not include:

- provider payload
- provider headers
- credential values
- raw CLI output that has not been sanitized

## SA-2 Direction

SA-2 can build on this foundation by:

- using `RunTrace` as the evidence source
- letting the briefing adapter receive `RunDetailSummary`
- linking What / Why / How / Next statements back to step evidence
- adding a run detail view without changing Run History schema
- adding real adapter evidence only after credential-safe resolution exists

SA-2 should still keep the mock path available and should not require real AI connection to explain local workflow state.

## Browser QA Checklist

Before merging a phase that uses this foundation, verify:

1. App loads without runtime errors.
2. Briefing tab still opens.
3. Mock briefing can be generated.
4. Failed run path changes briefing severity or content.
5. review_required path changes briefing severity or content.
6. Step evidence appears in generated mock content through safe summaries.
7. Credential-like strings do not appear in briefing UI.
8. Credential-like strings do not appear in browser console.
9. Credential-like strings do not appear in localStorage.
10. Connector readiness display still works.
11. No network request is made to a real AI API.
12. Reload does not crash.

## Non-Goals

- no real AI API integration
- no API key input UI
- no credential persistence
- no prompt body persistence
- no raw provider payload storage
- no new Run History schema
- no briefing persistence
- no Tauri
- no SQLite
- no SA-2 real adapter implementation
