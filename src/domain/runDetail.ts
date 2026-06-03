import { reviveRunTraceFromAuditSummary } from './runAudit'
import type { RunAuditEvidence } from './runAudit'
import { summarizeConnectionRuntimePolicy } from './edgeRuntimePolicy'
import type {
  RuntimeAuditContractEvent,
  RuntimeAuditSafeMetadataValue,
} from './runtimeAuditContract'
import { formatRuntimeAuditContractSummary, sanitizeRuntimeAuditText } from './runtimeAuditContract'
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

export type RunDetailRuntimeTimelineItem = {
  id: string
  order: number
  runId: string
  eventKind: RuntimeAuditContractEvent['kind']
  routeKind: RuntimeAuditContractEvent['routeKind']
  severity: RuntimeAuditContractEvent['severity']
  title: string
  summary: string
  createdAtLabel: string
  stepId: string | null
  sourceNodeId: string | null
  targetNodeId: string | null
  connectionId: string | null
  metadataSummary: string
  focusMatched: boolean
}

export type RunDetailRuntimeTimelineView = {
  eventCount: number
  focusedEventCount: number
  routeEventCount: number
  edgeEventCount: number
  reviewEventCount: number
  warningEventCount: number
  errorEventCount: number
  items: RunDetailRuntimeTimelineItem[]
  latestSummary: string | null
  replayHint: string
  safeCopySummary: string
}

export type RunDetailComparisonOption = {
  id: string
  runId: string
  label: string
  meta: string
  statusLabel: string
  evidenceCount: number
  auditEventCount: number
  runtimeEventCount: number
}

export type RunDetailComparisonRun = {
  runId: string
  label: string
  statusLabel: string
  modeLabel: string
  startedAtLabel: string
  durationLabel: string
  stepCount: number
  evidenceCount: number
  auditEventCount: number
  runtimeEventCount: number
  failedStepCount: number
  reviewStepCount: number
  retryCandidateCount: number
  excludedEvidenceCount: number
  safetyWarningCount: number
  nodeCount: number
  connectionCount: number
  logCount: number
  errorCount: number
  warningCount: number
}

export type RunDetailDiffSeverity = 'same' | 'changed' | 'improved' | 'regressed'

export type RunDetailDiffRow = {
  id: string
  label: string
  leftValue: string
  rightValue: string
  deltaLabel: string
  severity: RunDetailDiffSeverity
}

export type RunDetailStepEvidenceDiffGroup = {
  id: string
  nodeId: string | null
  title: string
  leftStatus: string
  rightStatus: string
  leftEvidenceCount: number
  rightEvidenceCount: number
  leftKinds: EvidenceKind[]
  rightKinds: EvidenceKind[]
  leftHighestSeverity: EvidenceSeverity
  rightHighestSeverity: EvidenceSeverity
  deltaLabel: string
  severity: RunDetailDiffSeverity
  safeEvidence: string[]
}

export type RunDetailScopedDiffView = {
  targetLabel: string
  summary: string
  groups: RunDetailStepEvidenceDiffGroup[]
  routeMetadataRows: RunDetailDiffRow[]
  routeEventSummaries: string[]
}

