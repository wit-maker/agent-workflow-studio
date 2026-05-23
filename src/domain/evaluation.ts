export type EvaluationStatus =
  | 'not_evaluated'
  | 'evaluating'
  | 'passed'
  | 'needs_review'
  | 'failed'

export type ReviewDecision =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revise_requested'
  | 'skipped'

export type RebuildStatus = 'pending' | 'running' | 'completed' | 'cancelled'

export type EvaluationCriterion = {
  id: string
  label: string
  description: string
  score: number
  maxScore: number
  passed: boolean
  note?: string
}

export type EvaluationResult = {
  id: string
  runId: string
  artifactId?: string
  status: EvaluationStatus
  totalScore: number
  maxScore: number
  criteria: EvaluationCriterion[]
  summary: string
  createdAt: string
}

export type HumanReviewState = {
  decision: ReviewDecision
  reviewer: string
  note?: string
  decidedAt?: string
}

export type RebuildRequest = {
  id: string
  sourceArtifactId?: string
  reason: string
  instruction: string
  createdAt: string
  status: RebuildStatus
}

export type ArtifactVersion = {
  id: string
  version: number
  sourceRunId: string
  content: string
  createdAt: string
  evaluationId?: string
  rebuildRequestId?: string
}
