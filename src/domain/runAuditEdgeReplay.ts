import {
  formatRuntimeAuditContractSummary,
  sanitizeRuntimeAuditText,
  type RuntimeAuditContractEvent,
  type RuntimeAuditEventKind,
  type RuntimeAuditRouteKind,
  type RuntimeAuditSeverity,
} from './runtimeAuditContract'

export type RunAuditEdgeReplayStatus = 'observed' | 'warning' | 'error'

export type RunAuditEdgeReplayRecord = {
  id: string
  runId: string
  connectionId: string
  sourceNodeId: string
  targetNodeId: string
  status: RunAuditEdgeReplayStatus
  statusLabel: string
  eventCount: number
  routeKinds: RuntimeAuditRouteKind[]
  eventKinds: RuntimeAuditEventKind[]
  severityMix: string
  latestEventId: string | null
  latestCreatedAt?: string
  latestSummary: string
  conditionObserved: boolean
  delayObserved: boolean
  retryObserved: boolean
  errorRouteObserved: boolean
  safeCopySummary: string
}

const MAX_EDGE_REPLAY_RECORDS = 48
const MAX_EDGE_REPLAY_LIST_ITEMS = 8

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return values.filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
}

function severityRank(severity: RuntimeAuditSeverity): number {
  switch (severity) {
    case 'error':
      return 2
    case 'warn':
      return 1
    case 'info':
      return 0
  }
}

function formatSeverityMix(events: readonly RuntimeAuditContractEvent[]): string {
  const info = events.filter((event) => event.severity === 'info').length
  const warn = events.filter((event) => event.severity === 'warn').length
  const error = events.filter((event) => event.severity === 'error').length
  return `info ${info} / warn ${warn} / error ${error}`
}

function sortRuntimeEvents(events: readonly RuntimeAuditContractEvent[]): RuntimeAuditContractEvent[] {
  return [...events].sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0
    if (leftTime !== rightTime) return leftTime - rightTime
    return left.id.localeCompare(right.id)
  })
}

function statusFromEvents(events: readonly RuntimeAuditContractEvent[]): {
  status: RunAuditEdgeReplayStatus
  statusLabel: string
} {
  const highest = events.reduce<RuntimeAuditSeverity>(
    (current, event) => (severityRank(event.severity) > severityRank(current) ? event.severity : current),
    'info',
  )
  if (highest === 'error') return { status: 'error', statusLabel: 'error route evidence' }
  if (highest === 'warn') return { status: 'warning', statusLabel: 'watch route evidence' }
  return { status: 'observed', statusLabel: 'observed route evidence' }
}

function buildRecordFromEvents(
  connectionId: string,
  events: readonly RuntimeAuditContractEvent[],
): RunAuditEdgeReplayRecord | null {
  const ordered = sortRuntimeEvents(events)
  const latest = ordered[ordered.length - 1] ?? null
  const firstWithNodes = ordered.find((event) => event.sourceNodeId && event.targetNodeId)
  const sourceNodeId = firstWithNodes?.sourceNodeId
  const targetNodeId = firstWithNodes?.targetNodeId
  if (!latest || !sourceNodeId || !targetNodeId) {
    return null
  }

  const status = statusFromEvents(ordered)
  const routeKinds = uniqueStrings(ordered.map((event) => event.routeKind))
  const eventKinds = uniqueStrings(ordered.map((event) => event.kind))
  const latestSummary =
    sanitizeRuntimeAuditText(formatRuntimeAuditContractSummary(latest), 220) ??
    `${latest.kind} / ${latest.routeKind} / ${latest.severity}`
  const safeCopySummary = [
    `edge replay: ${connectionId}`,
    `from: ${sourceNodeId}`,
    `to: ${targetNodeId}`,
    `status: ${status.statusLabel}`,
    `events: ${ordered.length}`,
    `routes: ${routeKinds.join(', ') || 'none'}`,
    `event kinds: ${eventKinds.join(', ') || 'none'}`,
    `severity: ${formatSeverityMix(ordered)}`,
    `latest: ${latestSummary}`,
  ].join('\n')

  return {
    id: `${ordered[0].runId}-${connectionId}-edge-replay`,
    runId: ordered[0].runId,
    connectionId,
    sourceNodeId,
    targetNodeId,
    status: status.status,
    statusLabel: status.statusLabel,
    eventCount: ordered.length,
    routeKinds,
    eventKinds,
    severityMix: formatSeverityMix(ordered),
    latestEventId: latest.id,
    latestCreatedAt: latest.createdAt,
    latestSummary,
    conditionObserved: ordered.some((event) => event.kind === 'edge_condition'),
    delayObserved: ordered.some((event) => event.kind === 'edge_delay'),
    retryObserved: ordered.some((event) => event.kind === 'edge_retry' || event.routeKind === 'retry'),
    errorRouteObserved: ordered.some((event) => event.kind === 'edge_error_route' || event.routeKind === 'error'),
    safeCopySummary,
  }
}

