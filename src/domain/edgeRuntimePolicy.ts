import { containsConnectorSensitiveKeyword } from './connectorSafety'
import type {
  WorkflowConnection,
  WorkflowConnectionConditionMode,
  WorkflowConnectionRuntimePolicy,
} from './workflow'

export type EdgeRuntimePolicySummary = {
  conditionSummary: string
  delaySummary: string
  retrySummary: string
  errorRouteSummary: string
  hasCondition: boolean
  safeCopyLines: string[]
}

const conditionModes: readonly WorkflowConnectionConditionMode[] = [
  'always',
  'on_success',
  'on_failure',
  'on_review',
  'expression',
]

const conditionModeLabels: Record<WorkflowConnectionConditionMode, string> = {
  always: 'always',
  on_success: 'source success',
  on_failure: 'source failure',
  on_review: 'review required',
  expression: 'safe expression',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const candidate = finiteNumber(value)
  if (candidate === undefined) return fallback
  return Math.min(max, Math.max(min, Math.round(candidate)))
}

export function sanitizeRuntimePolicyText(value: unknown, maxLength = 96): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  if (containsConnectorSensitiveKeyword(normalized)) return undefined
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized
}

export function normalizeConnectionRuntimePolicy(raw: unknown): WorkflowConnectionRuntimePolicy | undefined {
  if (!isRecord(raw)) return undefined

  const conditionRaw = isRecord(raw.condition) ? raw.condition : undefined
  const modeRaw = conditionRaw?.mode
  const mode = typeof modeRaw === 'string' && (conditionModes as readonly string[]).includes(modeRaw)
    ? modeRaw as WorkflowConnectionConditionMode
    : undefined
  const condition = mode
    ? {
        mode,
        label: sanitizeRuntimePolicyText(conditionRaw?.label),
        expression: mode === 'expression'
          ? sanitizeRuntimePolicyText(conditionRaw?.expression, 120)
          : undefined,
      }
    : undefined

  const retryRaw = isRecord(raw.retry) ? raw.retry : undefined
  const retry = retryRaw
    ? {
        enabled: retryRaw.enabled === true,
        maxAttempts: clampInteger(retryRaw.maxAttempts, 2, 1, 8),
        backoffMs: clampInteger(retryRaw.backoffMs, 500, 0, 30000),
      }
    : undefined

  const errorRouteRaw = isRecord(raw.errorRoute) ? raw.errorRoute : undefined
  const errorRoute = errorRouteRaw
    ? {
        enabled: errorRouteRaw.enabled === true,
        targetNodeId: sanitizeRuntimePolicyText(errorRouteRaw.targetNodeId, 80),
        label: sanitizeRuntimePolicyText(errorRouteRaw.label),
      }
    : undefined

  const delayMs = finiteNumber(raw.delayMs)
  const policy: WorkflowConnectionRuntimePolicy = {
    condition,
    retry,
    delayMs: delayMs === undefined ? undefined : Math.min(30000, Math.round(delayMs)),
    errorRoute,
  }

  return policy.condition || policy.retry || policy.delayMs !== undefined || policy.errorRoute
    ? policy
    : undefined
}

function formatConditionSummary(policy: WorkflowConnectionRuntimePolicy | undefined): string {
  const condition = policy?.condition
  if (!condition) return 'no branch condition'
  const label = condition.label ? ` / ${condition.label}` : ''
  const expression = condition.mode === 'expression' && condition.expression
    ? ` / ${condition.expression}`
    : ''
  return `${conditionModeLabels[condition.mode]}${label}${expression}`
}

function formatDelaySummary(policy: WorkflowConnectionRuntimePolicy | undefined): string {
  if (typeof policy?.delayMs === 'number') {
    return policy.delayMs > 0 ? `policy delay ${policy.delayMs} ms` : 'no policy delay'
  }
  return 'no policy delay'
}

function formatRetrySummary(policy: WorkflowConnectionRuntimePolicy | undefined): string {
  const retry = policy?.retry
  if (!retry) return 'no retry policy'
  return retry.enabled
    ? `retry ${retry.maxAttempts}x / backoff ${retry.backoffMs} ms`
    : 'retry disabled'
}

function formatErrorRouteSummary(policy: WorkflowConnectionRuntimePolicy | undefined): string {
  const route = policy?.errorRoute
  if (!route) return 'no policy error route'
  if (!route.enabled) return 'error route disabled'
  const target = route.targetNodeId ? ` -> ${route.targetNodeId}` : ''
  const label = route.label ? ` / ${route.label}` : ''
  return `policy error route${target}${label}`
}

export function summarizeConnectionRuntimePolicy(
  connection: Pick<WorkflowConnection, 'runtimePolicy' | 'kind'>,
): EdgeRuntimePolicySummary {
  const policy = connection.runtimePolicy
  const conditionSummary = formatConditionSummary(policy)
  const delaySummary = formatDelaySummary(policy)
  const retrySummary = formatRetrySummary(policy)
  const errorRouteSummary = formatErrorRouteSummary(policy)
  const hasCondition =
    Boolean(policy?.condition && policy.condition.mode !== 'always') ||
    ['decision', 'approval', 'error', 'retry'].includes(connection.kind)

  return {
    conditionSummary,
    delaySummary,
    retrySummary,
    errorRouteSummary,
    hasCondition,
    safeCopyLines: [
      `condition: ${conditionSummary}`,
      `delay: ${delaySummary}`,
      `retry: ${retrySummary}`,
      `error route: ${errorRouteSummary}`,
    ],
  }
}
