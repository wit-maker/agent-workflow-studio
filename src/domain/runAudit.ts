import type { ExecutionRouteKind, ExecutionStepStatus } from './executionGraph'
import type { WorkflowRunMode, WorkflowRunStatus } from './runHistory'
import type { RunStep, RunTrace } from './runTrace'
import {
  buildRunAuditRouteEvents,
  normalizeRunAuditRouteEvents,
} from './runAuditRouteEvents'
import type { RuntimeAuditContractEvent } from './runtimeAuditContract'
import {
  makeRunStepEvidence,
  type EvidenceKind,
  type EvidenceSafetyLevel,
  type EvidenceSeverity,
  type RunStepEvidence,
} from './runStepEvidence'
import type { WorkflowStatus } from './workflow'

export const RUN_TRACE_AUDIT_SCHEMA_VERSION = '1.0' as const

const MAX_AUDIT_STEPS = 40
const MAX_AUDIT_STEP_EVIDENCE = 8
const MAX_AUDIT_RUN_EVIDENCE = 12
const MAX_AUDIT_EVENTS = 32

const auditStepStatuses: readonly ExecutionStepStatus[] = [
  'queued',
  'running',
  'success',
  'failed',
  'review_required',
  'skipped',
  'retry_ready',
]

const auditRouteKinds: readonly ExecutionRouteKind[] = [
  'main',
  'error',
  'retry',
  'review',
  'skip',
]

const auditEvidenceKinds: readonly EvidenceKind[] = [
  'node_status',
  'connector_job',
  'connector_error',
  'metric',
  'log_entry',
  'human_review',
  'artifact_summary',
  'safety_gate',
  'retry_event',
]

const auditEvidenceSafetyLevels: readonly EvidenceSafetyLevel[] = [
  'safe_summary',
  'sanitized_summary',
  'excluded_sensitive',
]

const auditEvidenceSeverities: readonly EvidenceSeverity[] = ['info', 'warn', 'error']

export type RunAuditEventKind =
  | 'run_started'
  | 'step_status'
  | 'step_evidence'
  | 'run_evidence'
  | 'run_finished'
  | 'safety_filter'

export type RunAuditEvidence = Pick<
  RunStepEvidence,
  | 'id'
  | 'runId'
  | 'stepId'
  | 'nodeId'
  | 'kind'
  | 'safetyLevel'
  | 'severity'
  | 'title'
  | 'summary'
  | 'createdAt'
  | 'sourceRef'
>

export type RunAuditStep = {
  id: string
  runId: string
  nodeId: string
  nodeTitle: string
  status: ExecutionStepStatus
  route: ExecutionRouteKind
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  evidence: RunAuditEvidence[]
}

export type RunAuditEvent = {
  id: string
  runId: string
  kind: RunAuditEventKind
  severity: EvidenceSeverity
  summary: string
  createdAt?: string
  stepId?: string
  nodeId?: string
}

export type RunTraceAuditSummary = {
  schemaVersion: typeof RUN_TRACE_AUDIT_SCHEMA_VERSION
  runId: string
  workflowId: string
  workflowName: string
  mode: WorkflowRunMode
  status: WorkflowRunStatus
  startedAt?: string
  finishedAt?: string
  createdAt: string
  stepCount: number
  evidenceCount: number
  excludedEvidenceCount: number
  failedStepIds: string[]
  reviewStepIds: string[]
  retryCandidateStepIds: string[]
  routeKinds: ExecutionRouteKind[]
  safetyWarnings: string[]
  steps: RunAuditStep[]
  runEvidence: RunAuditEvidence[]
  events: RunAuditEvent[]
  runtimeEvents: RuntimeAuditContractEvent[]
}

export type CreateRunTraceAuditSummaryOptions = {
  mode: WorkflowRunMode
  status: WorkflowRunStatus
  finishedAt?: string
  createdAt?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : []
}

function normalizeStatus(value: unknown, fallback: ExecutionStepStatus): ExecutionStepStatus {
  return typeof value === 'string' && (auditStepStatuses as readonly string[]).includes(value)
    ? value as ExecutionStepStatus
    : fallback
}

function normalizeRoute(value: unknown): ExecutionRouteKind {
  return typeof value === 'string' && (auditRouteKinds as readonly string[]).includes(value)
    ? value as ExecutionRouteKind
    : 'main'
}

function normalizeEvidenceSeverity(value: unknown): EvidenceSeverity {
  return typeof value === 'string' && (auditEvidenceSeverities as readonly string[]).includes(value)
    ? value as EvidenceSeverity
    : 'info'
}