export type RunDetailComparisonView = {
  options: RunDetailComparisonOption[]
  leftOptionId: string
  rightOptionId: string
  leftRun: RunDetailComparisonRun | null
  rightRun: RunDetailComparisonRun | null
  rows: RunDetailDiffRow[]
  stepGroups: RunDetailStepEvidenceDiffGroup[]
  focusScope: RunDetailScopedDiffView
  summary: string
  warning: string | null
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

function formatSignedDelta(value: number): string {
  if (value === 0) return '0'
  return value > 0 ? `+${value}` : `${value}`
}

function buildHistoryOption(record: WorkflowRunRecord): RunDetailReplayOption {
  const evidenceCount = record.traceAudit?.evidenceCount ?? 0
  const eventCount = record.traceAudit?.events.length ?? 0
  const runtimeEventCount = record.traceAudit?.runtimeEvents.length ?? 0
  return {
    id: record.runId,
    runId: record.runId,
    source: 'run-history',
    label: `${formatRunStatusLabel(record.status)} / ${record.runId}`,
    statusLabel: formatRunStatusLabel(record.status),
    meta: `${formatStartedAt(record.startedAt)} / ${formatDurationLabel(record.durationMs)} / audit ${eventCount} / runtime ${runtimeEventCount}`,
    evidenceCount,
    disabled: !record.traceAudit,
  }
}

function buildComparisonOption(record: WorkflowRunRecord): RunDetailComparisonOption | null {
  if (!record.traceAudit) return null
  return {
    id: record.runId,
    runId: record.runId,
    label: `${formatRunStatusLabel(record.status)} / ${record.runId}`,
    statusLabel: formatRunStatusLabel(record.status),
    meta: `${formatStartedAt(record.startedAt)} / ${formatDurationLabel(record.durationMs)} / audit ${record.traceAudit.events.length} / runtime ${record.traceAudit.runtimeEvents.length}`,
    evidenceCount: record.traceAudit.evidenceCount,
    auditEventCount: record.traceAudit.events.length,
    runtimeEventCount: record.traceAudit.runtimeEvents.length,
  }
}

function buildComparisonRun(record: WorkflowRunRecord): RunDetailComparisonRun | null {
  if (!record.traceAudit) return null
  const audit = record.traceAudit
  return {
    runId: record.runId,
    label: `${formatRunStatusLabel(record.status)} / ${record.runId}`,
    statusLabel: formatRunStatusLabel(record.status),
    modeLabel: audit.mode,
    startedAtLabel: formatStartedAt(audit.startedAt ?? record.startedAt),
    durationLabel: formatDurationLabel(record.durationMs),
    stepCount: audit.stepCount,
    evidenceCount: audit.evidenceCount,
    auditEventCount: audit.events.length,
    runtimeEventCount: audit.runtimeEvents.length,
    failedStepCount: audit.failedStepIds.length,
    reviewStepCount: audit.reviewStepIds.length,
    retryCandidateCount: audit.retryCandidateStepIds.length,
    excludedEvidenceCount: audit.excludedEvidenceCount,
    safetyWarningCount: audit.safetyWarnings.length,
    nodeCount: record.nodeCount,
    connectionCount: record.connectionCount,
    logCount: record.logCount,
    errorCount: record.errorCount,
    warningCount: record.warningCount,
  }
}

function selectComparisonRunId(
  requestedRunId: string | null,
  options: readonly RunDetailComparisonOption[],
  fallbackIndex: number,
  avoidRunId?: string,
): string {
  const requested = requestedRunId
    ? options.find((option) => option.runId === requestedRunId && option.runId !== avoidRunId)
    : undefined
  if (requested) return requested.runId

  const fallback =
    options.find((option, index) => index >= fallbackIndex && option.runId !== avoidRunId) ??
    options.find((option) => option.runId !== avoidRunId) ??
    options[0]
  return fallback?.runId ?? ''
}

function compareTextRow(
  id: string,
  label: string,
  leftValue: string,
  rightValue: string,
): RunDetailDiffRow {
  const same = leftValue === rightValue
  return {
    id,
    label,
    leftValue,
    rightValue,
    deltaLabel: same ? 'same' : 'changed',
    severity: same ? 'same' : 'changed',
  }
}

function compareNumberRow(options: {
  id: string
  label: string
  leftValue: number
  rightValue: number
  lowerIsBetter?: boolean
  neutral?: boolean
}): RunDetailDiffRow {
  const delta = options.rightValue - options.leftValue
  let severity: RunDetailDiffSeverity = 'same'
  if (delta !== 0 && options.neutral) {
    severity = 'changed'
  } else if (delta !== 0) {
    const improved = options.lowerIsBetter ? delta < 0 : delta > 0
    severity = improved ? 'improved' : 'regressed'
  }

  return {
    id: options.id,
    label: options.label,
    leftValue: String(options.leftValue),
    rightValue: String(options.rightValue),
    deltaLabel: formatSignedDelta(delta),
    severity,
  }
}

function buildComparisonRows(
  leftRun: RunDetailComparisonRun,
  rightRun: RunDetailComparisonRun,
): RunDetailDiffRow[] {
  return [
    compareTextRow('status', 'Status', leftRun.statusLabel, rightRun.statusLabel),
    compareTextRow('mode', 'Mode', leftRun.modeLabel, rightRun.modeLabel),
    compareTextRow('duration', 'Duration', leftRun.durationLabel, rightRun.durationLabel),
    compareNumberRow({
      id: 'step-count',
      label: 'Step count',
      leftValue: leftRun.stepCount,
      rightValue: rightRun.stepCount,
      neutral: true,
    }),
    compareNumberRow({
      id: 'evidence-count',
      label: 'Evidence count',
      leftValue: leftRun.evidenceCount,
      rightValue: rightRun.evidenceCount,
      neutral: true,
    }),
    compareNumberRow({
      id: 'audit-events',
      label: 'Audit events',
      leftValue: leftRun.auditEventCount,
      rightValue: rightRun.auditEventCount,
      neutral: true,
    }),
    compareNumberRow({
      id: 'runtime-events',
      label: 'Runtime events',
      leftValue: leftRun.runtimeEventCount,
      rightValue: rightRun.runtimeEventCount,
      neutral: true,
    }),
    compareNumberRow({
      id: 'failed-steps',
      label: 'Failed steps',
      leftValue: leftRun.failedStepCount,
      rightValue: rightRun.failedStepCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'review-steps',
      label: 'Review steps',
      leftValue: leftRun.reviewStepCount,
      rightValue: rightRun.reviewStepCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'retry-candidates',
      label: 'Retry candidates',
      leftValue: leftRun.retryCandidateCount,
      rightValue: rightRun.retryCandidateCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'excluded-evidence',
      label: 'Excluded evidence',
      leftValue: leftRun.excludedEvidenceCount,
      rightValue: rightRun.excludedEvidenceCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'safety-warnings',
      label: 'Safety warnings',
      leftValue: leftRun.safetyWarningCount,
      rightValue: rightRun.safetyWarningCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'error-logs',
      label: 'Error logs',
      leftValue: leftRun.errorCount,
      rightValue: rightRun.errorCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'warning-logs',
      label: 'Warning logs',
      leftValue: leftRun.warningCount,
      rightValue: rightRun.warningCount,
      lowerIsBetter: true,
    }),
    compareNumberRow({
      id: 'node-count',
      label: 'Node count',
      leftValue: leftRun.nodeCount,
      rightValue: rightRun.nodeCount,
      neutral: true,
    }),
    compareNumberRow({
      id: 'connection-count',
      label: 'Connection count',
      leftValue: leftRun.connectionCount,
      rightValue: rightRun.connectionCount,
      neutral: true,
    }),
  ]
}

type StepEvidenceAggregate = {
  nodeId: string | null
  title: string
  statuses: string[]
  routes: string[]
  evidence: RunAuditEvidence[]
}

function emptyStepEvidenceAggregate(nodeId: string | null, title: string): StepEvidenceAggregate {
  return {
    nodeId,
    title,
    statuses: [],
    routes: [],
    evidence: [],
  }
}

function normalizeAggregateKey(nodeId: string | null): string {
  return nodeId ?? '__run_level__'
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)))
}

