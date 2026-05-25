import type { HudSignal, HudSnapshot } from './cognitiveHud'
import type {
  BriefingConnectorSummary,
  BriefingHudSummary,
  BriefingInput,
  BriefingInputMode,
  BriefingMetricsSummary,
  BriefingRunHistorySummary,
  BriefingSeverity,
  BriefingWorkflowSummary,
} from './briefing'
import { BRIEFING_SENSITIVE_KEYWORDS } from './briefing'
import type { ConnectorJob } from './connectorQueue'
import type { ExecutionGraph } from './executionGraph'
import type { WorkflowRunRecord } from './runHistory'
import type { Workflow, WorkflowRunLog, WorkflowStatus } from './workflow'

export const MAX_BRIEFING_INPUT_CHARS = 32000

type CollectBriefingInputArgs = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: readonly ConnectorJob[]
  hudSnapshot: HudSnapshot
  runHistoryRecords: readonly WorkflowRunRecord[]
  mode: BriefingInputMode
}

type TrimTextListResult = {
  entries: string[]
  truncated: boolean
  charsUsed: number
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function containsSensitiveKeyword(value: string): boolean {
  const normalized = value.toLowerCase()
  return BRIEFING_SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function sanitizeBriefingText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = normalizeWhitespace(value)
  if (normalized.length === 0) {
    return null
  }

  return containsSensitiveKeyword(normalized) ? null : normalized
}

function uniqueStrings(entries: readonly string[]): string[] {
  return Array.from(new Set(entries))
}

function trimTextList(entries: readonly string[], maxChars: number): TrimTextListResult {
  const kept: string[] = []
  let charsUsed = 0
  let truncated = false

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    const cost = entry.length + 1
    if (charsUsed + cost > maxChars) {
      truncated = true
      continue
    }

    kept.unshift(entry)
    charsUsed += cost
  }

  return {
    entries: kept,
    truncated,
    charsUsed,
  }
}

function summarizeWorkflow(workflow: Workflow): BriefingWorkflowSummary {
  const statusCounts = {
    failed: 0,
    reviewRequired: 0,
    blocked: 0,
    retryReady: 0,
    running: 0,
    queued: 0,
    success: 0,
  }

  const visibleNodes: string[] = []

  for (const node of workflow.nodes) {
    switch (node.status) {
      case 'failed':
        statusCounts.failed += 1
        break
      case 'review_required':
        statusCounts.reviewRequired += 1
        break
      case 'blocked':
        statusCounts.blocked += 1
        break
      case 'retry_ready':
        statusCounts.retryReady += 1
        break
      case 'running':
        statusCounts.running += 1
        break
      case 'queued':
        statusCounts.queued += 1
        break
      case 'success':
        statusCounts.success += 1
        break
      default:
        break
    }

    const safeNodeSummary = sanitizeBriefingText(`${node.title} (${node.status})`)
    if (safeNodeSummary) {
      visibleNodes.push(safeNodeSummary)
    }
  }

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    overallStatus: workflow.status,
    nodeCount: workflow.nodes.length,
    connectionCount: workflow.connections.length,
    statusCounts,
    visibleNodes,
  }
}

function summarizeMetrics(workflow: Workflow): BriefingMetricsSummary {
  const bottleneckNodeLabel =
    workflow.nodes.find((node) => node.id === workflow.metrics.bottleneckNodeId)?.title ?? null

  return {
    tokens: workflow.metrics.tokens,
    cost: workflow.metrics.cost,
    latencyMs: workflow.metrics.latencyMs,
    successRate: workflow.metrics.successRate,
    queueCount: workflow.metrics.queueCount,
    retryCount: workflow.metrics.retryCount,
    bottleneckNodeLabel: sanitizeBriefingText(bottleneckNodeLabel) ?? null,
  }
}