function normalizeEvidenceKind(value: unknown): EvidenceKind | null {
  return typeof value === 'string' && (auditEvidenceKinds as readonly string[]).includes(value)
    ? value as EvidenceKind
    : null
}

function normalizeEvidenceSafetyLevel(value: unknown): EvidenceSafetyLevel {
  return typeof value === 'string' && (auditEvidenceSafetyLevels as readonly string[]).includes(value)
    ? value as EvidenceSafetyLevel
    : 'sanitized_summary'
}

function workflowStatusFromRunStatus(status: WorkflowRunStatus): WorkflowStatus {
  switch (status) {
    case 'queued':
    case 'running':
      return 'running'
    case 'success':
      return 'success'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    case 'review_required':
      return 'review_required'
  }
}

function cloneEvidence(evidence: RunStepEvidence): RunAuditEvidence | null {
  const safe = makeRunStepEvidence({
    id: evidence.id,
    runId: evidence.runId,
    stepId: evidence.stepId,
    nodeId: evidence.nodeId,
    kind: evidence.kind,
    severity: evidence.severity,
    title: evidence.title,
    summary: evidence.summary,
    createdAt: evidence.createdAt,
    sourceRef: evidence.sourceRef,
  })

  if (!safe) {
    return null
  }

  return {
    ...safe,
    safetyLevel:
      evidence.safetyLevel === 'excluded_sensitive'
        ? 'excluded_sensitive'
        : safe.safetyLevel,
  }
}

function cloneStep(step: RunStep): RunAuditStep {
  return {
    id: step.id,
    runId: step.runId,
    nodeId: step.nodeId,
    nodeTitle: step.nodeTitle,
    status: step.status,
    route: step.route,
    startedAt: step.startedAt,
    finishedAt: step.finishedAt,
    durationMs: step.durationMs,
    evidence: step.evidence
      .map(cloneEvidence)
      .filter((entry): entry is RunAuditEvidence => entry !== null)
      .slice(-MAX_AUDIT_STEP_EVIDENCE),
  }
}

function createAuditEvents(
  trace: RunTrace,
  steps: readonly RunAuditStep[],
  runEvidence: readonly RunAuditEvidence[],
  options: CreateRunTraceAuditSummaryOptions,
): RunAuditEvent[] {
  const events: RunAuditEvent[] = []

  if (trace.startedAt) {
    events.push({
      id: `${trace.runId}-audit-started`,
      runId: trace.runId,
      kind: 'run_started',
      severity: 'info',
      summary: `Run started in ${options.mode} mode.`,
      createdAt: trace.startedAt,
    })
  }

  for (const step of steps) {
    events.push({
      id: `${step.id}-audit-status`,
      runId: step.runId,
      kind: 'step_status',
      severity:
        step.status === 'failed'
          ? 'error'
          : step.status === 'review_required' || step.status === 'retry_ready'
            ? 'warn'
            : 'info',
      summary: `${step.nodeTitle}: ${step.status} on ${step.route} route.`,
      createdAt: step.finishedAt ?? step.startedAt,
      stepId: step.id,
      nodeId: step.nodeId,
    })

    for (const evidence of step.evidence) {
      events.push({
        id: `${evidence.id}-audit-event`,
        runId: evidence.runId,
        kind: 'step_evidence',
        severity: evidence.severity,
        summary: `${evidence.kind}: ${evidence.summary}`,
        createdAt: evidence.createdAt,
        stepId: step.id,
        nodeId: step.nodeId,
      })
    }
  }

  for (const evidence of runEvidence) {
    events.push({
      id: `${evidence.id}-audit-event`,
      runId: evidence.runId,
      kind: 'run_evidence',
      severity: evidence.severity,
      summary: `${evidence.kind}: ${evidence.summary}`,
      createdAt: evidence.createdAt,
      stepId: evidence.stepId,
      nodeId: evidence.nodeId,
    })
  }

  if (trace.excludedEvidenceCount > 0) {
    events.push({
      id: `${trace.runId}-audit-safety-filter`,
      runId: trace.runId,
      kind: 'safety_filter',
      severity: 'warn',
      summary: `${trace.excludedEvidenceCount} sensitive evidence item(s) were excluded.`,
      createdAt: options.finishedAt ?? trace.finishedAt,
    })
  }

  if (options.finishedAt ?? trace.finishedAt) {
    events.push({
      id: `${trace.runId}-audit-finished`,
      runId: trace.runId,
      kind: 'run_finished',
      severity: options.status === 'failed' ? 'error' : options.status === 'review_required' ? 'warn' : 'info',
      summary: `Run finished with ${options.status}.`,
      createdAt: options.finishedAt ?? trace.finishedAt,
    })
  }

  return events
    .map((event) => {
      const safe = makeRunStepEvidence({
        id: event.id,
        runId: event.runId,
        stepId: event.stepId,
        nodeId: event.nodeId,
        kind: event.kind === 'safety_filter' ? 'safety_gate' : 'log_entry',
        severity: event.severity,
        title: event.kind,
        summary: event.summary,
        createdAt: event.createdAt,
      })
      return safe ? { ...event, summary: safe.summary } : null
    })
    .filter((event): event is RunAuditEvent => event !== null)
    .sort((a, b) => {
      const left = a.createdAt ? Date.parse(a.createdAt) : 0
      const right = b.createdAt ? Date.parse(b.createdAt) : 0
      return left - right
    })
    .slice(-MAX_AUDIT_EVENTS)
}