function aggregateAuditEvidence(
  record: WorkflowRunRecord | undefined,
): Map<string, StepEvidenceAggregate> {
  const aggregates = new Map<string, StepEvidenceAggregate>()
  const audit = record?.traceAudit
  if (!audit) return aggregates

  const ensureAggregate = (nodeId: string | null, title: string): StepEvidenceAggregate => {
    const key = normalizeAggregateKey(nodeId)
    const existing = aggregates.get(key)
    if (existing) return existing
    const created = emptyStepEvidenceAggregate(nodeId, title)
    aggregates.set(key, created)
    return created
  }

  for (const step of audit.steps) {
    const aggregate = ensureAggregate(step.nodeId, step.nodeTitle)
    aggregate.statuses.push(step.status)
    aggregate.routes.push(step.route)
    aggregate.evidence.push(...step.evidence)
  }

  if (audit.runEvidence.length > 0) {
    ensureAggregate(null, 'Run level audit').evidence.push(...audit.runEvidence)
  }

  return aggregates
}

function highestEvidenceSeverity(entries: readonly RunAuditEvidence[]): EvidenceSeverity {
  if (entries.length === 0) return 'info'
  return entries.reduce<EvidenceSeverity>(
    (current, evidence) =>
      severityRank(evidence.severity) > severityRank(current) ? evidence.severity : current,
    'info',
  )
}

function countSeverity(entries: readonly RunAuditEvidence[], severity: EvidenceSeverity): number {
  return entries.filter((entry) => entry.severity === severity).length
}

function formatAggregateStatus(aggregate: StepEvidenceAggregate | undefined): string {
  if (!aggregate) return 'missing'
  return uniqueStrings(aggregate.statuses).join(', ') || 'none'
}

function formatAggregateKinds(entries: readonly RunAuditEvidence[]): EvidenceKind[] {
  return Array.from(new Set(entries.map((entry) => entry.kind)))
}

function formatAggregateEvidence(evidence: RunAuditEvidence): string {
  return `${evidence.kind} / ${evidence.severity}: ${evidence.title} - ${evidence.summary}`
}