function selectActiveRunId(
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
  runHistoryRecords: readonly WorkflowRunRecord[],
): string | null {
  return (
    executionGraph?.runId ??
    workflow.logs[workflow.logs.length - 1]?.runId ??
    runHistoryRecords[runHistoryRecords.length - 1]?.runId ??
    null
  )
}

function isWarnLevel(level: WorkflowRunLog['level']): boolean {
  return level === 'warn' || level === 'security' || level === 'approval'
}

function selectLogs(
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
  runHistoryRecords: readonly WorkflowRunRecord[],
  mode: BriefingInputMode,
): WorkflowRunLog[] {
  const activeRunId = selectActiveRunId(workflow, executionGraph, runHistoryRecords)

  switch (mode) {
    case 'all':
      return workflow.logs
    case 'latest-run':
      return activeRunId
        ? workflow.logs.filter((log) => log.runId === activeRunId).slice(-8)
        : workflow.logs.slice(-8)
    case 'errors-only':
      return workflow.logs.filter((log) => log.level === 'error' || isWarnLevel(log.level))
  }
}

function formatLogEntry(log: WorkflowRunLog, workflow: Workflow): string | null {
  const nodeTitle =
    log.nodeId ? workflow.nodes.find((node) => node.id === log.nodeId)?.title ?? null : null
  const prefix = nodeTitle ? `[${log.level}] ${nodeTitle}` : `[${log.level}]`
  return sanitizeBriefingText(`${prefix}: ${log.message}`)
}

function formatHudSignal(signal: HudSignal): string | null {
  return sanitizeBriefingText(`${signal.title}: ${signal.detail}`)
}

function summarizeExecution(
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
  mode: BriefingInputMode,
): BriefingInput['execution'] {
  if (!executionGraph) {
    return {
      runId: null,
      stepCount: 0,
      failedSteps: [],
      reviewSteps: [],
      retryCandidates: [],
      routeKinds: [],
    }
  }

  const failedSteps = executionGraph.steps
    .filter((step) => step.status === 'failed')
    .map((step) => sanitizeBriefingText(step.nodeTitle))
    .filter((step): step is string => step !== null)

  const reviewSteps = executionGraph.steps
    .filter((step) => step.status === 'review_required')
    .map((step) => sanitizeBriefingText(step.nodeTitle))
    .filter((step): step is string => step !== null)

  const retryCandidates = executionGraph.retryCandidates
    .map((candidateId) => executionGraph.steps.find((step) => step.id === candidateId))
    .map((step) =>
      sanitizeBriefingText(
        step?.nodeTitle ??
          workflow.nodes.find((node) => node.id === step?.nodeId)?.title ??
          null,
      ),
    )
    .filter((step): step is string => step !== null)

  if (mode === 'errors-only') {
    return {
      runId: executionGraph.runId,
      stepCount: failedSteps.length + reviewSteps.length + retryCandidates.length,
      failedSteps,
      reviewSteps,
      retryCandidates: uniqueStrings(retryCandidates),
      routeKinds: uniqueStrings(
        executionGraph.routes
          .filter(
            (route) =>
              route.kind === 'error' ||
              route.kind === 'retry' ||
              route.kind === 'review',
          )
          .map((route) => route.kind),
      ),
    }
  }

  return {
    runId: executionGraph.runId,
    stepCount: executionGraph.steps.length,
    failedSteps,
    reviewSteps,
    retryCandidates: uniqueStrings(retryCandidates),
    routeKinds: uniqueStrings(executionGraph.routes.map((route) => route.kind)),
  }
}

