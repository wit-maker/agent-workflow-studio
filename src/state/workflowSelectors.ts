import {
  canCarryToInput,
  getConnectionError,
  isKnownConnectionKind,
} from '../domain/connectionRules'
import { normalizeConnectionRuntimePolicy } from '../domain/edgeRuntimePolicy'
import { findPort, getInputPorts, getOutputPorts } from '../domain/portRules'
import { connectionKinds, normalizeNodeCategory } from '../domain/workflow'
import type {
  ConnectionKind,
  Workflow,
  WorkflowConnection,
  WorkflowDataType,
  WorkflowNode,
} from '../domain/workflow'

export type ConnectionValidationResult = {
  connectionId?: string
  sourceLabel: string
  targetLabel: string
  valid: boolean
  reason: string | null
  severity: 'info' | 'warn' | 'error'
}

export type ConnectionDraft = {
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
  kind: ConnectionKind
}

export type ConnectionAttempt = {
  sourceNodeId?: string | null
  sourcePortId?: string | null
  targetNodeId?: string | null
  targetPortId?: string | null
  kind?: ConnectionKind
}

export const isDuplicateConnectionDraft = (
  workflow: Workflow,
  draft: ConnectionDraft,
): boolean =>
  workflow.connections.some(
    (connection) =>
      connection.sourceNodeId === draft.sourceNodeId &&
      connection.sourcePortId === draft.sourcePortId &&
      connection.targetNodeId === draft.targetNodeId &&
      connection.targetPortId === draft.targetPortId,
  )

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const workflowNodeStatuses = [
  'idle',
  'queued',
  'running',
  'success',
  'failed',
  'retry_ready',
  'skipped',
  'review_required',
  'blocked',
  'cancelled',
] as const satisfies WorkflowNode['status'][]

const workflowStatuses = [
  'draft',
  'ready',
  'invalid',
  'running',
  'paused',
  'success',
  'failed',
  'review_required',
  'archived',
  'cancelled',
] as const satisfies Workflow['status'][]

const connectionStatuses = [
  'inactive',
  'active',
  'success',
  'failed',
  'invalid',
  'throttled',
] as const satisfies WorkflowConnection['status'][]

const artifactFormats = ['Markdown', 'JSON', 'Diff', 'Preview'] as const satisfies Workflow['artifact']['format'][]

const artifactStatuses = [
  'draft',
  'checked',
  'review_required',
  'approved',
  'failed',
] as const satisfies Workflow['artifact']['status'][]

const logLevels = [
  'info',
  'warn',
  'error',
  'security',
  'approval',
  'metric',
] as const satisfies Workflow['logs'][number]['level'][]

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

function finiteNumberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isWorkflowNodeStatus(value: unknown): value is WorkflowNode['status'] {
  return isOneOf(workflowNodeStatuses, value)
}

function isWorkflowStatus(value: unknown): value is Workflow['status'] {
  return isOneOf(workflowStatuses, value)
}

function isConnectionKind(value: unknown): value is WorkflowConnection['kind'] {
  return isOneOf(connectionKinds, value)
}

function isConnectionStatus(value: unknown): value is WorkflowConnection['status'] {
  return isOneOf(connectionStatuses, value)
}

function normalizePosition(value: unknown): { x: number; y: number } {
  if (
    isRecord(value) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y)
  ) {
    return { x: value.x, y: value.y }
  }

  return { x: 0, y: 0 }
}

function normalizeWorkflowMetric(value: unknown): Workflow['metrics'] {
  const raw = isRecord(value) ? value : {}

  return {
    tokens: finiteNumberOr(raw.tokens, 0),
    cost: finiteNumberOr(raw.cost, 0),
    latencyMs: finiteNumberOr(raw.latencyMs, 0),
    successRate: finiteNumberOr(raw.successRate, 0),
    queueCount: finiteNumberOr(raw.queueCount, 0),
    retryCount: finiteNumberOr(raw.retryCount, 0),
    bottleneckNodeId: typeof raw.bottleneckNodeId === 'string' ? raw.bottleneckNodeId : null,
  }
}

