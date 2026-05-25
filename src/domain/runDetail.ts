import type { RunStep, RunTrace } from './runTrace'
import {
  formatEvidenceSummary,
  type EvidenceKind,
  type EvidenceSeverity,
  type RunStepEvidence,
} from './runStepEvidence'

export type RunDetailMode = 'all' | 'latest-run' | 'errors-only'

export type StepEvidenceSummary = {
  runId: string
  stepId?: string
  nodeId?: string
  nodeTitle?: string
  status?: RunStep['status']
  evidenceCount: number
  evidenceKinds: EvidenceKind[]
  highestSeverity: EvidenceSeverity
  entries: string[]
}

export type RunDetailSummary = {
  runId: string | null
  stepCount: number
  evidenceCount: number
  excludedEvidenceCount: number
  safetyWarnings: string[]
  stepEvidence: StepEvidenceSummary[]
  selectedEvidence: string[]
}

function severityRank(severity: EvidenceSeverity): number {
  switch (severity) {
    case 'error':
      return 2
    case 'warn':
      return 1
    case 'info':
      return 0
  }
}

function maxSeverity(entries: readonly RunStepEvidence[]): EvidenceSeverity {
  return entries.reduce<EvidenceSeverity>(
    (current, evidence) =>
      severityRank(evidence.severity) > severityRank(current) ? evidence.severity : current,
    'info',
  )
}

function uniqueEvidenceKinds(entries: readonly RunStepEvidence[]): EvidenceKind[] {
  return Array.from(new Set(entries.map((entry) => entry.kind)))
}

function isImportantEvidence(evidence: RunStepEvidence): boolean {
  return (
    evidence.severity !== 'info' ||
    evidence.kind === 'connector_error' ||
    evidence.kind === 'human_review' ||
    evidence.kind === 'retry_event' ||
    evidence.kind === 'safety_gate'
  )
}

function filterEvidenceForMode(
  entries: readonly RunStepEvidence[],
  mode: RunDetailMode,
): RunStepEvidence[] {
  if (mode === 'errors-only') {
    return entries.filter(isImportantEvidence)
  }

  if (mode === 'latest-run') {
    return entries.filter((entry) => entry.kind !== 'metric' || entry.severity !== 'info')
  }

  return [...entries]
}

function summarizeStepEvidence(step: RunStep, mode: RunDetailMode): StepEvidenceSummary | null {
  const entries = filterEvidenceForMode(step.evidence, mode)
  if (entries.length === 0) {
    return null
  }

  return {
    runId: step.runId,
    stepId: step.id,
    nodeId: step.nodeId,
    nodeTitle: step.nodeTitle,
    status: step.status,
    evidenceCount: entries.length,
    evidenceKinds: uniqueEvidenceKinds(entries),
    highestSeverity: maxSeverity(entries),
    entries: entries.map(formatEvidenceSummary),
  }
}

function summarizeRunLevelEvidence(
  trace: RunTrace,
  mode: RunDetailMode,
): StepEvidenceSummary | null {
  const entries = filterEvidenceForMode(trace.runEvidence, mode)
  if (entries.length === 0) {
    return null
  }

  return {
    runId: trace.runId,
    evidenceCount: entries.length,
    evidenceKinds: uniqueEvidenceKinds(entries),
    highestSeverity: maxSeverity(entries),
    entries: entries.map(formatEvidenceSummary),
  }
}

export function summarizeRunDetail(
  trace: RunTrace | null,
  mode: RunDetailMode,
): RunDetailSummary {
  if (!trace) {
    return {
      runId: null,
      stepCount: 0,
      evidenceCount: 0,
      excludedEvidenceCount: 0,
      safetyWarnings: [],
      stepEvidence: [],
      selectedEvidence: [],
    }
  }

  const stepEvidence = trace.steps
    .map((step) => summarizeStepEvidence(step, mode))
    .filter((summary): summary is StepEvidenceSummary => summary !== null)

  const runLevelSummary = summarizeRunLevelEvidence(trace, mode)
  const summaries = runLevelSummary ? [runLevelSummary, ...stepEvidence] : stepEvidence
  const selectedEvidence = summaries
    .flatMap((summary) => summary.entries)
    .slice(-16)

  return {
    runId: trace.runId,
    stepCount: trace.steps.length,
    evidenceCount:
      trace.runEvidence.length +
      trace.steps.reduce((total, step) => total + step.evidence.length, 0),
    excludedEvidenceCount: trace.excludedEvidenceCount,
    safetyWarnings: trace.safetyWarnings,
    stepEvidence: summaries.slice(-12),
    selectedEvidence,
  }
}
