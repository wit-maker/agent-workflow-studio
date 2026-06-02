import type { ExecutionGraph, ExecutionRoute, ExecutionRouteKind, ExecutionStep } from './executionGraph'
import {
  makeRuntimeAuditContractEvent,
  type RuntimeAuditContractEvent,
  type RuntimeAuditEventKind,
  type RuntimeAuditRouteKind,
  type RuntimeAuditSeverity,
} from './runtimeAuditContract'
import type { Workflow, WorkflowConnection } from './workflow'

export type BuildRuntimeAuditEventsInput = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  runId: string
}

const MAX_RUNTIME_AUDIT_EVENTS = 80

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

function severityFromStep(step: ExecutionStep): RuntimeAuditSeverity {
  if (step.status === 'failed') return 'error'
  if (step.status === 'review_required' || step.status === 'retry_ready') return 'warn'
  return 'info'
}

function severityFromRoute(route: ExecutionRoute): RuntimeAuditSeverity {
  if (route.kind === 'error') return 'error'
  if (route.kind === 'retry' || route.kind === 'review') return 'warn'
  return 'info'
}

function findRouteConnection(
  route: ExecutionRoute,
  connections: readonly WorkflowConnection[],
): WorkflowConnection | undefined {
  return connections.find((connection) => {
    if (connection.sourceNodeId !== route.fromNodeId) return false
    if (!route.toNodeId) return false
    return connection.targetNodeId === route.toNodeId
  })
}

function describeConnection(connection: WorkflowConnection): string {
  return `${connection.sourceNodeId} -> ${connection.targetNodeId}`
}

function hasBranchCondition(connection: WorkflowConnection): boolean {
  const condition = connection.runtimePolicy?.condition
  return (
    Boolean(condition && condition.mode !== 'always') ||
    ['decision', 'approval', 'error', 'retry'].includes(connection.kind)
  )
}

function buildNodeEvent(runId: string, step: ExecutionStep): RuntimeAuditContractEvent | null {
  return makeRuntimeAuditContractEvent({
    id: `${step.id}-runtime-event`,
    runId,
    kind: 'node_runtime',
    routeKind: routeKindFromExecutionRoute(step.route),
    severity: severityFromStep(step),
    title: step.nodeTitle,
    summary: `Node runtime status is ${step.status} on ${step.route} route.`,
    createdAt: step.finishedAt ?? step.startedAt,
    stepId: step.id,
    sourceNodeId: step.nodeId,
    safeMetadata: {
      nodeId: step.nodeId,
      status: step.status,
      route: step.route,
      durationMs: step.durationMs ?? null,
      retryOfStepId: step.retryOfStepId ?? null,
    },
  })
}

function buildRouteEvent(
  runId: string,
  route: ExecutionRoute,
  connection: WorkflowConnection | undefined,
): RuntimeAuditContractEvent | null {
  const routeKind = routeKindFromExecutionRoute(route.kind)
  return makeRuntimeAuditContractEvent({
    id: `${route.id}-runtime-route-event`,
    runId,
    kind: 'route_observed',
    routeKind,
    severity: severityFromRoute(route),
    title: `${route.kind} route observed`,
    summary: connection
      ? `Runtime route observed on edge ${describeConnection(connection)}.`
      : `Runtime route observed from ${route.fromNodeId}.`,
    createdAt: route.createdAt,
    sourceNodeId: route.fromNodeId,
    targetNodeId: route.toNodeId,
    connectionId: connection?.id,
    safeMetadata: {
      route: route.kind,
      fromNodeId: route.fromNodeId,
      toNodeId: route.toNodeId ?? null,
      connectionKind: connection?.kind ?? null,
      connectionStatus: connection?.status ?? null,
    },
  })
}

function buildEdgePolicyEvent(options: {
  runId: string
  route: ExecutionRoute
  connection: WorkflowConnection
  kind: RuntimeAuditEventKind
  title: string
  summary: string
  severity?: RuntimeAuditSeverity
  metadata?: Record<string, unknown>
}): RuntimeAuditContractEvent | null {
  return makeRuntimeAuditContractEvent({
    id: `${options.route.id}-${options.connection.id}-${options.kind}`,
    runId: options.runId,
    kind: options.kind,
    routeKind: routeKindFromExecutionRoute(options.route.kind),
    severity: options.severity ?? severityFromRoute(options.route),
    title: options.title,
    summary: options.summary,
    createdAt: options.route.createdAt,
    sourceNodeId: options.connection.sourceNodeId,
    targetNodeId: options.connection.targetNodeId,
    connectionId: options.connection.id,
    safeMetadata: {
      connectionKind: options.connection.kind,
      connectionStatus: options.connection.status,
      carriesCount: options.connection.carries.length,
      ...options.metadata,
    },
  })
}

