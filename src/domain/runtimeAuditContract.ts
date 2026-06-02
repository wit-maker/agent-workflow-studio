import { containsConnectorSensitiveKeyword, sanitizeConnectorText } from './connectorSafety'

export const RUNTIME_AUDIT_CONTRACT_SCHEMA_VERSION = '1.0' as const

export const runtimeAuditEventKinds = [
  'node_runtime',
  'route_observed',
  'edge_condition',
  'edge_delay',
  'edge_retry',
  'edge_error_route',
] as const

export const runtimeAuditRouteKinds = [
  'main',
  'condition',
  'retry',
  'error',
  'review',
  'skip',
] as const

export const runtimeAuditSeverities = ['info', 'warn', 'error'] as const

export type RuntimeAuditEventKind = typeof runtimeAuditEventKinds[number]
export type RuntimeAuditRouteKind = typeof runtimeAuditRouteKinds[number]
export type RuntimeAuditSeverity = typeof runtimeAuditSeverities[number]
export type RuntimeAuditSafeMetadataValue = string | number | boolean | null
export type RuntimeAuditSafeMetadata = Record<string, RuntimeAuditSafeMetadataValue>

export type RuntimeAuditContractEvent = {
  schemaVersion: typeof RUNTIME_AUDIT_CONTRACT_SCHEMA_VERSION
  id: string
  runId: string
  kind: RuntimeAuditEventKind
  routeKind: RuntimeAuditRouteKind
  severity: RuntimeAuditSeverity
  title: string
  summary: string
  createdAt?: string
  stepId?: string
  sourceNodeId?: string
  targetNodeId?: string
  connectionId?: string
  safeMetadata?: RuntimeAuditSafeMetadata
}

export type CreateRuntimeAuditContractEventInput = {
  id: string
  runId: string
  kind: RuntimeAuditEventKind
  routeKind?: RuntimeAuditRouteKind
  severity?: RuntimeAuditSeverity
  title: string
  summary: string
  createdAt?: string
  stepId?: string
  sourceNodeId?: string
  targetNodeId?: string
  connectionId?: string
  safeMetadata?: Record<string, unknown>
}

const MAX_RUNTIME_AUDIT_TITLE_LENGTH = 96
const MAX_RUNTIME_AUDIT_SUMMARY_LENGTH = 240
const MAX_RUNTIME_AUDIT_METADATA_STRING_LENGTH = 120
const MAX_RUNTIME_AUDIT_METADATA_KEYS = 12

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRuntimeAuditEventKind(value: unknown): value is RuntimeAuditEventKind {
  return typeof value === 'string' && (runtimeAuditEventKinds as readonly string[]).includes(value)
}

function isRuntimeAuditRouteKind(value: unknown): value is RuntimeAuditRouteKind {
  return typeof value === 'string' && (runtimeAuditRouteKinds as readonly string[]).includes(value)
}

function isRuntimeAuditSeverity(value: unknown): value is RuntimeAuditSeverity {
  return typeof value === 'string' && (runtimeAuditSeverities as readonly string[]).includes(value)
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

export function sanitizeRuntimeAuditText(
  value: string | null | undefined,
  maxLength = MAX_RUNTIME_AUDIT_SUMMARY_LENGTH,
): string | null {
  const sanitized = sanitizeConnectorText(value)
  if (!sanitized || containsConnectorSensitiveKeyword(sanitized)) {
    return null
  }
  return truncate(sanitized, maxLength)
}

export function sanitizeRuntimeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): RuntimeAuditSafeMetadata | undefined {
  if (!metadata) {
    return undefined
  }

  const safeEntries: RuntimeAuditSafeMetadata = {}
  for (const [key, value] of Object.entries(metadata).slice(0, MAX_RUNTIME_AUDIT_METADATA_KEYS)) {
    if (containsConnectorSensitiveKeyword(key)) {
      continue
    }

    if (typeof value === 'string') {
      const safeValue = sanitizeRuntimeAuditText(value, MAX_RUNTIME_AUDIT_METADATA_STRING_LENGTH)
      if (safeValue) {
        safeEntries[key] = safeValue
      }
      continue
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      safeEntries[key] = value
      continue
    }

    if (typeof value === 'boolean' || value === null) {
      safeEntries[key] = value
    }
  }

  return Object.keys(safeEntries).length > 0 ? safeEntries : undefined
}

export function makeRuntimeAuditContractEvent(
  input: CreateRuntimeAuditContractEventInput,
): RuntimeAuditContractEvent | null {
  const title = sanitizeRuntimeAuditText(input.title, MAX_RUNTIME_AUDIT_TITLE_LENGTH)
  const summary = sanitizeRuntimeAuditText(input.summary)
  if (!title || !summary) {
    return null
  }

  return {
    schemaVersion: RUNTIME_AUDIT_CONTRACT_SCHEMA_VERSION,
    id: input.id,
    runId: input.runId,
    kind: input.kind,
    routeKind: input.routeKind ?? 'main',
    severity: input.severity ?? 'info',
    title,
    summary,
    createdAt: input.createdAt,
    stepId: input.stepId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    connectionId: input.connectionId,
    safeMetadata: sanitizeRuntimeAuditMetadata(input.safeMetadata),
  }
}

export function normalizeRuntimeAuditContractEvent(
  value: unknown,
): RuntimeAuditContractEvent | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id : null
  const runId = typeof value.runId === 'string' ? value.runId : null
  const title = typeof value.title === 'string' ? value.title : null
  const summary = typeof value.summary === 'string' ? value.summary : null
  const kind = isRuntimeAuditEventKind(value.kind) ? value.kind : null
  if (!id || !runId || !title || !summary || !kind) {
    return null
  }

  return makeRuntimeAuditContractEvent({
    id,
    runId,
    kind,
    routeKind: isRuntimeAuditRouteKind(value.routeKind) ? value.routeKind : 'main',
    severity: isRuntimeAuditSeverity(value.severity) ? value.severity : 'info',
    title,
    summary,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    stepId: typeof value.stepId === 'string' ? value.stepId : undefined,
    sourceNodeId: typeof value.sourceNodeId === 'string' ? value.sourceNodeId : undefined,
    targetNodeId: typeof value.targetNodeId === 'string' ? value.targetNodeId : undefined,
    connectionId: typeof value.connectionId === 'string' ? value.connectionId : undefined,
    safeMetadata: isRecord(value.safeMetadata) ? value.safeMetadata : undefined,
  })
}

export function formatRuntimeAuditContractSummary(
  event: RuntimeAuditContractEvent,
): string {
  return [
    event.kind,
    event.routeKind,
    event.severity,
    event.connectionId ? `edge ${event.connectionId}` : null,
    `${event.title}: ${event.summary}`,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(' / ')
}