function normalizeArtifact(value: unknown): Workflow['artifact'] {
  const raw = isRecord(value) ? value : {}

  return {
    title: typeof raw.title === 'string' ? raw.title : 'Imported Artifact',
    format: isOneOf(artifactFormats, raw.format) ? raw.format : 'Markdown',
    content: typeof raw.content === 'string' ? raw.content : '',
    status: isOneOf(artifactStatuses, raw.status) ? raw.status : 'draft',
  }
}

function normalizeLogs(value: unknown): Workflow['logs'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item, index): Workflow['logs'][number] => {
    const raw = isRecord(item) ? item : {}

    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `log-imported-${index}`,
      runId: typeof raw.runId === 'string' && raw.runId.trim() ? raw.runId : 'imported-run',
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
      nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : undefined,
      level: isOneOf(logLevels, raw.level) ? raw.level : 'info',
      message: typeof raw.message === 'string' ? raw.message : 'Imported log',
      payload: raw.payload,
    }
  })
}

function normalizeConnectionMetrics(value: unknown): WorkflowConnection['metrics'] {
  if (!isRecord(value)) return undefined

  return {
    flowRate: optionalFiniteNumber(value.flowRate),
    tokens: optionalFiniteNumber(value.tokens),
    latencyMs: optionalFiniteNumber(value.latencyMs),
  }
}

function createUniqueConnectionId(
  rawId: unknown,
  index: number,
  usedIds: Set<string>,
): string {
  const base =
    typeof rawId === 'string' && rawId.trim()
      ? rawId.trim()
      : `conn-imported-${index}`

  let candidate = base
  let suffix = 1

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  usedIds.add(candidate)
  return candidate
}

export function selectSelectedNode(
  workflow: Workflow,
  selectedNodeId: string,
): WorkflowNode | undefined {
  return workflow.nodes.find((node) => node.id === selectedNodeId)
}

export function selectBottleneckNode(workflow: Workflow): WorkflowNode | undefined {
  return workflow.nodes.find((node) => node.id === workflow.metrics.bottleneckNodeId)
}

export function selectActiveQueueNodes(workflow: Workflow): WorkflowNode[] {
  return workflow.nodes.filter((node) =>
    ['queued', 'running', 'failed', 'review_required', 'retry_ready'].includes(node.status),
  )
}