function buildEdgePolicyEvents(
  runId: string,
  route: ExecutionRoute,
  connection: WorkflowConnection | undefined,
): RuntimeAuditContractEvent[] {
  if (!connection) {
    return []
  }

  const events: Array<RuntimeAuditContractEvent | null> = []
  const policy = connection.runtimePolicy

  if (hasBranchCondition(connection)) {
    events.push(
      buildEdgePolicyEvent({
        runId,
        route,
        connection,
        kind: 'edge_condition',
        title: 'Edge condition observed',
        summary: `Branch condition observed on ${connection.kind} edge.`,
        severity: route.kind === 'main' ? 'info' : severityFromRoute(route),
        metadata: {
          conditionMode: policy?.condition?.mode ?? 'implicit',
          hasExpression: Boolean(policy?.condition?.expression),
        },
      }),
    )
  }

  if (typeof policy?.delayMs === 'number') {
    events.push(
      buildEdgePolicyEvent({
        runId,
        route,
        connection,
        kind: 'edge_delay',
        title: 'Edge delay policy observed',
        summary: `Delay policy is ${policy.delayMs} ms.`,
        severity: 'info',
        metadata: {
          delayMs: policy.delayMs,
        },
      }),
    )
  }

  if (policy?.retry || route.kind === 'retry') {
    events.push(
      buildEdgePolicyEvent({
        runId,
        route,
        connection,
        kind: 'edge_retry',
        title: 'Edge retry policy observed',
        summary: policy?.retry?.enabled
          ? `Retry policy allows ${policy.retry.maxAttempts} attempt(s).`
          : 'Retry route observed for this edge.',
        severity: 'warn',
        metadata: {
          retryEnabled: policy?.retry?.enabled ?? route.kind === 'retry',
          maxAttempts: policy?.retry?.maxAttempts ?? null,
          backoffMs: policy?.retry?.backoffMs ?? null,
        },
      }),
    )
  }

  if (policy?.errorRoute || route.kind === 'error') {
    events.push(
      buildEdgePolicyEvent({
        runId,
        route,
        connection,
        kind: 'edge_error_route',
        title: 'Edge error route observed',
        summary: policy?.errorRoute?.enabled
          ? 'Error route policy is enabled.'
          : 'Error route observed for this edge.',
        severity: route.kind === 'error' ? 'error' : 'warn',
        metadata: {
          errorRouteEnabled: policy?.errorRoute?.enabled ?? route.kind === 'error',
          errorRouteTargetNodeId: policy?.errorRoute?.targetNodeId ?? null,
        },
      }),
    )
  }

  return events.filter((event): event is RuntimeAuditContractEvent => event !== null)
}

function sortRuntimeEvents(
  events: readonly RuntimeAuditContractEvent[],
): RuntimeAuditContractEvent[] {
  return [...events].sort((a, b) => {
    const left = a.createdAt ? Date.parse(a.createdAt) : 0
    const right = b.createdAt ? Date.parse(b.createdAt) : 0
    if (left !== right) return left - right
    return a.id.localeCompare(b.id)
  })
}

export function buildRuntimeAuditEvents(
  input: BuildRuntimeAuditEventsInput,
): RuntimeAuditContractEvent[] {
  const graph = input.executionGraph
  if (!graph) {
    return []
  }

  const events: Array<RuntimeAuditContractEvent | null> = []

  for (const step of graph.steps) {
    events.push(buildNodeEvent(input.runId, step))
  }

  for (const route of graph.routes) {
    const connection = findRouteConnection(route, input.workflow.connections)
    events.push(buildRouteEvent(input.runId, route, connection))
    events.push(...buildEdgePolicyEvents(input.runId, route, connection))
  }

  return sortRuntimeEvents(events.filter((event): event is RuntimeAuditContractEvent => event !== null))
    .slice(-MAX_RUNTIME_AUDIT_EVENTS)
}
