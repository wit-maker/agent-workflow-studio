import { reviveRunTraceFromAuditSummary } from './runAudit'
import type { WorkflowRunRecord } from './runHistory'
import type { RunStep, RunTrace } from './runTrace'
import {
  formatEvidenceSummary,
  type EvidenceKind,
  type EvidenceSeverity,
  type RunStepEvidence,
} from './runStepEvidence'
import type { WorkflowConnection } from './workflow'

export type RunDetailMode = 'all' | 'latest-run' | 'errors-only'
export type RunDetailReplaySource = 'current' | 'run-history'

export type StepEvidenceSummary = {
  runId: string
  stepId?: string
  nodeId?: string
  nodeTitle?: string
  status?: RunStep['status']
  evidenceCount: number
  evidenceKinds: EvidenceKind[]
  highestSeverity: EvidenceSeverity
  entries: string[]
}

export type RunDetailSummary = {
  runId: string | null
  stepCount: number
  evidenceCount: number
  excludedEvidenceCount: number
  safetyWarnings: string[]
  stepEvidence: StepEvidenceSummary[]
  selectedEvidence: string[]
}

export type RunDetailReplayOption = {
  id: string
  runId: string | null
  source: RunDetailReplaySource
  label: string
  statusLabel: string
  meta: string
  evidenceCount: number
  disabled: boolean
}

export type RunDetailFocusTarget = {
  type: 'none' | 'node' | 'connection'
  label: string
  nodeIds: string[]
  connectionId: string | null
  summary: string
}

export type RunDetailReplayView = {
  selectedOptionId: string
  selectedRunId: string | null
  selectedTrace: RunTrace | null
  selectedSource: RunDetailReplaySource | 'none'
  sourceLabel: string
  options: RunDetailReplayOption[]
  focusTarget: RunDetailFocusTarget
  replaySummary: string
}

function severityRank(severity: EvidenceSeverity): number {
  switch (severity) {
    case 'error':
      return 2
    case 'warn':
      return 1
    case 'info':
      return 0
  }
}

function formatRunStatusLabel(status: WorkflowRunRecord['status']): string {
  const labels: Record<WorkflowRunRecord['status'], string> = {
    queued: 'queued',
    running: 'running',
    success: 'success',
    failed: 'failed',
    cancelled: 'cancelled',
    review_required: 'review',
  }
  return labels[status]
}

function formatStartedAt(value: string | undefined): string {
  if (!value) return 'time n/a'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'time n/a'
  return new Date(timestamp).toLocaleString('ja-JP')
}