export function validateWorkflowImport(value: unknown): {
  valid: boolean
  workflow?: Workflow
  error?: string
} {
  if (!isRecord(value)) {
    return { valid: false, error: '読み込んだファイルには workflow オブジェクトが必要です。' }
  }

  const rawNodes = value.nodes
  const rawConnections = value.connections

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return { valid: false, error: 'workflow.id がありません。' }
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return { valid: false, error: 'workflow.name がありません。' }
  }

  if (!Array.isArray(rawNodes)) {
    return { valid: false, error: 'workflow.nodes は配列である必要があります。' }
  }

  if (!Array.isArray(rawConnections)) {
    return { valid: false, error: 'workflow.connections は配列である必要があります。' }
  }

  const hasInvalidNode = rawNodes.some(
    (node) =>
      !isRecord(node) ||
      typeof node.id !== 'string' ||
      typeof node.title !== 'string' ||
      !Array.isArray(node.inputTypes) ||
      !Array.isArray(node.outputTypes),
  )

  if (hasInvalidNode) {
    return { valid: false, error: '必須項目 (id/title/inputTypes/outputTypes) が不足しているノードがあります。' }
  }

  // 欠落フィールドを安全なデフォルト値で補完
  const nodeIds = new Set(rawNodes.map((n: Record<string, unknown>) => n.id as string))

  const nodes = rawNodes.map((raw: Record<string, unknown>): WorkflowNode => ({
    id: raw.id as string,
    type: typeof raw.type === 'string' ? raw.type : 'unknown',
    title: raw.title as string,
    category: normalizeNodeCategory(raw.category),
    description: typeof raw.description === 'string' ? raw.description : '',
    status: isWorkflowNodeStatus(raw.status) ? raw.status : 'idle',
    agentRole: raw.agentRole as WorkflowNode['agentRole'],
    inputTypes: raw.inputTypes as WorkflowDataType[],
    outputTypes: raw.outputTypes as WorkflowDataType[],
    inputPorts: Array.isArray(raw.inputPorts) ? (raw.inputPorts as WorkflowNode['inputPorts']) : undefined,
    outputPorts: Array.isArray(raw.outputPorts) ? (raw.outputPorts as WorkflowNode['outputPorts']) : undefined,
    config: isRecord(raw.config) ? (raw.config as Record<string, unknown>) : {},
    position: normalizePosition(raw.position),
    metrics: isRecord(raw.metrics) ? (raw.metrics as WorkflowNode['metrics']) : undefined,
    lastRun: isRecord(raw.lastRun) ? (raw.lastRun as WorkflowNode['lastRun']) : undefined,
  }))

  // sourceNodeId / targetNodeId が nodes に存在する接続のみ残す
  const validConnections = rawConnections.filter(
    (conn) =>
      isRecord(conn) &&
      typeof conn.sourceNodeId === 'string' &&
      typeof conn.targetNodeId === 'string' &&
      nodeIds.has(conn.sourceNodeId as string) &&
      nodeIds.has(conn.targetNodeId as string),
  )

  const usedConnectionIds = new Set<string>()

  const connections = validConnections.map((raw: Record<string, unknown>, index): WorkflowConnection => ({
    id: createUniqueConnectionId(raw.id, index, usedConnectionIds),
    sourceNodeId: raw.sourceNodeId as string,
    sourcePort: raw.sourcePort as string | undefined,
    sourcePortId: raw.sourcePortId as string | undefined,
    targetNodeId: raw.targetNodeId as string,
    targetPort: raw.targetPort as string | undefined,
    targetPortId: raw.targetPortId as string | undefined,
    kind: isConnectionKind(raw.kind) ? raw.kind : 'data',
    carries: Array.isArray(raw.carries)
      ? raw.carries.filter((item): item is WorkflowDataType => typeof item === 'string')
      : [],
    status: isConnectionStatus(raw.status) ? raw.status : 'inactive',
    runtimePolicy: normalizeConnectionRuntimePolicy(raw.runtimePolicy),
    metrics: normalizeConnectionMetrics(raw.metrics),
  }))

  const now = new Date().toISOString()

  const workflow: Workflow = {
    id: value.id.trim(),
    schemaVersion:
      value.schemaVersion === '1.0' || value.schemaVersion === '1.1' || value.schemaVersion === '2.0'
        ? value.schemaVersion
        : '1.0',
    name: value.name.trim(),
    description: typeof value.description === 'string' ? value.description : '',
    version:
      typeof value.version === 'number' && Number.isFinite(value.version)
        ? value.version
        : 1,
    status: isWorkflowStatus(value.status) ? value.status : 'draft',
    nodes,
    connections,
    metrics: normalizeWorkflowMetric(value.metrics),
    logs: normalizeLogs(value.logs),
    artifact: normalizeArtifact(value.artifact),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }

  return { valid: true, workflow }
}

function formatNodeLabel(node: WorkflowNode | undefined, fallback: string): string {
  return node?.title ?? fallback
}