function chooseGroupSeverity(
  leftAggregate: StepEvidenceAggregate | undefined,
  rightAggregate: StepEvidenceAggregate | undefined,
): RunDetailDiffSeverity {
  if (!leftAggregate && rightAggregate) return 'changed'
  if (leftAggregate && !rightAggregate) return 'changed'
  if (!leftAggregate || !rightAggregate) return 'same'

  const leftErrors = countSeverity(leftAggregate.evidence, 'error')
  const rightErrors = countSeverity(rightAggregate.evidence, 'error')
  if (leftErrors !== rightErrors) {
    return rightErrors < leftErrors ? 'improved' : 'regressed'
  }

  const leftWarns = countSeverity(leftAggregate.evidence, 'warn')
  const rightWarns = countSeverity(rightAggregate.evidence, 'warn')
  if (leftWarns !== rightWarns) {
    return rightWarns < leftWarns ? 'improved' : 'regressed'
  }

  const leftStatus = formatAggregateStatus(leftAggregate)
  const rightStatus = formatAggregateStatus(rightAggregate)
  const leftKinds = formatAggregateKinds(leftAggregate.evidence).join(', ')
  const rightKinds = formatAggregateKinds(rightAggregate.evidence).join(', ')
  if (
    leftStatus !== rightStatus ||
    leftKinds !== rightKinds ||
    leftAggregate.evidence.length !== rightAggregate.evidence.length
  ) {
    return 'changed'
  }

  return 'same'
}

function buildStepEvidenceDiffGroup(
  key: string,
  leftAggregate: StepEvidenceAggregate | undefined,
  rightAggregate: StepEvidenceAggregate | undefined,
): RunDetailStepEvidenceDiffGroup {
  const title = rightAggregate?.title ?? leftAggregate?.title ?? key
  const nodeId = rightAggregate?.nodeId ?? leftAggregate?.nodeId ?? null
  const leftEvidence = leftAggregate?.evidence ?? []
  const rightEvidence = rightAggregate?.evidence ?? []
  const evidenceDelta = rightEvidence.length - leftEvidence.length

  return {
    id: key,
    nodeId,
    title,
    leftStatus: formatAggregateStatus(leftAggregate),
    rightStatus: formatAggregateStatus(rightAggregate),
    leftEvidenceCount: leftEvidence.length,
    rightEvidenceCount: rightEvidence.length,
    leftKinds: formatAggregateKinds(leftEvidence),
    rightKinds: formatAggregateKinds(rightEvidence),
    leftHighestSeverity: highestEvidenceSeverity(leftEvidence),
    rightHighestSeverity: highestEvidenceSeverity(rightEvidence),
    deltaLabel: formatSignedDelta(evidenceDelta),
    severity: chooseGroupSeverity(leftAggregate, rightAggregate),
    safeEvidence: [...leftEvidence, ...rightEvidence]
      .slice(-4)
      .map(formatAggregateEvidence),
  }
}

function rankStepEvidenceDiffGroup(group: RunDetailStepEvidenceDiffGroup): number {
  const severityRankMap: Record<RunDetailDiffSeverity, number> = {
    regressed: 4,
    improved: 3,
    changed: 2,
    same: 1,
  }
  return (
    severityRankMap[group.severity] * 1000 +
    Math.max(severityRank(group.leftHighestSeverity), severityRank(group.rightHighestSeverity)) * 100 +
    Math.abs(group.rightEvidenceCount - group.leftEvidenceCount)
  )
}

function buildStepEvidenceDiffGroups(
  leftRecord: WorkflowRunRecord | undefined,
  rightRecord: WorkflowRunRecord | undefined,
): RunDetailStepEvidenceDiffGroup[] {
  const leftAggregates = aggregateAuditEvidence(leftRecord)
  const rightAggregates = aggregateAuditEvidence(rightRecord)
  const keys = uniqueStrings([...leftAggregates.keys(), ...rightAggregates.keys()])

  return keys
    .map((key) =>
      buildStepEvidenceDiffGroup(key, leftAggregates.get(key), rightAggregates.get(key)),
    )
    .sort((a, b) => rankStepEvidenceDiffGroup(b) - rankStepEvidenceDiffGroup(a))
    .slice(0, 8)
}

type EdgeRouteMetadataAggregate = {
  eventCount: number
  routeKinds: string[]
  eventKinds: string[]
  severityMix: string
  statusValues: string[]
  routeValues: string[]
  conditionModes: string[]
  policyResults: string[]
  delayValues: string[]
  retryValues: string[]
  errorRouteValues: string[]
  latestSummary: string
  summaries: string[]
}

const emptyEdgeRouteMetadataAggregate: EdgeRouteMetadataAggregate = {
  eventCount: 0,
  routeKinds: [],
  eventKinds: [],
  severityMix: 'info 0 / warn 0 / error 0',
  statusValues: [],
  routeValues: [],
  conditionModes: [],
  policyResults: [],
  delayValues: [],
  retryValues: [],
  errorRouteValues: [],
  latestSummary: 'none',
  summaries: [],
}

function formatMetadataValue(value: RuntimeAuditSafeMetadataValue | undefined): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null
  return sanitizeRuntimeAuditText(value, 80)
}

function formatMetadataSet(
  events: readonly RuntimeAuditContractEvent[],
  key: string,
): string[] {
  return uniqueStrings(
    events
      .map((event) => formatMetadataValue(event.safeMetadata?.[key]))
      .filter((value): value is string => value !== null),
  )
}