export function buildRunAuditEdgeReplayRecords(
  events: readonly RuntimeAuditContractEvent[],
): RunAuditEdgeReplayRecord[] {
  const eventsByConnection = new Map<string, RuntimeAuditContractEvent[]>()
  for (const event of events) {
    if (!event.connectionId || !event.sourceNodeId || !event.targetNodeId) {
      continue
    }
    const existing = eventsByConnection.get(event.connectionId) ?? []
    existing.push(event)
    eventsByConnection.set(event.connectionId, existing)
  }

  return Array.from(eventsByConnection.entries())
    .map(([connectionId, connectionEvents]) => buildRecordFromEvents(connectionId, connectionEvents))
    .filter((record): record is RunAuditEdgeReplayRecord => record !== null)
    .sort((left, right) => {
      const leftTime = left.latestCreatedAt ? Date.parse(left.latestCreatedAt) : 0
      const rightTime = right.latestCreatedAt ? Date.parse(right.latestCreatedAt) : 0
      if (leftTime !== rightTime) return leftTime - rightTime
      return left.connectionId.localeCompare(right.connectionId)
    })
    .slice(-MAX_EDGE_REPLAY_RECORDS)
}

function normalizeStringArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  limit = MAX_EDGE_REPLAY_LIST_ITEMS,
): T[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is T => typeof entry === 'string' && (allowed as readonly string[]).includes(entry))
    .filter((entry, index, entries) => entries.indexOf(entry) === index)
    .slice(0, limit)
}

export function normalizeRunAuditEdgeReplayRecords(options: {
  raw: unknown
  runtimeEvents: readonly RuntimeAuditContractEvent[]
}): RunAuditEdgeReplayRecord[] {
  if (!Array.isArray(options.raw)) {
    return buildRunAuditEdgeReplayRecords(options.runtimeEvents)
  }

  const eventKinds: readonly RuntimeAuditEventKind[] = [
    'node_runtime',
    'route_observed',
    'edge_condition',
    'edge_delay',
    'edge_retry',
    'edge_error_route',
  ]
  const routeKinds: readonly RuntimeAuditRouteKind[] = [
    'main',
    'condition',
    'retry',
    'error',
    'review',
    'skip',
  ]

  return options.raw
    .map((entry): RunAuditEdgeReplayRecord | null => {
      if (!isRecord(entry)) return null
      if (
        typeof entry.id !== 'string' ||
        typeof entry.runId !== 'string' ||
        typeof entry.connectionId !== 'string' ||
        typeof entry.sourceNodeId !== 'string' ||
        typeof entry.targetNodeId !== 'string' ||
        typeof entry.latestSummary !== 'string'
      ) {
        return null
      }
      const eventCount =
        typeof entry.eventCount === 'number' && Number.isFinite(entry.eventCount) && entry.eventCount >= 0
          ? Math.trunc(entry.eventCount)
          : 0
      const latestSummary = sanitizeRuntimeAuditText(entry.latestSummary, 220)
      if (!latestSummary) return null
      const status =
        entry.status === 'error' || entry.status === 'warning' || entry.status === 'observed'
          ? entry.status
          : 'observed'

      const normalized: RunAuditEdgeReplayRecord = {
        id: entry.id,
        runId: entry.runId,
        connectionId: entry.connectionId,
        sourceNodeId: entry.sourceNodeId,
        targetNodeId: entry.targetNodeId,
        status,
        statusLabel:
          typeof entry.statusLabel === 'string'
            ? sanitizeRuntimeAuditText(entry.statusLabel, 80) ?? status
            : status,
        eventCount,
        routeKinds: normalizeStringArray(entry.routeKinds, routeKinds),
        eventKinds: normalizeStringArray(entry.eventKinds, eventKinds),
        severityMix:
          typeof entry.severityMix === 'string'
            ? sanitizeRuntimeAuditText(entry.severityMix, 80) ?? 'info 0 / warn 0 / error 0'
            : 'info 0 / warn 0 / error 0',
        latestEventId: typeof entry.latestEventId === 'string' ? entry.latestEventId : null,
        latestCreatedAt: typeof entry.latestCreatedAt === 'string' ? entry.latestCreatedAt : undefined,
        latestSummary,
        conditionObserved: entry.conditionObserved === true,
        delayObserved: entry.delayObserved === true,
        retryObserved: entry.retryObserved === true,
        errorRouteObserved: entry.errorRouteObserved === true,
        safeCopySummary:
          typeof entry.safeCopySummary === 'string'
            ? sanitizeRuntimeAuditText(entry.safeCopySummary, 480) ?? ''
            : '',
      }

      return {
        ...normalized,
        safeCopySummary:
          normalized.safeCopySummary ||
          [
            `edge replay: ${normalized.connectionId}`,
            `from: ${normalized.sourceNodeId}`,
            `to: ${normalized.targetNodeId}`,
            `status: ${normalized.statusLabel}`,
            `events: ${normalized.eventCount}`,
            `latest: ${normalized.latestSummary}`,
          ].join('\n'),
      }
    })
    .filter((record): record is RunAuditEdgeReplayRecord => record !== null)
    .slice(-MAX_EDGE_REPLAY_RECORDS)
}
