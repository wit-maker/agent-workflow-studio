export type ExecutionStepStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'review_required'
  | 'skipped'
  | 'retry_ready'

export type ExecutionRouteKind =
  | 'main'
  | 'error'
  | 'retry'
  | 'review'
  | 'skip'

export type ExecutionStep = {
  id: string
  runId: string
  nodeId: string
  nodeTitle: string
  status: ExecutionStepStatus
  route: ExecutionRouteKind
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  message?: string
  error?: string
  retryOfStepId?: string
}

export type ExecutionRoute = {
  id: string
  kind: ExecutionRouteKind
  fromNodeId: string
  toNodeId?: string
  reason: string
  createdAt: string
}

export type ExecutionGraph = {
  runId: string
  steps: ExecutionStep[]
  routes: ExecutionRoute[]
  activeStepId?: string
  failedStepId?: string
  reviewStepId?: string
  retryCandidates: string[]
}

export function createEmptyExecutionGraph(runId: string): ExecutionGraph {
  return {
    runId,
    steps: [],
    routes: [],
    retryCandidates: [],
  }
}