function formatMetadataPairSet(
  events: readonly RuntimeAuditContractEvent[],
  leftKey: string,
  rightKey: string,
  fallback: string,
): string[] {
  return uniqueStrings(
    events
      .map((event) => {
        const left = formatMetadataValue(event.safeMetadata?.[leftKey])
        const right = formatMetadataValue(event.safeMetadata?.[rightKey])
        if (!left && !right) return null
        return `${left ?? fallback}:${right ?? fallback}`
      })
      .filter((value): value is string => value !== null),
  )
}

function routeEventMatchesConnection(
  event: RuntimeAuditContractEvent,
  connection: WorkflowConnection,
): boolean {
  if (event.connectionId === connection.id) return true
  if (event.sourceNodeId === connection.sourceNodeId && event.targetNodeId === connection.targetNodeId) {
    return true
  }
  if (event.sourceNodeId === connection.sourceNodeId && !event.targetNodeId) {
    return true
  }
  return event.kind === 'node_runtime' && event.sourceNodeId === connection.targetNodeId
}

function formatSeverityMix(events: readonly RuntimeAuditContractEvent[]): string {
  const info = events.filter((event) => event.severity === 'info').length
  const warn = events.filter((event) => event.severity === 'warn').length
  const error = events.filter((event) => event.severity === 'error').length
  return `info ${info} / warn ${warn} / error ${error}`
}

