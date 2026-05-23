import { MarkerType, type Connection, type Edge, type Node, type XYPosition } from '@xyflow/react'
import { canCarryToInput } from './connectionRules'
import { connectionKindLabels, connectionStatusLabels, formatDataTypeLabel } from './displayLabels'
import { findPort, getInputPorts, getOutputPorts, getUnconnectedRequiredInputPorts } from './portRules'
import type {
  ConnectionKind,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
  WorkflowPort,
} from './workflow'
import type { ConnectionDraft } from '../state/workflowSelectors'

export const reactFlowNodeType = 'workflowNode'

export type ReactFlowWorkflowNodeData = {
  node: WorkflowNode
  inputPorts: WorkflowPort[]
  outputPorts: WorkflowPort[]
  unconnectedRequiredInputPortIds: string[]
  connectedInputPortIds: string[]
  connectedOutputPortIds: string[]
  connectionCount: number
}

export type ReactFlowWorkflowNode = Node<ReactFlowWorkflowNodeData, typeof reactFlowNodeType>

type NodePositionMap = Record<string, XYPosition>

function getStatusColor(status: WorkflowConnection['status']): string {
  switch (status) {
    case 'active':
      return '#2f6fbd'
    case 'success':
      return '#18815a'
    case 'failed':
    case 'invalid':
      return '#be3f3b'
    case 'throttled':
      return '#7554c9'
    case 'inactive':
    default:
      return '#8a98aa'
  }
}

function pickSourcePort(
  sourceNode: WorkflowNode,
  connection: WorkflowConnection,
): WorkflowPort | undefined {
  const outputPorts = getOutputPorts(sourceNode)

  return (
    (connection.sourcePortId ? findPort(outputPorts, connection.sourcePortId) : undefined) ??
    (connection.sourcePort
      ? outputPorts.find((port) => port.dataType === connection.sourcePort)
      : undefined) ??
    outputPorts.find((port) => connection.carries.includes(port.dataType)) ??
    outputPorts[0]
  )
}

function pickTargetPort(
  targetNode: WorkflowNode,
  sourcePort: WorkflowPort | undefined,
  connection: WorkflowConnection,
): WorkflowPort | undefined {
  const inputPorts = getInputPorts(targetNode)

  if (connection.targetPortId) {
    const exact = findPort(inputPorts, connection.targetPortId)
    if (exact) {
      return exact
    }
  }

  if (connection.targetPort) {
    const byType = inputPorts.find((port) => port.dataType === connection.targetPort)
    if (byType) {
      return byType
    }
  }

  if (sourcePort) {
    const compatible = inputPorts.find(
      (port) =>
        canCarryToInput(sourcePort.dataType, port.dataType) &&
        (connection.carries.includes(port.dataType) ||
          connection.carries.includes(sourcePort.dataType)),
    )
    if (compatible) {
      return compatible
    }
  }

  return inputPorts.find((port) => connection.carries.includes(port.dataType)) ?? inputPorts[0]
}

export function resolveConnectionHandles(
  workflow: Workflow,
  connection: WorkflowConnection,
): {
  sourceHandle?: string
  targetHandle?: string
} {
  const sourceNode = workflow.nodes.find((node) => node.id === connection.sourceNodeId)
  const targetNode = workflow.nodes.find((node) => node.id === connection.targetNodeId)

  if (!sourceNode || !targetNode) {
    return {}
  }

  const sourcePort = pickSourcePort(sourceNode, connection)
  const targetPort = pickTargetPort(targetNode, sourcePort, connection)

  return {
    sourceHandle: sourcePort?.id,
    targetHandle: targetPort?.id,
  }
}

export function toReactFlowNodes(
  workflow: Workflow,
  positions: NodePositionMap = {},
): ReactFlowWorkflowNode[] {
  return workflow.nodes.map((node) => {
    const inputPorts = getInputPorts(node)
    const outputPorts = getOutputPorts(node)

    return {
      id: node.id,
      type: reactFlowNodeType,
      position: positions[node.id] ?? node.position,
      draggable: true,
      data: {
        node,
        inputPorts,
        outputPorts,
        unconnectedRequiredInputPortIds: getUnconnectedRequiredInputPorts(
          node,
          workflow.connections,
        ).map((port) => port.id),
        connectedInputPortIds: workflow.connections
          .filter((connection) => connection.targetNodeId === node.id)
          .flatMap((connection) => {
            const { targetHandle } = resolveConnectionHandles(workflow, connection)
            return targetHandle ? [targetHandle] : []
          }),
        connectedOutputPortIds: workflow.connections
          .filter((connection) => connection.sourceNodeId === node.id)
          .flatMap((connection) => {
            const { sourceHandle } = resolveConnectionHandles(workflow, connection)
            return sourceHandle ? [sourceHandle] : []
          }),
        connectionCount: workflow.connections.filter(
          (connection) =>
            connection.sourceNodeId === node.id || connection.targetNodeId === node.id,
        ).length,
      },
    }
  })
}

export function toReactFlowEdges(
  workflow: Workflow,
  selectedConnectionId?: string,
): Edge[] {
  return workflow.connections.map((connection) => {
    const { sourceHandle, targetHandle } = resolveConnectionHandles(workflow, connection)
    const stroke = getStatusColor(connection.status)

    return {
      id: connection.id,
      source: connection.sourceNodeId,
      target: connection.targetNodeId,
      sourceHandle,
      targetHandle,
      selectable: true,
      animated: connection.status === 'active',
      selected: connection.id === selectedConnectionId,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
      },
      style: {
        stroke,
        strokeWidth: 2.5,
      },
      label: connectionKindLabels[connection.kind],
      ariaLabel: [
        `${connection.sourceNodeId} から ${connection.targetNodeId}`,
        connectionKindLabels[connection.kind],
        connection.carries.map((dataType) => formatDataTypeLabel(dataType)).join(', '),
        connectionStatusLabels[connection.status],
      ].join(' / '),
      data: {
        kind: connection.kind,
        carries: connection.carries,
      },
    }
  })
}

export function toWorkflowConnectionDraft(
  workflow: Workflow,
  connection: Connection,
  kind: ConnectionKind = 'data',
): ConnectionDraft | null {
  if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
    return null
  }

  const sourceNode = workflow.nodes.find((node) => node.id === connection.source)
  const targetNode = workflow.nodes.find((node) => node.id === connection.target)

  if (!sourceNode || !targetNode) {
    return null
  }

  const sourcePort = findPort(getOutputPorts(sourceNode), connection.sourceHandle)
  const targetPort = findPort(getInputPorts(targetNode), connection.targetHandle)

  if (!sourcePort || !targetPort) {
    return null
  }

  return {
    sourceNodeId: sourceNode.id,
    sourcePortId: sourcePort.id,
    targetNodeId: targetNode.id,
    targetPortId: targetPort.id,
    kind,
  }
}
