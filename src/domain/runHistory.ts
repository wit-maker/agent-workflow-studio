// Run History domain model (Phase 1b foundation).
//
// 目的: 過去の Run を「事実」として残し、将来の実行履歴 / 監査ログ /
// 状況補佐官 / 認知HUD が参照できる最小の Run Record を定義する。
//
// このモジュールは pure：外部API / ブラウザAPI / ファイルIOへ依存しない。
// 永続化は src/storage/runHistoryStorage.ts に分離する。

import type { Workflow, WorkflowRunLog } from './workflow'
import type { WorkflowDocument } from './workflowDocument'
import { CURRENT_WORKFLOW_SCHEMA_VERSION } from './workflowDocument'
import {
  normalizeRunTraceAuditSummary,
  type RunTraceAuditSummary,
} from './runAudit'

// ---- Public types ----

export type WorkflowRunMode =
  | 'validate'
  | 'mock'
  | 'dryRun'
  | 'partial'
  | 'full'
  | 'replay'

export type WorkflowRunStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'review_required'

export type WorkflowRunRecord = {
  runId: string
  workflowId: string
  workflowTitle: string
  workflowSchemaVersion: string
  mode: WorkflowRunMode
  status: WorkflowRunStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  nodeCount: number
  connectionCount: number
  logCount: number
  errorCount: number
  warningCount: number
  artifactId?: string
  traceAudit?: RunTraceAuditSummary
  sourceWorkflowDocument?: {
    workflowId: string
    schemaVersion: string
    title: string
  }
}

export const CURRENT_RUN_HISTORY_SCHEMA_VERSION = '1.0' as const

export type WorkflowRunHistory = {
  schemaVersion: typeof CURRENT_RUN_HISTORY_SCHEMA_VERSION
  records: WorkflowRunRecord[]
  updatedAt: string
}

// ---- Helpers ----

export const workflowRunModes: readonly WorkflowRunMode[] = [
  'validate',
  'mock',
  'dryRun',
  'partial',
  'full',
  'replay',
]

export const workflowRunStatuses: readonly WorkflowRunStatus[] = [
  'queued',
  'running',
  'success',
  'failed',
  'cancelled',
  'review_required',
]

export function isWorkflowRunMode(value: unknown): value is WorkflowRunMode {
  return typeof value === 'string' && (workflowRunModes as readonly string[]).includes(value)
}

export function isWorkflowRunStatus(value: unknown): value is WorkflowRunStatus {
  return typeof value === 'string' && (workflowRunStatuses as readonly string[]).includes(value)
}

/**
 * RunPlanner 側の RunMode を Run History 用 WorkflowRunMode に変換する。
 * 型シグネチャを RunMode に絞ることで exhaustive mapping を保証する。
 */
export function mapRunPlannerMode(
  mode: 'all' | 'selected' | 'fromSelected' | 'dryRun',
): WorkflowRunMode {
  switch (mode) {
    case 'all':
      return 'full'
    case 'selected':
    case 'fromSelected':
      return 'partial'
    case 'dryRun':
      return 'dryRun'
  }
}

/**
 * WorkflowStatus → WorkflowRunStatus マッピング。
 * 不明なステータスは success に昇格させず failed にフォールバックする。
 */
export function mapWorkflowStatusToRunStatus(status: string): WorkflowRunStatus {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'failed'
    case 'review_required':
      return 'review_required'
    case 'paused':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'failed'
  }
}

function isWorkflow(source: Workflow | WorkflowDocument): source is Workflow {
  return 'name' in source && typeof (source as Workflow).name === 'string'
}

function countLogLevels(logs: readonly WorkflowRunLog[] | undefined): {
  logCount: number
  errorCount: number
  warningCount: number
} {
  if (!Array.isArray(logs)) {
    return { logCount: 0, errorCount: 0, warningCount: 0 }
  }
  let errorCount = 0
  let warningCount = 0
  for (const log of logs) {
    if (log?.level === 'error') errorCount += 1
    else if (log?.level === 'warn') warningCount += 1
  }
  return { logCount: logs.length, errorCount, warningCount }
}

function computeDurationMs(
  startedAt: string,
  finishedAt: string | undefined,
  explicit: number | undefined,
): number | undefined {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 0) {
    return explicit
  }
  if (!finishedAt) return undefined
  const start = Date.parse(startedAt)
  const end = Date.parse(finishedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined
  const diff = end - start
  return diff >= 0 ? diff : undefined
}

export type CreateWorkflowRunRecordInput = {
  runId: string
  source: Workflow | WorkflowDocument
  mode: WorkflowRunMode
  status: WorkflowRunStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  /** 実行されたノード数。未指定なら workflow.nodes.length。 */
  nodeCount?: number
  /** 実行された connection 数。未指定なら workflow.connections.length。 */
  connectionCount?: number
  /** logs から logCount / errorCount / warningCount を集計する。 */
  logs?: readonly WorkflowRunLog[]
  /** 集計値が事前に確定している場合に上書きできる。 */
  logCount?: number
  errorCount?: number
  warningCount?: number
  artifactId?: string
  /**
   * Credential-safe trace/audit snapshot.
   * Raw logs, prompts, payloads, config, credentials, and artifact body are not stored.
   */
  traceAudit?: RunTraceAuditSummary
  /** `WorkflowDocument` 由来である場合の出所サマリ。 */
  sourceWorkflowDocument?: WorkflowRunRecord['sourceWorkflowDocument']
}