function summarizeConnectors(
  connectorJobs: readonly ConnectorJob[],
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
  runHistoryRecords: readonly WorkflowRunRecord[],
  mode: BriefingInputMode,
): BriefingConnectorSummary {
  const activeRunId = selectActiveRunId(workflow, executionGraph, runHistoryRecords)
  const scopedJobs =
    mode === 'all'
      ? connectorJobs
      : mode === 'latest-run'
        ? activeRunId
          ? connectorJobs.filter((job) => job.runId === activeRunId)
          : connectorJobs
        : connectorJobs.filter(
            (job) => job.status === 'failed' || job.status === 'review_required',
          )

  const selectedEntries = scopedJobs
    .map((job) => {
      const message =
        job.status === 'failed'
          ? `${job.connectorLabel} / ${job.nodeTitle}: ${job.error ?? '失敗しました。'}`
          : `${job.connectorLabel} / ${job.nodeTitle}: ${job.status}`
      return sanitizeBriefingText(message)
    })
    .filter((entry): entry is string => entry !== null)

  return {
    total: scopedJobs.length,
    failed: scopedJobs.filter((job) => job.status === 'failed').length,
    reviewRequired: scopedJobs.filter((job) => job.status === 'review_required').length,
    running: scopedJobs.filter((job) => job.status === 'running').length,
    queued: scopedJobs.filter((job) => job.status === 'queued').length,
    selectedEntries,
  }
}

function summarizeHud(hudSnapshot: HudSnapshot, mode: BriefingInputMode): BriefingHudSummary {
  const scopedSignals =
    mode === 'errors-only'
      ? hudSnapshot.signals.filter((signal) => signal.alertLevel >= 2)
      : mode === 'latest-run'
        ? hudSnapshot.signals.filter((signal) => signal.kind !== 'run_history')
        : hudSnapshot.signals

  return {
    alertLevel: hudSnapshot.alertLevel,
    priority: hudSnapshot.priority,
    summary: sanitizeBriefingText(hudSnapshot.summary) ?? '状態サマリーなし',
    recommendedAction:
      sanitizeBriefingText(hudSnapshot.recommendedAction) ?? '推奨アクションなし',
    selectedSignals: scopedSignals
      .map(formatHudSignal)
      .filter((signal): signal is string => signal !== null),
  }
}

function summarizeRunHistory(
  runHistoryRecords: readonly WorkflowRunRecord[],
  mode: BriefingInputMode,
): BriefingRunHistorySummary {
  const scopedRecords =
    mode === 'all'
      ? runHistoryRecords.slice(-5)
      : mode === 'latest-run'
        ? []
        : runHistoryRecords
            .filter((record) =>
              ['failed', 'review_required', 'cancelled'].includes(record.status),
            )
            .slice(-5)

  const selectedRecords = scopedRecords
    .map((record) =>
      sanitizeBriefingText(
        `${record.workflowTitle} / ${record.status} / logs:${record.logCount} / errors:${record.errorCount} / warnings:${record.warningCount}`,
      ),
    )
    .filter((record): record is string => record !== null)

  return {
    totalRecords: runHistoryRecords.length,
    selectedRecords,
  }
}

function buildErrorEntries(
  workflow: Workflow,
  execution: BriefingInput['execution'],
  connectors: BriefingConnectorSummary,
  hud: BriefingHudSummary,
  selectedLogs: readonly WorkflowRunLog[],
): string[] {
  const errorEntries: string[] = []

  for (const log of selectedLogs) {
    if (log.level === 'error' || isWarnLevel(log.level)) {
      const formatted = formatLogEntry(log, workflow)
      if (formatted) {
        errorEntries.push(formatted)
      }
    }
  }

  for (const stepTitle of execution.failedSteps) {
    errorEntries.push(`失敗ステップ: ${stepTitle}`)
  }
  for (const stepTitle of execution.reviewSteps) {
    errorEntries.push(`確認待ちステップ: ${stepTitle}`)
  }
  for (const connectorEntry of connectors.selectedEntries) {
    if (connectorEntry.includes('failed') || connectorEntry.includes('失敗')) {
      errorEntries.push(connectorEntry)
    }
  }
  for (const signal of hud.selectedSignals) {
    if (signal.includes('失敗') || signal.includes('確認待ち') || signal.includes('停止')) {
      errorEntries.push(signal)
    }
  }

  return uniqueStrings(
    errorEntries
      .map((entry) => sanitizeBriefingText(entry))
      .filter((entry): entry is string => entry !== null),
  )
}