export function validateConnection(
  workflow: Workflow,
  connection: WorkflowConnection,
): ConnectionValidationResult {
  const source = workflow.nodes.find((node) => node.id === connection.sourceNodeId)
  const target = workflow.nodes.find((node) => node.id === connection.targetNodeId)

  if (!source) {
    return {
      connectionId: connection.id,
      sourceLabel: connection.sourceNodeId,
      targetLabel: formatNodeLabel(target, connection.targetNodeId),
      valid: false,
      reason: '接続元ノードが存在しません。',
      severity: 'error',
    }
  }

  if (!target) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: connection.targetNodeId,
      valid: false,
      reason: '接続先ノードが存在しません。',
      severity: 'error',
    }
  }

  if (source.id === target.id) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: '接続元と接続先に同じノードは指定できません。',
      severity: 'error',
    }
  }

  if (!isKnownConnectionKind(connection.kind)) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: '未知の接続種別です。',
      severity: 'error',
    }
  }

  if (connection.carries.length === 0) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: '接続には最低1つのデータ型が必要です。',
      severity: 'error',
    }
  }

  const carriesMissingFromSource = connection.carries.filter(
    (dataType) => !source.outputTypes.includes(dataType),
  )
  if (carriesMissingFromSource.length > 0) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: `接続元が出力できない型です: ${carriesMissingFromSource.join(', ')}。`,
      severity: 'error',
    }
  }

  const sourcePortMissing =
    connection.sourcePort !== undefined &&
    !source.outputTypes.includes(connection.sourcePort as WorkflowDataType)
  const targetPortMissing =
    connection.targetPort !== undefined &&
    !target.inputTypes.includes(connection.targetPort as WorkflowDataType)

  if (sourcePortMissing || targetPortMissing) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: '存在しないポートが指定されています。',
      severity: 'error',
    }
  }

  const srcPorts = getOutputPorts(source)
  const tgtPorts = getInputPorts(target)

  if (connection.sourcePortId !== undefined) {
    if (!findPort(srcPorts, connection.sourcePortId)) {
      return {
        connectionId: connection.id,
        sourceLabel: source.title,
        targetLabel: target.title,
        valid: false,
        reason: `接続元ポートID「${connection.sourcePortId}」が存在しません。`,
        severity: 'error',
      }
    }
  }

  if (connection.targetPortId !== undefined) {
    if (!findPort(tgtPorts, connection.targetPortId)) {
      return {
        connectionId: connection.id,
        sourceLabel: source.title,
        targetLabel: target.title,
        valid: false,
        reason: `接続先ポートID「${connection.targetPortId}」が存在しません。`,
        severity: 'error',
      }
    }
  }

  if (connection.sourcePortId !== undefined && connection.targetPortId !== undefined) {
    const srcPort = findPort(srcPorts, connection.sourcePortId)
    const tgtPort = findPort(tgtPorts, connection.targetPortId)
    if (srcPort && tgtPort && !canCarryToInput(srcPort.dataType, tgtPort.dataType)) {
      return {
        connectionId: connection.id,
        sourceLabel: source.title,
        targetLabel: target.title,
        valid: false,
        reason: `ポートのデータ型が接続できません: ${srcPort.dataType} → ${tgtPort.dataType}。`,
        severity: 'error',
      }
    }
  }

  const targetCannotReceive = connection.carries.filter((dataType) =>
    connection.targetPort
      ? !canCarryToInput(dataType, connection.targetPort as WorkflowDataType)
      : !target.inputTypes.some((inputType) => canCarryToInput(dataType, inputType)),
  )

  if (targetCannotReceive.length > 0) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: `接続先が受け取れない型です: ${targetCannotReceive.join(', ')}。`,
      severity: 'error',
    }
  }

  const reason = getConnectionError(source, target)

  return {
    connectionId: connection.id,
    sourceLabel: source.title,
    targetLabel: target.title,
    valid: reason === null,
    reason,
    severity: reason === null ? 'info' : 'warn',
  }
}

