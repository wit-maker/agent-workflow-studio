import { containsConnectorSensitiveKeyword } from './connectorSafety'

export type EvidenceKind =
  | 'node_status'
  | 'connector_job'
  | 'connector_error'
  | 'metric'
  | 'log_entry'
  | 'human_review'
  | 'artifact_summary'
  | 'safety_gate'
  | 'retry_event'

export type EvidenceSafetyLevel =
  | 'safe_summary'
  | 'sanitized_summary'
  | 'excluded_sensitive'

export type EvidenceSeverity = 'info' | 'warn' | 'error'

export type RunStepEvidence = {
  id: string
  runId: string
  stepId?: string
  nodeId?: string
  kind: EvidenceKind
  safetyLevel: EvidenceSafetyLevel
  severity: EvidenceSeverity
  title: string
  summary: string
  createdAt?: string
  sourceRef?: string
}

export type CreateRunStepEvidenceInput = {
  id: string
  runId: string
  stepId?: string
  nodeId?: string
  kind: EvidenceKind
  severity?: EvidenceSeverity
  title: string
  summary: string
  createdAt?: string
  sourceRef?: string
}

const MAX_EVIDENCE_TEXT_LENGTH = 240

export function sanitizeEvidenceText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length === 0) {
    return null
  }

  if (containsConnectorSensitiveKeyword(normalized)) {
    return null
  }

  return normalized.length > MAX_EVIDENCE_TEXT_LENGTH
    ? `${normalized.slice(0, MAX_EVIDENCE_TEXT_LENGTH - 1)}...`
    : normalized
}

export function makeRunStepEvidence(
  input: CreateRunStepEvidenceInput,
): RunStepEvidence | null {
  const title = sanitizeEvidenceText(input.title)
  const summary = sanitizeEvidenceText(input.summary)

  if (!title || !summary) {
    return null
  }

  return {
    id: input.id,
    runId: input.runId,
    stepId: input.stepId,
    nodeId: input.nodeId,
    kind: input.kind,
    safetyLevel: title === input.title && summary === input.summary ? 'safe_summary' : 'sanitized_summary',
    severity: input.severity ?? 'info',
    title,
    summary,
    createdAt: input.createdAt,
    sourceRef: input.sourceRef,
  }
}

export function formatEvidenceSummary(evidence: RunStepEvidence): string {
  return `${evidence.kind} / ${evidence.severity}: ${evidence.title} - ${evidence.summary}`
}
