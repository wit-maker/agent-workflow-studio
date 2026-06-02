import type {
  RuntimeAuditContractEvent,
  RuntimeAuditRouteKind,
  RuntimeAuditSeverity,
} from './runtimeAuditContract'

export type RuntimeEventSummary = {
  eventCount: number
  nodeEventCount: number
  routeEventCount: number
  edgeEventCount: number
  severityCounts: Record<RuntimeAuditSeverity, number>
  routeKinds: RuntimeAuditRouteKind[]
  latestEventSummary: string | null
}

export function summarizeRuntimeAuditEvents(
  events: readonly RuntimeAuditContractEvent[],
): RuntimeEventSummary {
  const severityCounts: Record<RuntimeAuditSeverity, number> = {
    info: 0,
    warn: 0,
    error: 0,
  }

  for (const event of events) {
    severityCounts[event.severity] += 1
  }

  const latestEvent = events[events.length - 1] ?? null

  return {
    eventCount: events.length,
    nodeEventCount: events.filter((event) => event.kind === 'node_runtime').length,
    routeEventCount: events.filter((event) => event.kind === 'route_observed').length,
    edgeEventCount: events.filter((event) => event.connectionId).length,
    severityCounts,
    routeKinds: Array.from(new Set(events.map((event) => event.routeKind))),
    latestEventSummary: latestEvent
      ? `${latestEvent.title}: ${latestEvent.summary}`
      : null,
  }
}