export function validateConnectionDraft(
  workflow: Workflow,
  draft: ConnectionDraft,
): ConnectionValidationResult {
  if (isDuplicateConnectionDraft(workflow, draft)) {
    const sourceNode = workflow.nodes.find((node) => node.id === draft.sourceNodeId)
    const targetNode = workflow.nodes.find((node) => node.id === draft.targetNodeId)
    return {
      sourceLabel: formatNodeLabel(sourceNode, draft.sourceNodeId),
      targetLabel: formatNodeLabel(targetNode, draft.targetNodeId),
      valid: false,
      reason: '同じポート同士の接続はすでに存在します。',
      severity: 'warn',
    }
  }

  const sourceNode = workflow.nodes.find((node) => node.id === draft.sourceNodeId)
  const targetNode = workflow.nodes.find((node) => node.id === draft.targetNodeId)
  const srcPorts = sourceNode ? getOutputPorts(sourceNode) : []
  const tgtPorts = targetNode ? getInputPorts(targetNode) : []
  const srcPort = findPort(srcPorts, draft.sourcePortId)
  const tgtPort = findPort(tgtPorts, draft.targetPortId)

  return validateConnection(workflow, {
    id: 'draft',
    sourceNodeId: draft.sourceNodeId,
    sourcePort: srcPort?.dataType,
    sourcePortId: draft.sourcePortId,
    targetNodeId: draft.targetNodeId,
    targetPort: tgtPort?.dataType,
    targetPortId: draft.targetPortId,
    kind: draft.kind,
    carries: srcPort ? [srcPort.dataType] : (sourceNode?.outputTypes.slice(0, 1) ?? []),
    status: 'inactive',
  })
}

function buildInvalidDraftResult(
  workflow: Workflow,
  attempt: ConnectionAttempt,
  reason: string,
): ConnectionValidationResult {
  const sourceNode = workflow.nodes.find((node) => node.id === attempt.sourceNodeId)
  const targetNode = workflow.nodes.find((node) => node.id === attempt.targetNodeId)

  return {
    sourceLabel: formatNodeLabel(sourceNode, attempt.sourceNodeId ?? '不明'),
    targetLabel: formatNodeLabel(targetNode, attempt.targetNodeId ?? '不明'),
    valid: false,
    reason,
    severity: 'error',
  }
}

export function explainConnectionAttempt(
  workflow: Workflow,
  attempt: ConnectionAttempt,
): ConnectionValidationResult {
  if (!attempt.sourceNodeId || !attempt.targetNodeId) {
    return buildInvalidDraftResult(
      workflow,
      attempt,
      '接続元ノードまたは接続先ノードが見つかりません。',
    )
  }

  if (!attempt.sourcePortId || !attempt.targetPortId) {
    return buildInvalidDraftResult(workflow, attempt, '接続元または接続先ポートが未指定です。')
  }

  const sourceNode = workflow.nodes.find((node) => node.id === attempt.sourceNodeId)
  const targetNode = workflow.nodes.find((node) => node.id === attempt.targetNodeId)

  if (!sourceNode || !targetNode) {
    return buildInvalidDraftResult(
      workflow,
      attempt,
      '接続元ノードまたは接続先ノードが見つかりません。',
    )
  }

  if (sourceNode.id === targetNode.id) {
    return buildInvalidDraftResult(workflow, attempt, '同じノード同士は接続できません。')
  }

  const sourcePort = findPort(getOutputPorts(sourceNode), attempt.sourcePortId)
  if (!sourcePort) {
    return buildInvalidDraftResult(workflow, attempt, '接続元ポートが見つかりません。')
  }

  const targetPort = findPort(getInputPorts(targetNode), attempt.targetPortId)
  if (!targetPort) {
    return buildInvalidDraftResult(workflow, attempt, '接続先ポートが見つかりません。')
  }

  return validateConnectionDraft(workflow, {
    sourceNodeId: attempt.sourceNodeId,
    sourcePortId: attempt.sourcePortId,
    targetNodeId: attempt.targetNodeId,
    targetPortId: attempt.targetPortId,
    kind: attempt.kind ?? 'data',
  })
}

export function validateConnections(workflow: Workflow): ConnectionValidationResult[] {
  return workflow.connections.map((connection: WorkflowConnection) =>
    validateConnection(workflow, connection),
  )
}
