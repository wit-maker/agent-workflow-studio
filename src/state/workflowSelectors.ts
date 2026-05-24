import {
  canCarryToInput,
  getConnectionError,
  isKnownConnectionKind,
} from '../domain/connectionRules'
import { findPort, getInputPorts, getOutputPorts } from '../domain/portRules'
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

  if (!isRecord(value.metrics)) {
    return { valid: false, error: 'workflow.metrics がありません。' }
  }

  if (!isRecord(value.artifact) || typeof value.artifact.content !== 'string') {
    return { valid: false, error: 'workflow.artifact.content がありません。' }
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
    category: typeof raw.category === 'string' ? raw.category : 'その他',
    description: typeof raw.description === 'string' ? raw.description : '',
    status: (['idle', 'queued', 'running', 'complete', 'failed', 'review_required', 'skipped', 'retry_ready'].includes(raw.status as string)
      ? raw.status
      : 'idle') as WorkflowNode['status'],
    agentRole: raw.agentRole as WorkflowNode['agentRole'],
    inputTypes: raw.inputTypes as WorkflowDataType[],
    outputTypes: raw.outputTypes as WorkflowDataType[],
    inputPorts: Array.isArray(raw.inputPorts) ? (raw.inputPorts as WorkflowNode['inputPorts']) : undefined,
    outputPorts: Array.isArray(raw.outputPorts) ? (raw.outputPorts as WorkflowNode['outputPorts']) : undefined,
    config: isRecord(raw.config) ? (raw.config as Record<string, unknown>) : {},
    position: isRecord(raw.position) && typeof (raw.position as Record<string, unknown>).x === 'number'
      ? (raw.position as { x: number; y: number })
      : { x: 0, y: 0 },
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

  const connections = validConnections.map((raw: Record<string, unknown>, index): WorkflowConnection => ({
    id: typeof raw.id === 'string' ? raw.id : `conn-imported-${index}`,
    sourceNodeId: raw.sourceNodeId as string,
    sourcePort: raw.sourcePort as string | undefined,
    sourcePortId: raw.sourcePortId as string | undefined,
    targetNodeId: raw.targetNodeId as string,
    targetPort: raw.targetPort as string | undefined,
    targetPortId: raw.targetPortId as string | undefined,
    kind: (['data', 'instruction', 'decision', 'result', 'evidence', 'log', 'template'].includes(raw.kind as string)
      ? raw.kind
      : 'data') as WorkflowConnection['kind'],
    carries: Array.isArray(raw.carries) ? (raw.carries as WorkflowDataType[]) : [],
    status: (['inactive', 'active', 'error'].includes(raw.status as string) ? raw.status : 'inactive') as WorkflowConnection['status'],
  }))

  const workflow: Workflow = {
    ...(value as Record<string, unknown>),
    nodes,
    connections,
  } as Workflow

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