function determineSeverity(
  workflowStatus: WorkflowStatus,
  workflowSummary: BriefingWorkflowSummary,
  execution: BriefingInput['execution'],
  connectors: BriefingConnectorSummary,
  hud: BriefingHudSummary,
): BriefingSeverity {
  if (
    workflowStatus === 'failed' ||
    workflowSummary.statusCounts.failed > 0 ||
    execution.failedSteps.length > 0 ||
    connectors.failed > 0
  ) {
    return 'error'
  }

  if (
    workflowStatus === 'review_required' ||
    workflowSummary.statusCounts.reviewRequired > 0 ||
    workflowSummary.statusCounts.blocked > 0 ||
    connectors.reviewRequired > 0 ||
    execution.retryCandidates.length > 0 ||
    execution.reviewSteps.length > 0 ||
    (hud.priority !== 'normal' &&
      !hud.selectedSignals.every((signal) => signal.includes('実行履歴')))
  ) {
    return 'warn'
  }

  return 'info'
}

export function collectBriefingInput(args: CollectBriefingInputArgs): BriefingInput {
  const workflowSummary = summarizeWorkflow(args.workflow)
  const metrics = summarizeMetrics(args.workflow)
  const execution = summarizeExecution(args.workflow, args.executionGraph, args.mode)
  const connectors = summarizeConnectors(
    args.connectorJobs,
    args.workflow,
    args.executionGraph,
    args.runHistoryRecords,
    args.mode,
  )
  const hud = summarizeHud(args.hudSnapshot, args.mode)
  const runHistory = summarizeRunHistory(args.runHistoryRecords, args.mode)
  const severity = determineSeverity(
    args.workflow.status,
    workflowSummary,
    execution,
    connectors,
    hud,
  )

  const selectedLogs = selectLogs(
    args.workflow,
    args.executionGraph,
    args.runHistoryRecords,
    args.mode,
  )
  const logEntries = selectedLogs
    .map((log) => formatLogEntry(log, args.workflow))
    .filter((entry): entry is string => entry !== null)

  const errorEntries = buildErrorEntries(
    args.workflow,
    execution,
    connectors,
    hud,
    selectedLogs,
  )

  const staticChars =
    args.workflow.name.length +
    hud.summary.length +
    hud.recommendedAction.length +
    workflowSummary.visibleNodes.join('').length

  const remainingForLists = Math.max(4000, MAX_BRIEFING_INPUT_CHARS - staticChars)
  const listBudget = Math.floor(remainingForLists / 5)
  const trimmedLogs = trimTextList(logEntries, listBudget)
  const trimmedErrors = trimTextList(errorEntries, listBudget)
  const trimmedSignals = trimTextList(hud.selectedSignals, listBudget)
  const trimmedConnectors = trimTextList(connectors.selectedEntries, listBudget)
  const trimmedHistory = trimTextList(runHistory.selectedRecords, listBudget)

  return {
    mode: args.mode,
    severity,
    workflow: {
      ...workflowSummary,
      visibleNodes: workflowSummary.visibleNodes.slice(-8),
    },
    metrics,
    execution,
    connectors: {
      ...connectors,
      selectedEntries: trimmedConnectors.entries,
    },
    hud: {
      ...hud,
      selectedSignals: trimmedSignals.entries,
    },
    runHistory: {
      ...runHistory,
      selectedRecords: trimmedHistory.entries,
    },
    logEntries: trimmedLogs.entries,
    errorEntries: trimmedErrors.entries,
    truncated:
      trimmedLogs.truncated ||
      trimmedErrors.truncated ||
      trimmedSignals.truncated ||
      trimmedConnectors.truncated ||
      trimmedHistory.truncated,
  }
}
