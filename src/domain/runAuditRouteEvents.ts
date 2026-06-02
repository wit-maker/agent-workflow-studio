import type { ExecutionRouteKind, ExecutionStepStatus } from './executionGraph'
import {
  makeRuntimeAuditContractEvent,
  normalizeRuntimeAuditContractEvent,
  type RuntimeAuditContractEvent,
  type RuntimeAuditRouteKind,
  type RuntimeAuditSeverity,
} from './runtimeAuditContract'

export type RunAuditRouteEventStep = {
  id: string
  runId: string
  nodeId: string
  nodeTitle: string
  status: ExecutionStepStatus
  route: ExecutionRouteKind
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  evidence: readonly unknown[]
}

export type BuildRunAuditRouteEventsInput = {
  runId: string
  steps: readonly RunAuditRouteEventStep[]
}

export const MAX_RUN_AUDIT_ROUTE_EVENTS = 48

function routeKindFromExecutionRoute(route: ExecutionRouteKind): RuntimeAuditRouteKind {
  switch (route) {
    case 'error':
      return 'error'
    case 'retry':
      return 'retry'
    case 'review':
      return 'review'
    case 'skip':
      return 'skip'
    case 'main':
      return 'main'
  }
}

function severityFromStatus(status: ExecutionStepStatus): RuntimeAuditSeverity {
  if (status === 'failed') return 'error'
  if (status === 'review_required' || status === 'retry_ready') return 'warn'
  return 'info'
}

function buildStepRuntimeEvent(
  runId: string,
  step: RunAuditRouteEventStep,
): RuntimeAuditContractEvent | null {
  return makeRuntimeAuditContractEvent({
    id: `${step.id}-audit-runtime-event`,
    runId,
    kind: 'node_runtime',
    routeKind: routeKindFromExecutionRoute(step.route),
    severity: severityFromStatus(step.status),
    title: step.nodeTitle,
    summary: `Audit snapshot captured ${step.status} on ${step.route} route.`,
    createdAt: step.finishedAt ?? step.startedAt,
    stepId: step.id,
    sourceNodeId: step.nodeId,
    safeMetadata: {
      nodeId: step.nodeId,
      status: step.status,
      route: step.route,
      durationMs: step.durationMs ?? null,
      evidenceCount: step.evidence.length,
    },
  })
}

function buildRouteRuntimeEvent(
  runId: string,
  step: RunAuditRouteEventStep,
): RuntimeAuditContractEvent | null {
  return makeRuntimeAuditContractEvent({
    id: `${step.id}-audit-route-event`,
    runId,
    kind: 'route_observed',
    routeKind: routeKindFromExecutionRoute(step.route),
    severity: severityFromStatus(step.status),
    title: `${step.route} route persisted`,
    summary: `Durable audit retained ${step.route} route metadata for ${step.nodeTitle}.`,
    createdAt: step.finishedAt ?? step.startedAt,
    stepId: step.id,
    sourceNodeId: step.nodeId,
    safeMetadata: {
      nodeId: step.nodeId,
      route: step.route,
      status: step.status,
    },
  })
}

function buildBranchRuntimeEvent(
  runId: string,
  step: RunAuditRouteEventStep,
): RuntimeAuditContractEvent | null {
  if (step.route === 'main') {
    return null
  }

  const kind =
    step.route === 'retry'
      ? 'edge_retry'
      : step.route === 'error'
        ? 'edge_error_route'
        : 'edge_condition'

  return makeRuntimeAuditContractEvent({
    id: `${step.id}-audit-${kind}`,
    runId,
    kind,
    routeKind: routeKindFromExecutionRoute(step.route),
    severity: severityFromStatus(step.status),
    title: `${step.route} branch metadata`,
    summary: `Durable audit retained safe branch metadata for ${step.route} route.`,
    createdAt: step.finishedAt ?? step.startedAt,
    stepId: step.id,
    sourceNodeId: step.nodeId,
    safeMetadata: {
      nodeId: step.nodeId,
      route: step.route,
      status: step.status,
    },
  })
}

function sortRouteEvents(
  events: readonly RuntimeAuditContractEvent[],
): RuntimeAuditContractEvent[] {
  return [...events].sort((a, b) => {
    const left = a.createdAt ? Date.parse(a.createdAt) : 0
    const right = b.createdAt ? Date.parse(b.createdAt) : 0
    if (left !== right) return left - right
    return a.id.localeCompare(b.id)
  })
}

export function buildRunAuditRouteEvents(
  input: BuildRunAuditRouteEventsInput,
): RuntimeAuditContractEvent[] {
  const events: Array<RuntimeAuditContractEvent | null> = []

  for (const step of input.steps) {
    events.push(buildStepRuntimeEvent(input.runId, step))
    events.push(buildRouteRuntimeEvent(input.runId, step))
    events.push(buildBranchRuntimeEvent(input.runId, step))
  }

  return sortRouteEvents(events.filter((event): event is RuntimeAuditContractEvent => event !== null))
    .slice(-MAX_RUN_AUDIT_ROUTE_EVENTS)
}

export function normalizeRunAuditRouteEvents(raw: unknown): RuntimeAuditContractEvent[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map(normalizeRuntimeAuditContractEvent)
    .filter((event): event is RuntimeAuditContractEvent => event !== null)
    .slice(-MAX_RUN_AUDIT_ROUTE_EVENTS)
}