function formatRouteEventSummary(event: RuntimeAuditContractEvent): string {
  const title = sanitizeRuntimeAuditText(event.title, 72) ?? event.kind
  const summary = sanitizeRuntimeAuditText(event.summary, 140) ?? 'summary excluded'
  return [
    event.kind,
    event.routeKind,
    event.severity,
    event.connectionId ? `edge ${event.connectionId}` : null,
    event.sourceNodeId ? `from ${event.sourceNodeId}` : null,
    event.targetNodeId ? `to ${event.targetNodeId}` : null,
    `${title}: ${summary}`,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(' / ')
}

function aggregateEdgeRouteMetadata(
  record: WorkflowRunRecord | undefined,
  connection: WorkflowConnection,
): EdgeRouteMetadataAggregate {
  const events =
    record?.traceAudit?.runtimeEvents.filter((event) =>
      routeEventMatchesConnection(event, connection),
    ) ?? []
  if (events.length === 0) {
    return emptyEdgeRouteMetadataAggregate
  }

  const policyPassedValues = formatMetadataSet(events, 'policyPassed')
  const policyReasons = formatMetadataSet(events, 'policyReason')
  const delayValues = formatMetadataSet(events, 'delayMs')
  const retryValues = formatMetadataPairSet(events, 'retryEnabled', 'maxAttempts', 'n/a')
  const errorRouteValues = formatMetadataPairSet(
    events,
    'errorRouteEnabled',
    'errorRouteTargetNodeId',
    'n/a',
  )

  return {
    eventCount: events.length,
    routeKinds: uniqueStrings(events.map((event) => event.routeKind)),
    eventKinds: uniqueStrings(events.map((event) => event.kind)),
    severityMix: formatSeverityMix(events),
    statusValues: formatMetadataSet(events, 'status'),
    routeValues: formatMetadataSet(events, 'route'),
    conditionModes: formatMetadataSet(events, 'conditionMode'),
    policyResults: uniqueStrings([...policyPassedValues, ...policyReasons]),
    delayValues,
    retryValues,
    errorRouteValues,
    latestSummary: formatRouteEventSummary(events[events.length - 1]),
    summaries: events.slice(-4).map(formatRouteEventSummary),
  }
}

function compareRouteMetadataTextRow(
  id: string,
  label: string,
  leftValues: readonly string[],
  rightValues: readonly string[],
): RunDetailDiffRow {
  return compareTextRow(
    id,
    label,
    leftValues.join(', ') || 'none',
    rightValues.join(', ') || 'none',
  )
}

function buildEdgeRouteMetadataRows(
  leftRecord: WorkflowRunRecord | undefined,
  rightRecord: WorkflowRunRecord | undefined,
  connection: WorkflowConnection,
): {
  rows: RunDetailDiffRow[]
  summaries: string[]
} {
  const left = aggregateEdgeRouteMetadata(leftRecord, connection)
  const right = aggregateEdgeRouteMetadata(rightRecord, connection)

  const rows: RunDetailDiffRow[] = [
    compareNumberRow({
      id: 'focused-edge-route-event-count',
      label: 'Focused edge route events',
      leftValue: left.eventCount,
      rightValue: right.eventCount,
      neutral: true,
    }),
    compareRouteMetadataTextRow('focused-edge-route-kinds', 'Route kinds', left.routeKinds, right.routeKinds),
    compareRouteMetadataTextRow('focused-edge-event-kinds', 'Event kinds', left.eventKinds, right.eventKinds),
    compareTextRow('focused-edge-severity-mix', 'Severity mix', left.severityMix, right.severityMix),
    compareRouteMetadataTextRow('focused-edge-status', 'Status metadata', left.statusValues, right.statusValues),
    compareRouteMetadataTextRow('focused-edge-route-values', 'Route metadata', left.routeValues, right.routeValues),
    compareRouteMetadataTextRow('focused-edge-condition', 'Condition mode', left.conditionModes, right.conditionModes),
    compareRouteMetadataTextRow('focused-edge-policy-result', 'Policy result', left.policyResults, right.policyResults),
    compareRouteMetadataTextRow('focused-edge-delay', 'Delay metadata', left.delayValues, right.delayValues),
    compareRouteMetadataTextRow('focused-edge-retry', 'Retry metadata', left.retryValues, right.retryValues),
    compareRouteMetadataTextRow('focused-edge-error-route', 'Error-route metadata', left.errorRouteValues, right.errorRouteValues),
    compareTextRow('focused-edge-latest-event', 'Latest route event', left.latestSummary, right.latestSummary),
  ]

  const summaries = uniqueStrings([
    ...left.summaries.map((summary) => `Base: ${summary}`),
    ...right.summaries.map((summary) => `Compare: ${summary}`),
  ]).slice(-6)

  return {
    rows: rows.filter((row) => row.severity !== 'same' || row.id === 'focused-edge-route-event-count'),
    summaries,
  }
}

function nodeIdsForFocusedScope(options: {
  focusNodeId?: string | null
  focusConnectionId?: string | null
  connections?: readonly WorkflowConnection[]
}): string[] {
  if (options.focusConnectionId) {
    const connection = options.connections?.find((item) => item.id === options.focusConnectionId)
    return connection ? [connection.sourceNodeId, connection.targetNodeId] : []
  }

  return options.focusNodeId ? [options.focusNodeId] : []
}

function buildFocusedScopeView(options: {
  groups: readonly RunDetailStepEvidenceDiffGroup[]
  leftRecord?: WorkflowRunRecord
  rightRecord?: WorkflowRunRecord
  focusNodeId?: string | null
  focusConnectionId?: string | null
  connections?: readonly WorkflowConnection[]
}): RunDetailScopedDiffView {
  const nodeIds = nodeIdsForFocusedScope(options)
  if (options.focusConnectionId) {
    const connection = options.connections?.find((item) => item.id === options.focusConnectionId)
    const groups = connection
      ? options.groups.filter((group) => group.nodeId && nodeIds.includes(group.nodeId))
      : []
    const policySummary = connection ? summarizeConnectionRuntimePolicy(connection) : null
    const routeMetadata = connection
      ? buildEdgeRouteMetadataRows(options.leftRecord, options.rightRecord, connection)
      : { rows: [], summaries: [] }
    return {
      targetLabel: connection
        ? `edge ${connection.sourceNodeId} -> ${connection.targetNodeId}`
        : `edge ${options.focusConnectionId}`,
      summary: connection
        ? `${connection.kind} / ${connection.status} / ${policySummary?.conditionSummary ?? 'no branch condition'} / ${policySummary?.retrySummary ?? 'no retry policy'}`
        : 'Focused edge は現在の workflow connections で見つかりません。',
      groups,
      routeMetadataRows: routeMetadata.rows,
      routeEventSummaries: routeMetadata.summaries,
    }
  }

  if (options.focusNodeId) {
    const groups = options.groups.filter((group) => group.nodeId === options.focusNodeId)
    return {
      targetLabel: `node ${options.focusNodeId}`,
      summary: groups.length > 0
        ? 'Focused node の safe step evidence 差分です。'
        : 'Focused node の audit evidence は選択した2件にありません。',
      groups,
      routeMetadataRows: [],
      routeEventSummaries: [],
    }
  }

  return {
    targetLabel: 'focusなし',
    summary: 'Canvas で node または edge を選択すると scoped diff を表示します。',
    groups: options.groups.filter((group) => group.severity !== 'same').slice(0, 3),
    routeMetadataRows: [],
    routeEventSummaries: [],
  }
}

export function buildRunComparisonView(options: {
  runHistoryRecords: readonly WorkflowRunRecord[]
  leftRunId?: string | null
  rightRunId?: string | null
  focusNodeId?: string | null
  focusConnectionId?: string | null
  connections?: readonly WorkflowConnection[]
}): RunDetailComparisonView {
  const comparisonOptions = [...options.runHistoryRecords]
    .reverse()
    .map(buildComparisonOption)
    .filter((option): option is RunDetailComparisonOption => option !== null)

  if (comparisonOptions.length < 2) {
    return {
      options: comparisonOptions,
      leftOptionId: comparisonOptions[0]?.runId ?? '',
      rightOptionId: '',
      leftRun: null,
      rightRun: null,
      rows: [],
      stepGroups: [],
      focusScope: {
        targetLabel: 'focusなし',
        summary: 'safe audit summary が2件以上保存されるまで scoped diff は表示されません。',
        groups: [],
        routeMetadataRows: [],
        routeEventSummaries: [],
      },
      summary: 'Compare には traceAudit 付き run が2件必要です。',
      warning: 'safe audit summary が2件以上保存されるまで比較は表示されません。',
    }
  }

  const leftOptionId = selectComparisonRunId(options.leftRunId ?? null, comparisonOptions, 0)
  const rightOptionId = selectComparisonRunId(
    options.rightRunId ?? null,
    comparisonOptions,
    1,
    leftOptionId,
  )
  const leftRecord = options.runHistoryRecords.find((record) => record.runId === leftOptionId)
  const rightRecord = options.runHistoryRecords.find((record) => record.runId === rightOptionId)
  const leftRun = leftRecord ? buildComparisonRun(leftRecord) : null
  const rightRun = rightRecord ? buildComparisonRun(rightRecord) : null

  if (!leftRun || !rightRun) {
    return {
      options: comparisonOptions,
      leftOptionId,
      rightOptionId,
      leftRun: null,
      rightRun: null,
      rows: [],
      stepGroups: [],
      focusScope: {
        targetLabel: 'focusなし',
        summary: 'Compare 対象の safe audit summary を復元できません。',
        groups: [],
        routeMetadataRows: [],
        routeEventSummaries: [],
      },
      summary: 'Compare 対象の safe audit summary を復元できません。',
      warning: '無効な run record は比較から除外されます。',
    }
  }

  const rows = buildComparisonRows(leftRun, rightRun)
  const stepGroups = buildStepEvidenceDiffGroups(leftRecord, rightRecord)
  const focusScope = buildFocusedScopeView({
    groups: stepGroups,
    leftRecord,
    rightRecord,
    focusNodeId: options.focusNodeId,
    focusConnectionId: options.focusConnectionId,
    connections: options.connections,
  })
  const changedCount = rows.filter((row) => row.severity !== 'same').length
  const regressedCount = rows.filter((row) => row.severity === 'regressed').length
  const improvedCount = rows.filter((row) => row.severity === 'improved').length

  return {
    options: comparisonOptions,
    leftOptionId,
    rightOptionId,
    leftRun,
    rightRun,
    rows,
    stepGroups,
    focusScope,
    summary: `Audit diff / changed ${changedCount} / improved ${improvedCount} / regressed ${regressedCount}`,
    warning: null,
  }
}

function countTraceEvidence(trace: RunTrace | null): number {
  if (!trace) return 0
  return trace.runEvidence.length + trace.steps.reduce((total, step) => total + step.evidence.length, 0)
}

function countTraceRuntimeEvents(trace: RunTrace | null): number {
  return trace?.runtimeEvents?.length ?? 0
}

function buildCurrentOption(trace: RunTrace | null): RunDetailReplayOption {
  return {
    id: 'current',
    runId: trace?.runId ?? null,
    source: 'current',
    label: trace ? `current / ${trace.runId}` : 'current traceなし',
    statusLabel: trace ? trace.status : 'none',
    meta: trace
      ? `${trace.source === 'run-history' ? 'audit snapshot' : 'runtime trace'} / evidence ${countTraceEvidence(trace)} / runtime ${countTraceRuntimeEvents(trace)}`
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
  const runtimeEventCount = countTraceRuntimeEvents(selectedTrace)
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
    replaySummary: `${sourceLabel} / evidence ${evidenceCount} / runtime ${runtimeEventCount} / focus ${focusTarget.label}`,
  }
}

const RUNTIME_TIMELINE_METADATA_KEYS = [
  'status',
  'route',
  'conditionMode',
  'policyPassed',
  'policyReason',
  'delayMs',
  'retryEnabled',
  'maxAttempts',
  'errorRouteEnabled',
  'errorRouteTargetNodeId',
  'connectionKind',
  'connectionStatus',
] as const

function timestampRank(event: RuntimeAuditContractEvent, index: number): number {
  const timestamp = event.createdAt ? Date.parse(event.createdAt) : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : index
}

function formatRuntimeTimelineCreatedAt(event: RuntimeAuditContractEvent): string {
  if (!event.createdAt) return 'time n/a'
  const timestamp = Date.parse(event.createdAt)
  if (!Number.isFinite(timestamp)) return 'time n/a'
  return new Date(timestamp).toLocaleString('ja-JP')
}

function eventMatchesTimelineFocus(options: {
  event: RuntimeAuditContractEvent
  focusNodeId?: string | null
  focusConnectionId?: string | null
}): boolean {
  const { event, focusNodeId = null, focusConnectionId = null } = options
  if (focusConnectionId && event.connectionId === focusConnectionId) return true
  if (!focusNodeId) return false
  return event.sourceNodeId === focusNodeId || event.targetNodeId === focusNodeId
}

function formatRuntimeTimelineMetadata(event: RuntimeAuditContractEvent): string {
  const metadata = event.safeMetadata
  if (!metadata) return 'metadata none'

  const entries = RUNTIME_TIMELINE_METADATA_KEYS
    .map((key) => {
      const value = formatMetadataValue(metadata[key])
      return value ? `${key}:${value}` : null
    })
    .filter((entry): entry is string => entry !== null)

  return entries.length > 0 ? entries.join(' / ') : 'metadata none'
}

function buildRuntimeTimelineItem(
  event: RuntimeAuditContractEvent,
  order: number,
  focusMatched: boolean,
): RunDetailRuntimeTimelineItem {
  return {
    id: event.id,
    order,
    runId: event.runId,
    eventKind: event.kind,
    routeKind: event.routeKind,
    severity: event.severity,
    title: sanitizeRuntimeAuditText(event.title, 96) ?? event.kind,
    summary: sanitizeRuntimeAuditText(event.summary, 180) ?? 'summary excluded',
    createdAtLabel: formatRuntimeTimelineCreatedAt(event),
    stepId: event.stepId ?? null,
    sourceNodeId: event.sourceNodeId ?? null,
    targetNodeId: event.targetNodeId ?? null,
    connectionId: event.connectionId ?? null,
    metadataSummary: formatRuntimeTimelineMetadata(event),
    focusMatched,
  }
}

export function buildRunDetailRuntimeTimelineView(options: {
  trace: RunTrace | null
  focusNodeId?: string | null
  focusConnectionId?: string | null
  limit?: number
}): RunDetailRuntimeTimelineView {
  const events = options.trace?.runtimeEvents ?? []
  const ordered = events
    .map((event, index) => ({ event, index, rank: timestampRank(event, index) }))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank
      return left.event.id.localeCompare(right.event.id)
    })

  const focusMatchedEvents = ordered.filter(({ event }) =>
    eventMatchesTimelineFocus({
      event,
      focusNodeId: options.focusNodeId,
      focusConnectionId: options.focusConnectionId,
    }),
  )
  const visibleSource = focusMatchedEvents.length > 0 ? focusMatchedEvents : ordered
  const limit = options.limit ?? 10
  const items = visibleSource
    .slice(-limit)
    .map(({ event }, index) =>
      buildRuntimeTimelineItem(
        event,
        Math.max(0, visibleSource.length - limit) + index + 1,
        eventMatchesTimelineFocus({
          event,
          focusNodeId: options.focusNodeId,
          focusConnectionId: options.focusConnectionId,
        }),
      ),
    )

  const latestEvent = ordered[ordered.length - 1]?.event ?? null
  const routeEventCount = events.filter((event) => event.kind === 'route_observed').length
  const edgeEventCount = events.filter((event) => event.connectionId).length
  const reviewEventCount = events.filter((event) => event.routeKind === 'review').length
  const warningEventCount = events.filter((event) => event.severity === 'warn').length
  const errorEventCount = events.filter((event) => event.severity === 'error').length
  const focusedEventCount = focusMatchedEvents.length
  const focusLabel = options.focusConnectionId
    ? `edge ${options.focusConnectionId}`
    : options.focusNodeId
      ? `node ${options.focusNodeId}`
      : 'focusなし'

  return {
    eventCount: events.length,
    focusedEventCount,
    routeEventCount,
    edgeEventCount,
    reviewEventCount,
    warningEventCount,
    errorEventCount,
    items,
    latestSummary: latestEvent ? formatRuntimeAuditContractSummary(latestEvent) : null,
    replayHint:
      events.length === 0
        ? 'Runtime timeline は Run 実行後または audit snapshot 選択後に表示されます。'
        : focusedEventCount > 0
          ? `${focusLabel} の safe runtime events を時系列で表示しています。`
          : 'Safe runtime events を時系列で表示しています。',
    safeCopySummary: [
      `runtime timeline: events ${events.length}`,
      `route ${routeEventCount} / edge ${edgeEventCount} / review ${reviewEventCount}`,
      `warn ${warningEventCount} / error ${errorEventCount}`,
      latestEvent ? `latest: ${formatRuntimeAuditContractSummary(latestEvent)}` : 'latest: none',
    ].join('\n'),
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
