import { getConnectionError } from '../domain/connectionRules'
import type { Workflow, WorkflowConnection, WorkflowNode } from '../domain/workflow'

export type ConnectionValidationResult = {
  connectionId: string
  sourceLabel: string
  targetLabel: string
  valid: boolean
  reason: string | null
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

  if (!isRecord(value.artifact)) {
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

  return { valid: true, workflow: value as Workflow }
}

export function validateConnections(workflow: Workflow): ConnectionValidationResult[] {
  return workflow.connections.map((connection: WorkflowConnection) => {
    const source = workflow.nodes.find((node) => node.id === connection.sourceNodeId)
    const target = workflow.nodes.find((node) => node.id === connection.targetNodeId)

    if (!source) {
      return {
        connectionId: connection.id,
        sourceLabel: connection.sourceNodeId,
        targetLabel: target?.title ?? connection.targetNodeId,
        valid: false,
        reason: 'Source node does not exist.',
      }
    }

    if (!target) {
      return {
        connectionId: connection.id,
        sourceLabel: source.title,
        targetLabel: connection.targetNodeId,
        valid: false,
        reason: 'Target node does not exist.',
      }
    }

    const sourcePortMissing =
      connection.sourcePort !== undefined &&
      !source.outputTypes.includes(connection.sourcePort as never)
    const targetPortMissing =
      connection.targetPort !== undefined &&
      !target.inputTypes.includes(connection.targetPort as never)

    if (sourcePortMissing || targetPortMissing) {
      return {
        connectionId: connection.id,
        sourceLabel: source.title,
        targetLabel: target.title,
        valid: false,
        reason: 'Connection references a port that is not present on the node.',
      }
    }

    const reason = getConnectionError(source, target)

    return {
      connectionId: connection.id,
      sourceLabel: source.title,
      targetLabel: target.title,
      valid: reason === null,
      reason,
    }
  })
}