function formatDurationLabel(durationMs: number | undefined): string {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return 'duration n/a'
  }
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`
  }
  return `${Math.round(durationMs)}ms`
}

function buildHistoryOption(record: WorkflowRunRecord): RunDetailReplayOption {
  const evidenceCount = record.traceAudit?.evidenceCount ?? 0
  const eventCount = record.traceAudit?.events.length ?? 0
  return {
    id: record.runId,
    runId: record.runId,
    source: 'run-history',
    label: `${formatRunStatusLabel(record.status)} / ${record.runId}`,
    statusLabel: formatRunStatusLabel(record.status),
    meta: `${formatStartedAt(record.startedAt)} / ${formatDurationLabel(record.durationMs)} / audit ${eventCount}`,
    evidenceCount,
    disabled: !record.traceAudit,
  }
}

function countTraceEvidence(trace: RunTrace | null): number {
  if (!trace) return 0
  return trace.runEvidence.length + trace.steps.reduce((total, step) => total + step.evidence.length, 0)
}

function buildCurrentOption(trace: RunTrace | null): RunDetailReplayOption {
  return {
    id: 'current',
    runId: trace?.runId ?? null,
    source: 'current',
    label: trace ? `current / ${trace.runId}` : 'current traceなし',
    statusLabel: trace ? trace.status : 'none',
    meta: trace
      ? `${trace.source === 'run-history' ? 'audit snapshot' : 'runtime trace'} / evidence ${countTraceEvidence(trace)}`
      : 'Run を実行すると current trace が表示されます',
    evidenceCount: countTraceEvidence(trace),
    disabled: !trace,
  }
}

function normalizeSelectedOptionId(
  selectedRunId: string | null,
  options: readonly RunDetailReplayOption[],
): string {
  if (!selectedRunId || selectedRunId === 'current') {
    return 'current'
  }
  const selected = options.find((option) => option.id === selectedRunId)
  return selected && !selected.disabled ? selected.id : 'current'
}

function buildFocusTarget(options: {
  focusNodeId?: string | null
  focusConnectionId?: string | null
  connections?: readonly WorkflowConnection[]
}): RunDetailFocusTarget {
  const { focusNodeId = null, focusConnectionId = null, connections = [] } = options
  const focusedConnection = focusConnectionId
    ? connections.find((connection) => connection.id === focusConnectionId)
    : undefined

  if (focusedConnection) {
    return {
      type: 'connection',
      label: `edge ${focusedConnection.id}`,
      nodeIds: [focusedConnection.sourceNodeId, focusedConnection.targetNodeId],
      connectionId: focusedConnection.id,
      summary: `${focusedConnection.sourceNodeId} -> ${focusedConnection.targetNodeId}`,
    }
  }

  if (focusNodeId) {
    return {
      type: 'node',
      label: `node ${focusNodeId}`,
      nodeIds: [focusNodeId],
      connectionId: null,
      summary: '選択ノードの step evidence を強調表示します。',
    }
  }

  return {
    type: 'none',
    label: 'focusなし',
    nodeIds: [],
    connectionId: null,
    summary: 'キャンバスで node または edge を選択すると関連 evidence を強調します。',
  }
}

export function buildRunDetailReplayView(options: {
  currentTrace: RunTrace | null
  runHistoryRecords: readonly WorkflowRunRecord[]
  selectedRunId: string | null
  focusNodeId?: string | null
  focusConnectionId?: string | null
  connections?: readonly WorkflowConnection[]
}): RunDetailReplayView {
  const historyOptions = [...options.runHistoryRecords].reverse().map(buildHistoryOption)
  const replayOptions = [buildCurrentOption(options.currentTrace), ...historyOptions]
  const selectedOptionId = normalizeSelectedOptionId(options.selectedRunId, replayOptions)
  const selectedOption = replayOptions.find((option) => option.id === selectedOptionId) ?? replayOptions[0]
  const selectedRecord = selectedOption.source === 'run-history'
    ? options.runHistoryRecords.find((record) => record.runId === selectedOption.runId)
    : undefined
  const selectedTrace =
    selectedOption.source === 'run-history'
      ? selectedRecord?.traceAudit
        ? reviveRunTraceFromAuditSummary(selectedRecord.traceAudit)
        : null
      : options.currentTrace
  const focusTarget = buildFocusTarget({
    focusNodeId: options.focusNodeId,
    focusConnectionId: options.focusConnectionId,
    connections: options.connections,
  })
  const evidenceCount = countTraceEvidence(selectedTrace)
  const sourceLabel =
    selectedOption.source === 'run-history'
      ? `Audit replay / ${selectedOption.statusLabel}`
      : selectedTrace?.source === 'run-history'
        ? 'Latest audit snapshot'
        : selectedTrace
          ? 'Current runtime trace'
          : 'Traceなし'

  return {
    selectedOptionId,
    selectedRunId: selectedOption.runId,
    selectedTrace,
    selectedSource: selectedTrace ? selectedOption.source : 'none',
    sourceLabel,
    options: replayOptions,
    focusTarget,
    replaySummary: `${sourceLabel} / evidence ${evidenceCount} / focus ${focusTarget.label}`,
  }
}

function maxSeverity(entries: readonly RunStepEvidence[]): EvidenceSeverity {
  return entries.reduce<EvidenceSeverity>(
    (current, evidence) =>
      severityRank(evidence.severity) > severityRank(current) ? evidence.severity : current,
    'info',
  )
}

function uniqueEvidenceKinds(entries: readonly RunStepEvidence[]): EvidenceKind[] {
  return Array.from(new Set(entries.map((entry) => entry.kind)))
}

function isImportantEvidence(evidence: RunStepEvidence): boolean {
  return (
    evidence.severity !== 'info' ||
    evidence.kind === 'connector_error' ||
    evidence.kind === 'human_review' ||
    evidence.kind === 'retry_event' ||
    evidence.kind === 'safety_gate'
  )
}

function filterEvidenceForMode(
  entries: readonly RunStepEvidence[],
  mode: RunDetailMode,
): RunStepEvidence[] {
  if (mode === 'errors-only') {
    return entries.filter(isImportantEvidence)
  }

  if (mode === 'latest-run') {
    return entries.filter((entry) => entry.kind !== 'metric' || entry.severity !== 'info')
  }

  return [...entries]
}

function summarizeStepEvidence(step: RunStep, mode: RunDetailMode): StepEvidenceSummary | null {
  const entries = filterEvidenceForMode(step.evidence, mode)
  if (entries.length === 0) {
    return null
  }

  return {
    runId: step.runId,
    stepId: step.id,
    nodeId: step.nodeId,
    nodeTitle: step.nodeTitle,
    status: step.status,
    evidenceCount: entries.length,
    evidenceKinds: uniqueEvidenceKinds(entries),
    highestSeverity: maxSeverity(entries),
    entries: entries.map(formatEvidenceSummary),
  }
}

function summarizeRunLevelEvidence(
  trace: RunTrace,
  mode: RunDetailMode,
): StepEvidenceSummary | null {
  const entries = filterEvidenceForMode(trace.runEvidence, mode)
  if (entries.length === 0) {
    return null
  }

  return {
    runId: trace.runId,
    evidenceCount: entries.length,
    evidenceKinds: uniqueEvidenceKinds(entries),
    highestSeverity: maxSeverity(entries),
    entries: entries.map(formatEvidenceSummary),
  }
}

export function summarizeRunDetail(
  trace: RunTrace | null,
  mode: RunDetailMode,
): RunDetailSummary {
  if (!trace) {
    return {
      runId: null,
      stepCount: 0,
      evidenceCount: 0,
      excludedEvidenceCount: 0,
      safetyWarnings: [],
      stepEvidence: [],
      selectedEvidence: [],
    }
  }

  const stepEvidence = trace.steps
    .map((step) => summarizeStepEvidence(step, mode))
    .filter((summary): summary is StepEvidenceSummary => summary !== null)

  const runLevelSummary = summarizeRunLevelEvidence(trace, mode)
  const summaries = runLevelSummary ? [runLevelSummary, ...stepEvidence] : stepEvidence
  const selectedEvidence = summaries
    .flatMap((summary) => summary.entries)
    .slice(-16)

  return {
    runId: trace.runId,
    stepCount: trace.steps.length,
    evidenceCount:
      trace.runEvidence.length +
      trace.steps.reduce((total, step) => total + step.evidence.length, 0),
    excludedEvidenceCount: trace.excludedEvidenceCount,
    safetyWarnings: trace.safetyWarnings,
    stepEvidence: summaries.slice(-12),
    selectedEvidence,
  }
}
