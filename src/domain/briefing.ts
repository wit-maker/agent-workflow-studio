import type { WorkflowStatus } from './workflow'

export type BriefingSeverity = 'info' | 'warn' | 'error'

export type BriefingStatus = 'idle' | 'generating' | 'done' | 'error'

export type BriefingInputMode = 'all' | 'latest-run' | 'errors-only'

export const briefingInputModeLabels: Record<BriefingInputMode, string> = {
  all: '全ログ',
  'latest-run': '最新 Run のみ',
  'errors-only': 'エラーのみ',
}

export type BriefingResult = {
  what: string
  why: string
  how: string
  next: string
  severity: BriefingSeverity
  isMock: boolean
  generatedAt: string
}

export type BriefingState = {
  status: BriefingStatus
  result: BriefingResult | null
  error: string | null
  generatedAt: string | null
  inputMode: BriefingInputMode
}

export type BriefingWorkflowSummary = {
  workflowId: string
  workflowName: string
  overallStatus: WorkflowStatus
  nodeCount: number
  connectionCount: number
  statusCounts: {
    failed: number
    reviewRequired: number
    blocked: number
    retryReady: number
    running: number
    queued: number
    success: number
  }
  visibleNodes: string[]
}

export type BriefingMetricsSummary = {
  tokens: number
  cost: number
  latencyMs: number
  successRate: number
  queueCount: number
  retryCount: number
  bottleneckNodeLabel: string | null
}

export type BriefingExecutionSummary = {
  runId: string | null
  stepCount: number
  failedSteps: string[]
  reviewSteps: string[]
  retryCandidates: string[]
  routeKinds: string[]
}

export type BriefingConnectorSummary = {
  total: number
  failed: number
  reviewRequired: number
  running: number
  queued: number
  selectedEntries: string[]
}

export type BriefingHudSummary = {
  alertLevel: number
  priority: 'normal' | 'watch' | 'alert' | 'critical'
  summary: string
  recommendedAction: string
  selectedSignals: string[]
}

export type BriefingRunHistorySummary = {
  totalRecords: number
  selectedRecords: string[]
}

export type BriefingInput = {
  mode: BriefingInputMode
  severity: BriefingSeverity
  workflow: BriefingWorkflowSummary
  metrics: BriefingMetricsSummary
  execution: BriefingExecutionSummary
  connectors: BriefingConnectorSummary
  hud: BriefingHudSummary
  runHistory: BriefingRunHistorySummary
  logEntries: string[]
  errorEntries: string[]
  truncated: boolean
}

export const BRIEFING_SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'key',
  'secret',
  'apikey',
  'credential',
  'authorization',
  'bearer',
] as const

export function createInitialBriefingState(): BriefingState {
  return {
    status: 'idle',
    result: null,
    error: null,
    generatedAt: null,
    inputMode: 'all',
  }
}
