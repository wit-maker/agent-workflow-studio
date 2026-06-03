import { sanitizeConnectorText } from './connectorSafety'
import { reviewDecisionLabels } from './displayLabels'
import type { HumanReviewState, ReviewDecision } from './evaluation'

export type ReviewDecisionPersistenceMode = 'session_only'

export type ReviewDecisionAuditBoundaryView = {
  decision: ReviewDecision
  decisionLabel: string
  reviewerLabel: string
  decidedAtLabel: string
  hasNote: boolean
  noteSummary: string
  noteIncludedInSafeSummary: boolean
  persistenceMode: ReviewDecisionPersistenceMode
  persistenceLabel: string
  durableBoundaryLabel: string
  safeAuditSummary: string
  safeCopySummary: string
}

function formatDecidedAt(value: string | undefined): string {
  if (!value) return 'time n/a'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'time n/a'
  return new Date(timestamp).toLocaleString('ja-JP')
}

function sanitizeReviewText(value: string | undefined, emptyLabel: string): {
  text: string
  included: boolean
} {
  if (!value) {
    return { text: emptyLabel, included: false }
  }
  const sanitized = sanitizeConnectorText(value)
  if (!sanitized || sanitized === '[redacted]') {
    return { text: 'sensitive note excluded', included: false }
  }
  return { text: sanitized.length > 120 ? `${sanitized.slice(0, 119)}...` : sanitized, included: true }
}

export function buildReviewDecisionAuditBoundaryView(options: {
  humanReview: HumanReviewState | undefined
  runId?: string | null
}): ReviewDecisionAuditBoundaryView {
  const decision = options.humanReview?.decision ?? 'pending'
  const reviewer = sanitizeReviewText(options.humanReview?.reviewer, 'reviewer n/a')
  const note = sanitizeReviewText(options.humanReview?.note, 'note none')
  const decidedAtLabel = formatDecidedAt(options.humanReview?.decidedAt)
  const runLabel = options.runId ? `run ${options.runId}` : 'run n/a'
  const decisionLabel = reviewDecisionLabels[decision]

  const safeAuditSummary = [
    `review decision: ${decisionLabel}`,
    `persistence: session only`,
    runLabel,
    `reviewer: ${reviewer.text}`,
    `note: ${note.text}`,
    `decidedAt: ${decidedAtLabel}`,
  ].join(' / ')

  return {
    decision,
    decisionLabel,
    reviewerLabel: reviewer.text,
    decidedAtLabel,
    hasNote: Boolean(options.humanReview?.note),
    noteSummary: note.text,
    noteIncludedInSafeSummary: note.included,
    persistenceMode: 'session_only',
    persistenceLabel: '現在はセッション内のみ',
    durableBoundaryLabel: '永続化する場合は既存 run history record 内の safe metadata に限定',
    safeAuditSummary,
    safeCopySummary: [
      `review decision: ${decisionLabel}`,
      `persistence: session only`,
      runLabel,
      `reviewer: ${reviewer.text}`,
      `note: ${note.text}`,
    ].join('\n'),
  }
}
