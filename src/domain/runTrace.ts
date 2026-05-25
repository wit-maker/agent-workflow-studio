import type { ConnectorJob } from './connectorQueue'
import type { ExecutionGraph, ExecutionStep, ExecutionStepStatus } from './executionGraph'
import type { WorkflowRunRecord } from './runHistory'
import type { Workflow, WorkflowNode, WorkflowRunLog, WorkflowStatus } from './workflow'
import {
  makeRunStepEvidence,
  type EvidenceSeverity,
  type RunStepEvidence,
} from './runStepEvidence'

export type RunStep = {
  id: string
  runId: string
  nodeId: string
  nodeTitle: string
  status: ExecutionStepStatus
  route: ExecutionStep['route']
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  evidence: RunStepEvidence[]
}

export type RunTrace = {
  runId: string
  workflowId: string
  workflowName: string
  status: WorkflowStatus
  startedAt?: string
  finishedAt?: string
  steps: RunStep[]
  runEvidence: RunStepEvidence[]
  retryCandidateStepIds: string[]
  safetyWarnings: string[]
  excludedEvidenceCount: number
}

export type BuildRunTraceInput = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: readonly ConnectorJob[]
  runHistoryRecords: readonly WorkflowRunRecord[]
}

function selectActiveRunId(input: BuildRunTraceInput): string {
  return (
    input.executionGraph?.runId ??
    input.workflow.logs[input.workflow.logs.length - 1]?.runId ??
    input.runHistoryRecords[input.runHistoryRecords.length - 1]?.runId ??
    `workflow-${input.workflow.id}`
  )
}

function severityFromStepStatus(status: ExecutionStepStatus): EvidenceSeverity {
  if (status === 'failed') return 'error'
  if (status === 'review_required' || status === 'retry_ready') return 'warn'
  return 'info'
}

function severityFromLogLevel(level: WorkflowRunLog['level']): EvidenceSeverity {
  if (level === 'error') return 'error'
  if (level === 'warn' || level === 'security' || level === 'approval') return 'warn'
  return 'info'
}

function severityFromConnectorStatus(status: ConnectorJob['status']): EvidenceSeverity {
  if (status === 'failed') return 'error'
  if (status === 'review_required') return 'warn'
  return 'info'
}

function mapNodeStatusToStepStatus(status: WorkflowNode['status']): ExecutionStepStatus {
  switch (status) {
    case 'queued':
    case 'running':
    case 'success':
    case 'failed':
    case 'review_required':
    case 'skipped':
    case 'retry_ready':
      return status
    case 'idle':
      return 'queued'
    case 'blocked':
    case 'cancelled':
      return 'skipped'
  }
}

function createStepFromExecutionStep(step: ExecutionStep): RunStep {
  const evidence: RunStepEvidence[] = []

  const statusEvidence = makeRunStepEvidence({
    id: `${step.id}-status`,
    runId: step.runId,
    stepId: step.id,
    nodeId: step.nodeId,
    kind: 'node_status',
    severity: severityFromStepStatus(step.status),
    title: step.nodeTitle,
    summary: `Step status is ${step.status} on ${step.route} route.`,
    createdAt: step.finishedAt ?? step.startedAt,
  })
  if (statusEvidence) evidence.push(statusEvidence)

  if (step.message) {
    const messageEvidence = makeRunStepEvidence({
      id: `${step.id}-message`,
      runId: step.runId,
      stepId: step.id,
      nodeId: step.nodeId,
      kind: step.status === 'review_required' ? 'human_review' : 'log_entry',
      severity: severityFromStepStatus(step.status),
      title: step.nodeTitle,
      summary: step.message,
      createdAt: step.finishedAt ?? step.startedAt,
    })
    if (messageEvidence) evidence.push(messageEvidence)
  }

  if (step.error) {
    const errorEvidence = makeRunStepEvidence({
      id: `${step.id}-error`,
      runId: step.runId,
      stepId: step.id,
      nodeId: step.nodeId,
      kind: 'connector_error',
      severity: 'error',
      title: step.nodeTitle,
      summary: step.error,
      createdAt: step.finishedAt ?? step.startedAt,
    })
    if (errorEvidence) evidence.push(errorEvidence)
  }

  if (step.retryOfStepId || step.status === 'retry_ready' || step.route === 'retry') {
    const retryEvidence = makeRunStepEvidence({
      id: `${step.id}-retry`,
      runId: step.runId,
      stepId: step.id,
      nodeId: step.nodeId,
      kind: 'retry_event',
      severity: 'warn',
      title: step.nodeTitle,
      summary: step.retryOfStepId
        ? `Retry step for ${step.retryOfStepId}.`
        : 'Step is a retry candidate.',
      createdAt: step.finishedAt ?? step.startedAt,
    })
    if (retryEvidence) evidence.push(retryEvidence)
  }

  return {
    id: step.id,
    runId: step.runId,
    nodeId: step.nodeId,
    nodeTitle: step.nodeTitle,
    status: step.status,
    route: step.route,
    startedAt: step.startedAt,
    finishedAt: step.finishedAt,
    durationMs: step.durationMs,
    evidence,
  }
}

