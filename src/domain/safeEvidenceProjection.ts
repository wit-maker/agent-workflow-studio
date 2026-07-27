import type { RunTrace } from './runTrace'

export type SafeEvidenceProjectionState = 'no-trace' | 'covered' | 'attention'

export type SafeEvidenceProjection = {
  state: SafeEvidenceProjectionState
  coverageLabel: string
  coveragePercent: number
  evidenceCount: number
  coveredStepCount: number
  stepCount: number
  excludedEvidenceCount: number
  cue: string
  nextAction: string
  safetyNote: string
}

function countTraceEvidence(trace: RunTrace): number {
  return trace.runEvidence.length + trace.steps.reduce((total, step) => total + step.evidence.length, 0)
}

function hasStatus(trace: RunTrace, status: RunTrace['steps'][number]['status']): boolean {
  return trace.steps.some((step) => step.status === status)
}

/**
 * Derives a compact, metadata-only view for Run Detail.
 * Input evidence text is intentionally never copied into the projection.
 */
export function buildSafeEvidenceProjection(trace: RunTrace | null): SafeEvidenceProjection {
  if (!trace) {
    return {
      state: 'no-trace',
      coverageLabel: 'No safe run trace',
      coveragePercent: 0,
      evidenceCount: 0,
      coveredStepCount: 0,
      stepCount: 0,
      excludedEvidenceCount: 0,
      cue: 'Run an existing mock run to inspect safe evidence coverage.',
      nextAction: 'Run the workflow, then return to Run Detail.',
      safetyNote: 'Metadata-only MVP projection; raw inputs and bodies are excluded.',
    }
  }

  const evidenceCount = countTraceEvidence(trace)
  const coveredStepCount = trace.steps.filter((step) => step.evidence.length > 0).length
  const stepCount = trace.steps.length
  const coveragePercent = stepCount === 0 ? (evidenceCount > 0 ? 100 : 0) : Math.round((coveredStepCount / stepCount) * 100)
  const hasError = hasStatus(trace, 'failed') || trace.steps.some((step) => step.evidence.some((entry) => entry.severity === 'error'))
  const needsReview = hasStatus(trace, 'review_required')
  const hasRetry = hasStatus(trace, 'retry_ready') || trace.retryCandidateStepIds.length > 0
  const attention = hasError || needsReview || hasRetry || trace.excludedEvidenceCount > 0

  let cue = 'Safe evidence coverage is available for this mock run.'
  let nextAction = 'Review the safe step summaries and runtime metadata.'
  if (hasError) {
    cue = 'Failure evidence needs attention.'
    nextAction = 'Open the failed step and choose a safe retry or error-route action.'
  } else if (needsReview) {
    cue = 'A human review step is waiting.'
    nextAction = 'Open the review step and decide whether the mock route may continue.'
  } else if (hasRetry) {
    cue = 'A retry candidate is available.'
    nextAction = 'Inspect the retry candidate before running it again.'
  } else if (trace.excludedEvidenceCount > 0) {
    cue = 'Some evidence was excluded by the safe filter.'
    nextAction = 'Continue with the safe summaries; sensitive evidence is not available here.'
  }

  return {
    state: attention ? 'attention' : 'covered',
    coverageLabel: `${coveredStepCount}/${stepCount} steps covered`,
    coveragePercent,
    evidenceCount,
    coveredStepCount,
    stepCount,
    excludedEvidenceCount: trace.excludedEvidenceCount,
    cue,
    nextAction,
    safetyNote: 'Mock-safe metadata only; this is not durable V2 runtime infrastructure.',
  }
}