/**
 * Run Record を組み立てる純粋関数。
 *
 * - `Workflow` でも `WorkflowDocument` でも作れる。
 * - `runId` / `startedAt` 必須。`finishedAt` から `durationMs` を導出可能。
 * - `logs` を渡せば `logCount` / `errorCount` / `warningCount` を集計する。
 * - 外部 API / ブラウザ API / 時計に依存しない。
 *
 * Credential / API key / prompt 全文 / logs 本文は record に含めない。
 * 集計値とメタデータのみを保持する。
 */
export function createWorkflowRunRecord(input: CreateWorkflowRunRecordInput): WorkflowRunRecord {
  const { source } = input
  const workflowId = isWorkflow(source) ? source.id : source.workflowId
  const workflowTitle = isWorkflow(source) ? source.name : source.title
  const workflowSchemaVersion = isWorkflow(source)
    ? source.schemaVersion ?? '1.0'
    : source.schemaVersion

  const nodeCount =
    typeof input.nodeCount === 'number' && Number.isFinite(input.nodeCount) && input.nodeCount >= 0
      ? input.nodeCount
      : source.nodes.length
  const connectionCount =
    typeof input.connectionCount === 'number' &&
    Number.isFinite(input.connectionCount) &&
    input.connectionCount >= 0
      ? input.connectionCount
      : source.connections.length

  const aggregated = countLogLevels(input.logs)
  const logCount =
    typeof input.logCount === 'number' && Number.isFinite(input.logCount) && input.logCount >= 0
      ? input.logCount
      : aggregated.logCount
  const errorCount =
    typeof input.errorCount === 'number' &&
    Number.isFinite(input.errorCount) &&
    input.errorCount >= 0
      ? input.errorCount
      : aggregated.errorCount
  const warningCount =
    typeof input.warningCount === 'number' &&
    Number.isFinite(input.warningCount) &&
    input.warningCount >= 0
      ? input.warningCount
      : aggregated.warningCount

  const sourceWorkflowDocument =
    input.sourceWorkflowDocument ??
    (isWorkflow(source)
      ? undefined
      : {
          workflowId: source.workflowId,
          schemaVersion: source.schemaVersion,
          title: source.title,
        })

  return {
    runId: input.runId,
    workflowId,
    workflowTitle,
    workflowSchemaVersion,
    mode: input.mode,
    status: input.status,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: computeDurationMs(input.startedAt, input.finishedAt, input.durationMs),
    nodeCount,
    connectionCount,
    logCount,
    errorCount,
    warningCount,
    artifactId: input.artifactId,
    traceAudit: input.traceAudit,
    sourceWorkflowDocument,
  }
}

/**
 * 空の Run History を作る。`updatedAt` は呼び出し側で注入できる。
 */
export function createEmptyRunHistory(now = new Date().toISOString()): WorkflowRunHistory {
  return {
    schemaVersion: CURRENT_RUN_HISTORY_SCHEMA_VERSION,
    records: [],
    updatedAt: now,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRunRecord(raw: unknown, now: string): WorkflowRunRecord | null {
  if (!isRecord(raw)) return null
  if (typeof raw.runId !== 'string' || raw.runId.trim() === '') return null
  if (typeof raw.workflowId !== 'string' || raw.workflowId.trim() === '') return null
  if (typeof raw.startedAt !== 'string') return null
  if (!isWorkflowRunMode(raw.mode)) return null
  if (!isWorkflowRunStatus(raw.status)) return null

  const finiteOr = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback

  const optionalFinite = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined

  const sourceDocRaw = raw.sourceWorkflowDocument
  const sourceWorkflowDocument =
    isRecord(sourceDocRaw) &&
    typeof sourceDocRaw.workflowId === 'string' &&
    typeof sourceDocRaw.schemaVersion === 'string' &&
    typeof sourceDocRaw.title === 'string'
      ? {
          workflowId: sourceDocRaw.workflowId,
          schemaVersion: sourceDocRaw.schemaVersion,
          title: sourceDocRaw.title,
        }
      : undefined

  return {
    runId: raw.runId,
    workflowId: raw.workflowId,
    workflowTitle: typeof raw.workflowTitle === 'string' ? raw.workflowTitle : '',
    workflowSchemaVersion:
      typeof raw.workflowSchemaVersion === 'string'
        ? raw.workflowSchemaVersion
        : CURRENT_WORKFLOW_SCHEMA_VERSION,
    mode: raw.mode,
    status: raw.status,
    startedAt: raw.startedAt,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    durationMs: optionalFinite(raw.durationMs),
    nodeCount: finiteOr(raw.nodeCount, 0),
    connectionCount: finiteOr(raw.connectionCount, 0),
    logCount: finiteOr(raw.logCount, 0),
    errorCount: finiteOr(raw.errorCount, 0),
    warningCount: finiteOr(raw.warningCount, 0),
    artifactId: typeof raw.artifactId === 'string' ? raw.artifactId : undefined,
    traceAudit: normalizeRunTraceAuditSummary(raw.traceAudit, now),
    sourceWorkflowDocument,
  }
}

/**
 * 任意の unknown を `WorkflowRunHistory` に正規化する。
 * 不正な値は安全に弾き、最低限 empty history を返す。
 */
export function normalizeRunHistory(raw: unknown, now = new Date().toISOString()): WorkflowRunHistory {
  if (!isRecord(raw)) return createEmptyRunHistory(now)

  const rawRecords = Array.isArray(raw.records) ? raw.records : []
  const records: WorkflowRunRecord[] = []
  for (const item of rawRecords) {
    const normalized = normalizeRunRecord(item, now)
    if (normalized) records.push(normalized)
  }

  return {
    schemaVersion: CURRENT_RUN_HISTORY_SCHEMA_VERSION,
    records,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}
