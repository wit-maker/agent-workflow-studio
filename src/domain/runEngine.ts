import { calculateBottleneck } from './connectionRules'
import type { CheckOutcome, MockNodeExecution } from './nodeExecutors'
import type { PlannedRun } from './runPlanner'
import type { WorkflowArtifact, WorkflowMetric, WorkflowNode } from './workflow'

export type RunEngineSummary = {
  artifact: WorkflowArtifact
  metrics: WorkflowMetric
  retryCount: number
  reviewPending: boolean
  failedNodeTitle?: string
}

function getStepDuration(node: WorkflowNode, attempt = 0): number {
  const base = Math.max(120, Math.round((node.metrics?.estimatedLatencyMs ?? 600) / 4))
  return base + attempt * 90
}

export function buildRunMetrics(
  workflowNodeCount: number,
  executedNodes: WorkflowNode[],
  outcome: CheckOutcome,
  retryCount: number,
): WorkflowMetric {
  const bottleneck = calculateBottleneck(executedNodes)

  return {
    tokens: executedNodes.reduce(
      (total, node) => total + (node.metrics?.estimatedTokens ?? 0),
      0,
    ),
    cost: executedNodes.reduce(
      (total, node) => total + (node.metrics?.estimatedCost ?? 0),
      0,
    ),
    latencyMs: executedNodes.reduce((total, node) => total + getStepDuration(node), 0),
    successRate: outcome === 'FAIL' ? 54 : outcome === 'REVIEW' ? 78 : 100,
    queueCount: Math.max(workflowNodeCount - executedNodes.length, 0),
    retryCount,
    bottleneckNodeId: bottleneck?.id ?? null,
  }
}

export function buildRunArtifact(options: {
  plan: PlannedRun
  outcome: CheckOutcome
  executedNodes: WorkflowNode[]
  decisions: MockNodeExecution[]
  failedNodeTitle?: string
}): WorkflowArtifact {
  const retryCount = options.decisions.filter((decision) => decision.retryCandidate).length
  const reviewPending = options.decisions.some((decision) => decision.result === 'review_required')
  const bottleneck = calculateBottleneck(options.executedNodes)

  return {
    title:
      options.plan.validateOnly
        ? 'Dry Run Validation Summary'
        : options.outcome === 'FAIL'
          ? 'Local Run Failed Summary'
          : options.outcome === 'REVIEW'
            ? 'Local Run Review Summary'
            : 'Local Run Artifact',
    format: 'Markdown',
    status:
      options.outcome === 'FAIL'
        ? 'failed'
        : reviewPending
          ? 'review_required'
          : 'checked',
    content: [
      '# Local workflow run summary',
      '',
      `- mode: ${options.plan.mode}`,
      `- validateOnly: ${options.plan.validateOnly ? 'yes' : 'no'}`,
      `- outcome: ${options.outcome}`,
      `- plannedNodes: ${options.plan.nodes.length}`,
      `- executedNodes: ${options.executedNodes.length}`,
      `- reviewRequired: ${reviewPending ? 'yes' : 'no'}`,
      `- retryCandidates: ${retryCount}`,
      `- failedNode: ${options.failedNodeTitle ?? 'none'}`,
      `- bottleneckNode: ${bottleneck?.title ?? 'none'}`,
      '',
      'No real API calls were made. Codex, Hermes, Grok, and other adapters remain disconnected.',
    ].join('\n'),
  }
}