export function createRunTraceAuditSummary(
  trace: RunTrace,
  options: CreateRunTraceAuditSummaryOptions,
): RunTraceAuditSummary {
  const steps = trace.steps.map(cloneStep).slice(-MAX_AUDIT_STEPS)
  const runEvidence = trace.runEvidence
    .map(cloneEvidence)
    .filter((entry): entry is RunAuditEvidence => entry !== null)
    .slice(-MAX_AUDIT_RUN_EVIDENCE)
  const evidenceCount =
    runEvidence.length + steps.reduce((total, step) => total + step.evidence.length, 0)
  const events = createAuditEvents(trace, steps, runEvidence, options)

  return {
    schemaVersion: RUN_TRACE_AUDIT_SCHEMA_VERSION,
    runId: trace.runId,
    workflowId: trace.workflowId,
    workflowName: trace.workflowName,
    mode: options.mode,
    status: options.status,
    startedAt: trace.startedAt,
    finishedAt: options.finishedAt ?? trace.finishedAt,
    createdAt: options.createdAt ?? new Date().toISOString(),
    stepCount: trace.steps.length,
    evidenceCount,
    excludedEvidenceCount: trace.excludedEvidenceCount,
    failedStepIds: trace.steps.filter((step) => step.status === 'failed').map((step) => step.id),
    reviewStepIds: trace.steps.filter((step) => step.status === 'review_required').map((step) => step.id),
    retryCandidateStepIds: trace.retryCandidateStepIds,
    routeKinds: Array.from(new Set(trace.steps.map((step) => step.route))),
    safetyWarnings: trace.safetyWarnings,
    steps,
    runEvidence,
    events,
    runtimeEvents: buildRunAuditRouteEvents({
      runId: trace.runId,
      steps,
    }),
  }
}

function normalizeAuditEvidence(raw: unknown): RunAuditEvidence | null {
  if (!isRecord(raw)) return null
  const kind = normalizeEvidenceKind(raw.kind)
  if (!kind || !isString(raw.id) || !isString(raw.runId)) return null
  const evidence = makeRunStepEvidence({
    id: raw.id,
    runId: raw.runId,
    stepId: typeof raw.stepId === 'string' ? raw.stepId : undefined,
    nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : undefined,
    kind,
    severity: normalizeEvidenceSeverity(raw.severity),
    title: typeof raw.title === 'string' ? raw.title : kind,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    sourceRef: typeof raw.sourceRef === 'string' ? raw.sourceRef : undefined,
  })
  if (!evidence) return null
  return {
    ...evidence,
    safetyLevel: normalizeEvidenceSafetyLevel(raw.safetyLevel),
  }
}

function normalizeAuditStep(raw: unknown): RunAuditStep | null {
  if (!isRecord(raw)) return null
  if (!isString(raw.id) || !isString(raw.runId) || !isString(raw.nodeId) || !isString(raw.nodeTitle)) {
    return null
  }
  return {
    id: raw.id,
    runId: raw.runId,
    nodeId: raw.nodeId,
    nodeTitle: raw.nodeTitle,
    status: normalizeStatus(raw.status, 'queued'),
    route: normalizeRoute(raw.route),
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    durationMs: finiteNumber(raw.durationMs),
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence
          .map(normalizeAuditEvidence)
          .filter((entry): entry is RunAuditEvidence => entry !== null)
          .slice(-MAX_AUDIT_STEP_EVIDENCE)
      : [],
  }
}

