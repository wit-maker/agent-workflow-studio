import {
  canCarryToInput,
  getConnectionError,
  isKnownConnectionKind,
} from '../domain/connectionRules'
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
  sourcePort: WorkflowDataType
  targetNodeId: string
  targetPort: WorkflowDataType
  kind: ConnectionKind
}

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

  const nodes = value.nodes
  const connections = value.connections

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return { valid: false, error: 'workflow.id がありません。' }
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return { valid: false, error: 'workflow.name がありません。' }
  }

  if (!Array.isArray(nodes)) {
    return { valid: false, error: 'workflow.nodes は配列である必要があります。' }
  }

  if (!Array.isArray(connections)) {
    return { valid: false, error: 'workflow.connections は配列である必要があります。' }
  }

  if (!isRecord(value.metrics)) {
    return { valid: false, error: 'workflow.metrics がありません。' }
  }

  if (!isRecord(value.artifact) || typeof value.artifact.content !== 'string') {
    return { valid: false, error: 'workflow.artifact.content がありません。' }
  }

  const hasInvalidNode = nodes.some(
    (node) =>
      !isRecord(node) ||
      typeof node.id !== 'string' ||
      typeof node.title !== 'string' ||
      !Array.isArray(node.inputTypes) ||
      !Array.isArray(node.outputTypes),
  )

  if (hasInvalidNode) {
    return { valid: false, error: '必須項目が不足しているノードがあります。' }
  }

  const hasInvalidConnection = connections.some(
    (connection) =>
      !isRecord(connection) ||
      typeof connection.sourceNodeId !== 'string' ||
      typeof connection.targetNodeId !== 'string',
  )

  if (hasInvalidConnection) {
    return {
      valid: false,
      error: '接続に source または target の必須項目が不足しています。',
    }
  }

  return { valid: true, workflow: value as Workflow }
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
  return validateConnection(workflow, {
    id: 'draft',
    sourceNodeId: draft.sourceNodeId,
    sourcePort: draft.sourcePort,
    targetNodeId: draft.targetNodeId,
    targetPort: draft.targetPort,
    kind: draft.kind,
    carries: [draft.sourcePort],
    status: 'inactive',
  })
}

export function validateConnections(workflow: Workflow): ConnectionValidationResult[] {
  return workflow.connections.map((connection: WorkflowConnection) =>
    validateConnection(workflow, connection),
  )
}
