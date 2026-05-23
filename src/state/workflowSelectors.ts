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
    ['queued', 'running', 'failed', 'review_required'].includes(node.status),
  )
}

export function validateWorkflowImport(value: unknown): {
  valid: boolean
  workflow?: Workflow
  error?: string
} {
  if (!isRecord(value)) {
    return { valid: false, error: 'Imported file must contain a workflow object.' }
  }

  const nodes = value.nodes
  const connections = value.connections

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return { valid: false, error: 'Workflow id is missing.' }
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return { valid: false, error: 'Workflow name is missing.' }
  }

  if (!Array.isArray(nodes)) {
    return { valid: false, error: 'Workflow nodes must be an array.' }
  }

  if (!Array.isArray(connections)) {
    return { valid: false, error: 'Workflow connections must be an array.' }
  }

  if (!isRecord(value.metrics)) {
    return { valid: false, error: 'Workflow metrics are missing.' }
  }

  if (!isRecord(value.artifact) || typeof value.artifact.content !== 'string') {
    return { valid: false, error: 'Workflow artifact is missing.' }
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
    return { valid: false, error: 'At least one node is missing required fields.' }
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
      error: 'At least one connection is missing required source or target fields.',
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
      reason: 'Source node does not exist.',
      severity: 'error',
    }
  }

  if (!target) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: connection.targetNodeId,
      valid: false,
      reason: 'Target node does not exist.',
      severity: 'error',
    }
  }

  if (source.id === target.id) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: 'Source and target cannot be the same node.',
      severity: 'error',
    }
  }

  if (!isKnownConnectionKind(connection.kind)) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: 'Unknown connection kind.',
      severity: 'error',
    }
  }

  if (connection.carries.length === 0) {
    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: false,
      reason: 'Connection must carry at least one data type.',
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
      reason: `Source cannot output: ${carriesMissingFromSource.join(', ')}.`,
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
      reason: 'Connection references a port that is not present on the node.',
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
      reason: `Target cannot receive: ${targetCannotReceive.join(', ')}.`,
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