function normalizeAuditEvent(raw: unknown): RunAuditEvent | null {
  if (!isRecord(raw)) return null
  if (!isString(raw.id) || !isString(raw.runId) || !isString(raw.kind) || !isString(raw.summary)) {
    return null
  }
  const validKinds: readonly RunAuditEventKind[] = [
    'run_started',
    'step_status',
    'step_evidence',
    'run_evidence',
    'run_finished',
    'safety_filter',
  ]
  if (!(validKinds as readonly string[]).includes(raw.kind)) {
    return null
  }

  const safeEvent = makeRunStepEvidence({
    id: raw.id,
    runId: raw.runId,
    stepId: typeof raw.stepId === 'string' ? raw.stepId : undefined,
    nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : undefined,
    kind: raw.kind === 'safety_filter' ? 'safety_gate' : 'log_entry',
    severity: normalizeEvidenceSeverity(raw.severity),
    title: raw.kind,
    summary: raw.summary,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
  })
  if (!safeEvent) return null

  return {
    id: raw.id,
    runId: raw.runId,
    kind: raw.kind as RunAuditEventKind,
    severity: normalizeEvidenceSeverity(raw.severity),
    summary: safeEvent.summary,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    stepId: typeof raw.stepId === 'string' ? raw.stepId : undefined,
    nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : undefined,
  }
}

export function normalizeRunTraceAuditSummary(
  raw: unknown,
  now = new Date().toISOString(),
): RunTraceAuditSummary | undefined {
  if (!isRecord(raw)) return undefined
  if (!isString(raw.runId) || !isString(raw.workflowId) || !isString(raw.workflowName)) {
    return undefined
  }

  const mode = typeof raw.mode === 'string' ? raw.mode : null
  const status = typeof raw.status === 'string' ? raw.status : null
  const validModes: readonly WorkflowRunMode[] = [
    'validate',
    'mock',
    'dryRun',
    'partial',
    'full',
    'replay',
  ]
  const validStatuses: readonly WorkflowRunStatus[] = [
    'queued',
    'running',
    'success',
    'failed',
    'cancelled',
    'review_required',
  ]

  if (!mode || !(validModes as readonly string[]).includes(mode)) return undefined
  if (!status || !(validStatuses as readonly string[]).includes(status)) return undefined

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map(normalizeAuditStep)
        .filter((step): step is RunAuditStep => step !== null)
        .slice(-MAX_AUDIT_STEPS)
    : []
  const runEvidence = Array.isArray(raw.runEvidence)
    ? raw.runEvidence
        .map(normalizeAuditEvidence)
        .filter((entry): entry is RunAuditEvidence => entry !== null)
        .slice(-MAX_AUDIT_RUN_EVIDENCE)
    : []
  const evidenceCount =
    finiteNumber(raw.evidenceCount) ??
    runEvidence.length + steps.reduce((total, step) => total + step.evidence.length, 0)

  return {
    schemaVersion: RUN_TRACE_AUDIT_SCHEMA_VERSION,
    runId: raw.runId,
    workflowId: raw.workflowId,
    workflowName: raw.workflowName,
    mode: mode as WorkflowRunMode,
    status: status as WorkflowRunStatus,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    stepCount: finiteNumber(raw.stepCount) ?? steps.length,
    evidenceCount,
    excludedEvidenceCount: finiteNumber(raw.excludedEvidenceCount) ?? 0,
    failedStepIds: stringArray(raw.failedStepIds),
    reviewStepIds: stringArray(raw.reviewStepIds),
    retryCandidateStepIds: stringArray(raw.retryCandidateStepIds),
    routeKinds: Array.isArray(raw.routeKinds)
      ? raw.routeKinds
          .map(normalizeRoute)
          .filter((route, index, routes) => routes.indexOf(route) === index)
      : [],
    safetyWarnings: stringArray(raw.safetyWarnings).slice(-8),
    steps,
    runEvidence,
    events: Array.isArray(raw.events)
      ? raw.events
          .map(normalizeAuditEvent)
          .filter((event): event is RunAuditEvent => event !== null)
          .slice(-MAX_AUDIT_EVENTS)
      : [],
    runtimeEvents: normalizeRunAuditRouteEvents(raw.runtimeEvents),
  }
}

export function reviveRunTraceFromAuditSummary(audit: RunTraceAuditSummary): RunTrace {
  return {
    runId: audit.runId,
    workflowId: audit.workflowId,
    workflowName: audit.workflowName,
    status: workflowStatusFromRunStatus(audit.status),
    startedAt: audit.startedAt,
    finishedAt: audit.finishedAt,
    steps: audit.steps.map((step) => ({
      ...step,
      evidence: step.evidence,
    })),
    runEvidence: audit.runEvidence,
    retryCandidateStepIds: audit.retryCandidateStepIds,
    safetyWarnings: audit.safetyWarnings,
    excludedEvidenceCount: audit.excludedEvidenceCount,
    runtimeEvents: audit.runtimeEvents,
    source: 'run-history',
    auditCreatedAt: audit.createdAt,
    auditEventCount: audit.events.length,
  }
}
