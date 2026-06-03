import type { ExecutionRouteKind } from './executionGraph'
import type { WorkflowNode, WorkflowNodeStatus } from './workflow'
import type { RunMode } from './runPlanner'

export type CheckOutcome = 'PASS' | 'REVIEW' | 'FAIL'

export type MockNodeExecution = {
  route: ExecutionRouteKind
  result: 'success' | 'review_required' | 'failed' | 'skipped'
  status: Extract<WorkflowNodeStatus, 'success' | 'review_required' | 'failed' | 'skipped'>
  retryCandidate: boolean
  message: string
}

export function executeMockNode(
  node: WorkflowNode,
  outcome: CheckOutcome,
  mode: RunMode,
): MockNodeExecution {
  if (mode === 'dryRun' || mode === 'validate') {
    return {
      route: 'skip',
      result: 'skipped',
      status: 'skipped',
      retryCandidate: false,
      message:
        mode === 'validate'
          ? `${node.title} passed validate mode without execution.`
          : `${node.title} validated without execution.`,
    }
  }

  if (node.type === 'check' && outcome === 'FAIL') {
    return {
      route: 'error',
      result: 'failed',
      status: 'failed',
      retryCandidate: true,
      message: `${node.title} failed local mock checks.`,
    }
  }

  if (node.type === 'check' && outcome === 'REVIEW') {
    return {
      route: 'review',
      result: 'review_required',
      status: 'review_required',
      retryCandidate: false,
      message: `${node.title} requires human review.`,
    }
  }

  return {
    route: 'main',
    result: 'success',
    status: 'success',
    retryCandidate: false,
    message: `${node.title} completed in local mock mode.`,
  }
}
