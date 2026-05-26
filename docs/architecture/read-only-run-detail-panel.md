# Read-only Run Detail Panel

Last updated: 2026-05-26

## Purpose

This document describes the read-only Run Detail panel added as a UI foundation phase.

The panel lets the user inspect safe, step-level evidence from the current run without any persistence, replay, or real adapter work.

## Data Source

- `buildRunTrace({ workflow, executionGraph, connectorJobs, runHistoryRecords })` — pure function, called via `useMemo` in `AppShell.tsx`
- `summarizeRunDetail(runTrace, mode)` — called inside `RunDetailPanel.tsx` on each mode change
- Both functions operate on in-memory runtime state only. No localStorage read or write is added.

## What Is Displayed

| Field | Source |
|---|---|
| Run ID | `RunTrace.runId` |
| Step count | `RunDetailSummary.stepCount` |
| Evidence count | `RunDetailSummary.evidenceCount` |
| Excluded evidence count | `RunDetailSummary.excludedEvidenceCount` |
| Safety warnings | `RunDetailSummary.safetyWarnings` |
| Briefing-referenced evidence count | `RunDetailSummary.selectedEvidence.length` |
| Grouped step evidence | `RunDetailSummary.stepEvidence[]` |
| Evidence kinds per step | `StepEvidenceSummary.evidenceKinds` |
| Highest severity per step | `StepEvidenceSummary.highestSeverity` |
| Sanitized evidence entries | `StepEvidenceSummary.entries` (strings produced by `formatEvidenceSummary`) |
| Step status | `StepEvidenceSummary.status` |
| Node title | `StepEvidenceSummary.nodeTitle` |

Display modes: `all` / `latest-run` / `errors-only` — matching `RunDetailMode` in `runDetail.ts`.

## What Is Not Displayed

| Excluded item | Reason |
|---|---|
| `node.config` free text | Excluded at evidence collection time in `runTrace.ts` |
| Full prompt body | Not collected into `RunStepEvidence` |
| Raw provider request/response payload | Not collected into `RunStepEvidence` |
| Credential values | Filtered by `containsConnectorSensitiveKeyword` in `makeRunStepEvidence` |
| Raw log payload (`WorkflowRunLog.payload`) | Not mapped into evidence summaries |
| Full artifact content | Only format/status/title enter `artifact_summary` evidence |
| `safetyLevel` internal field | Internal domain detail; not useful to display in UI |

All evidence text is sanitized to 240 characters and filtered for credential-like keywords before it reaches the panel.

## Relationship to Credential Safety Boundary

This panel follows `docs/architecture/credential-safety-boundary.md`.

- No credential value can appear in the panel because `RunStepEvidence.summary` and `.title` are produced by `sanitizeEvidenceText`, which calls `containsConnectorSensitiveKeyword` and truncates at 240 characters.
- `excludedEvidenceCount` is shown so the user can see that filtering happened.
- `safetyWarnings` are shown when any evidence was excluded.

## Relationship to Situation Assistant

The Briefing tab (Situation Assistant) and the Run Detail tab are related by shared evidence origin but not by direct navigation:

- The Briefing tab footer shows the total available step evidence count from `runTrace`, with a reference to the Run Detail tab.
- The Run Detail panel header shows `selectedEvidence.length`, which is the count of evidence items that entered the briefing prompt.
- There is no routing, deep linking, or id-based navigation between the two panels in this phase.

## What Remains Future Work

- Deep linking: clicking an evidence item in briefing output to jump to the matching step in Run Detail
- Run trace persistence: currently derived from runtime state only, lost on reload
- Per-step navigation from Cognitive HUD focus target
- Real adapter evidence: currently all evidence comes from mock execution paths; real adapter sanitized evidence can enter the same `RunStepEvidence` boundary once credential resolution exists
- Evidence filtering UI: date range, kind filter, severity filter

## File Map

| File | Role |
|---|---|
| `src/domain/runStepEvidence.ts` | `RunStepEvidence` type, `makeRunStepEvidence`, `sanitizeEvidenceText` |
| `src/domain/runTrace.ts` | `RunTrace`, `buildRunTrace` |
| `src/domain/runDetail.ts` | `RunDetailSummary`, `summarizeRunDetail` |
| `src/components/RunDetailPanel.tsx` | Read-only UI panel |
| `src/components/BottomMonitor.tsx` | Tab host; passes `runTrace` to `RunDetailPanel` |
| `src/components/AppShell.tsx` | `useMemo` for `runTrace`; passes to `BottomMonitor` |
| `src/storage/localAppSettings.ts` | `RunDetail` added to `VALID_MONITOR_TABS` |