function createStepFromNode(runId: string, node: WorkflowNode): RunStep {
  const evidence = makeRunStepEvidence({
    id: `${runId}-${node.id}-status`,
    runId,
    stepId: `${runId}-${node.id}`,
    nodeId: node.id,
    kind: 'node_status',
    severity:
      node.status === 'failed'
        ? 'error'
        : node.status === 'review_required' || node.status === 'blocked' || node.status === 'retry_ready'
          ? 'warn'
          : 'info',
    title: node.title,
    summary: `Node status is ${node.status}.`,
    createdAt: node.lastRun?.finishedAt ?? node.lastRun?.startedAt,
  })

  return {
    id: `${runId}-${node.id}`,
    runId,
    nodeId: node.id,
    nodeTitle: node.title,
    status: mapNodeStatusToStepStatus(node.status),
    route: 'main',
    startedAt: node.lastRun?.startedAt,
    finishedAt: node.lastRun?.finishedAt,
    evidence: evidence ? [evidence] : [],
  }
}

function appendJobEvidence(
  trace: RunTrace,
  job: ConnectorJob,
): number {
  const targetStep = trace.steps.find((step) => step.nodeId === job.nodeId)
  const evidence = makeRunStepEvidence({
    id: `${job.id}-connector`,
    runId: job.runId,
    stepId: targetStep?.id,
    nodeId: job.nodeId,
    kind: job.status === 'failed' ? 'connector_error' : 'connector_job',
    severity: severityFromConnectorStatus(job.status),
    title: `${job.connectorLabel} / ${job.nodeTitle}`,
    summary:
      job.status === 'failed'
        ? job.error ?? 'Connector job failed.'
        : `Connector job status is ${job.status}.`,
    createdAt: job.finishedAt ?? job.startedAt ?? job.createdAt,
    sourceRef: job.id,
  })

  if (!evidence) {
    return 1
  }

  if (targetStep) {
    targetStep.evidence.push(evidence)
  } else {
    trace.runEvidence.push(evidence)
  }

  return 0
}

function appendLogEvidence(trace: RunTrace, log: WorkflowRunLog): number {
  const targetStep = log.nodeId
    ? trace.steps.find((step) => step.nodeId === log.nodeId)
    : undefined
  const evidence = makeRunStepEvidence({
    id: `${log.id}-log`,
    runId: log.runId,
    stepId: targetStep?.id,
    nodeId: log.nodeId,
    kind: log.level === 'security' ? 'safety_gate' : 'log_entry',
    severity: severityFromLogLevel(log.level),
    title: targetStep?.nodeTitle ?? 'Run log',
    summary: log.message,
    createdAt: log.timestamp,
    sourceRef: log.id,
  })

  if (!evidence) {
    return 1
  }

  if (targetStep) {
    targetStep.evidence.push(evidence)
  } else {
    trace.runEvidence.push(evidence)
  }

  return 0
}

export function buildRunTrace(input: BuildRunTraceInput): RunTrace {
  const runId = selectActiveRunId(input)
  const latestRecord =
    input.runHistoryRecords.findLast((record) => record.runId === runId) ??
    input.runHistoryRecords[input.runHistoryRecords.length - 1]
  const steps = input.executionGraph
    ? input.executionGraph.steps.map(createStepFromExecutionStep)
    : input.workflow.nodes.map((node) => createStepFromNode(runId, node))

  const trace: RunTrace = {
    runId,
    workflowId: input.workflow.id,
    workflowName: input.workflow.name,
    status: input.workflow.status,
    startedAt: latestRecord?.startedAt,
    finishedAt: latestRecord?.finishedAt,
    steps,
    runEvidence: [],
    retryCandidateStepIds: input.executionGraph?.retryCandidates ?? [],
    safetyWarnings: [],
    excludedEvidenceCount: 0,
  }

  const relevantJobs = input.connectorJobs.filter((job) => job.runId === runId)
  for (const job of relevantJobs) {
    trace.excludedEvidenceCount += appendJobEvidence(trace, job)
  }

  const relevantLogs = input.workflow.logs.filter((log) => log.runId === runId)
  for (const log of relevantLogs) {
    trace.excludedEvidenceCount += appendLogEvidence(trace, log)
  }

  const artifactEvidence = makeRunStepEvidence({
    id: `${runId}-artifact-summary`,
    runId,
    kind: 'artifact_summary',
    severity:
      input.workflow.artifact.status === 'failed'
        ? 'error'
        : input.workflow.artifact.status === 'review_required'
          ? 'warn'
          : 'info',
    title: input.workflow.artifact.title,
    summary: `Artifact format is ${input.workflow.artifact.format}; status is ${input.workflow.artifact.status}.`,
  })
  if (artifactEvidence) {
    trace.runEvidence.push(artifactEvidence)
  } else {
    trace.excludedEvidenceCount += 1
  }

  const metricEvidence = makeRunStepEvidence({
    id: `${runId}-metric-summary`,
    runId,
    kind: 'metric',
    severity: input.workflow.metrics.retryCount > 0 ? 'warn' : 'info',
    title: 'Run metrics',
    summary: `tokens=${input.workflow.metrics.tokens}; latencyMs=${input.workflow.metrics.latencyMs}; retryCount=${input.workflow.metrics.retryCount}; successRate=${input.workflow.metrics.successRate}`,
  })
  if (metricEvidence) {
    trace.runEvidence.push(metricEvidence)
  }

  if (trace.excludedEvidenceCount > 0) {
    trace.safetyWarnings.push(
      `${trace.excludedEvidenceCount} evidence item(s) were excluded by the credential-safe filter.`,
    )
  }

  return trace
}
