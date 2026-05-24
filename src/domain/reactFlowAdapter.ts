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
type NodeLookup = Map<string, WorkflowNode>

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

function createNodeLookup(workflow: Workflow): NodeLookup {
  return new Map(workflow.nodes.map((node) => [node.id, node]))
}

function resolveConnectionHandlesWithLookup(
  nodeLookup: NodeLookup,
  connection: WorkflowConnection,
): {
  sourceHandle?: string
  targetHandle?: string
} {
  const sourceNode = nodeLookup.get(connection.sourceNodeId)
  const targetNode = nodeLookup.get(connection.targetNodeId)

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

export function resolveConnectionHandles(
  workflow: Workflow,
  connection: WorkflowConnection,
): {
  sourceHandle?: string
  targetHandle?: string
} {
  return resolveConnectionHandlesWithLookup(createNodeLookup(workflow), connection)
}

export const RF_X_SCALE = 1.35
export const RF_Y_SCALE = 1.25

export function scaleNodePosition(pos: { x: number; y: number }): { x: number; y: number } {
  return { x: pos.x * RF_X_SCALE, y: pos.y * RF_Y_SCALE }
}

export function toReactFlowNodes(
  workflow: Workflow,
  positions: NodePositionMap = {},
): ReactFlowWorkflowNode[] {
  const connectedInputPortIdsByNodeId = new Map<string, string[]>()
  const connectedOutputPortIdsByNodeId = new Map<string, string[]>()
  const connectionCountByNodeId = new Map<string, number>()
  const nodeLookup = createNodeLookup(workflow)

  for (const connection of workflow.connections) {
    const { sourceHandle, targetHandle } = resolveConnectionHandlesWithLookup(
      nodeLookup,
      connection,
    )

    connectionCountByNodeId.set(
      connection.sourceNodeId,
      (connectionCountByNodeId.get(connection.sourceNodeId) ?? 0) + 1,
    )
    connectionCountByNodeId.set(
      connection.targetNodeId,
      (connectionCountByNodeId.get(connection.targetNodeId) ?? 0) + 1,
    )

    if (sourceHandle) {
      connectedOutputPortIdsByNodeId.set(connection.sourceNodeId, [
        ...(connectedOutputPortIdsByNodeId.get(connection.sourceNodeId) ?? []),
        sourceHandle,
      ])
    }

    if (targetHandle) {
      connectedInputPortIdsByNodeId.set(connection.targetNodeId, [
        ...(connectedInputPortIdsByNodeId.get(connection.targetNodeId) ?? []),
        targetHandle,
      ])
    }
  }

  return workflow.nodes.map((node) => {
    const inputPorts = getInputPorts(node)
    const outputPorts = getOutputPorts(node)

    return {
      id: node.id,
      type: reactFlowNodeType,
      position: positions[node.id] ?? scaleNodePosition(node.position),
      draggable: true,
      data: {
        node,
        inputPorts,
        outputPorts,
        unconnectedRequiredInputPortIds: getUnconnectedRequiredInputPorts(
          node,
          workflow.connections,
        ).map((port) => port.id),
        connectedInputPortIds: connectedInputPortIdsByNodeId.get(node.id) ?? [],
        connectedOutputPortIds: connectedOutputPortIdsByNodeId.get(node.id) ?? [],
        connectionCount: connectionCountByNodeId.get(node.id) ?? 0,
      },
    }
  })
}

export function toReactFlowEdges(
  workflow: Workflow,
  selectedConnectionId?: string,
): Edge[] {
  const nodeIds = new Set(workflow.nodes.map((node) => node.id))
  const nodeLookup = createNodeLookup(workflow)

  return workflow.connections
    .filter(
      (connection) =>
        nodeIds.has(connection.sourceNodeId) && nodeIds.has(connection.targetNodeId),
    )
    .map((connection) => {
      const { sourceHandle, targetHandle } = resolveConnectionHandlesWithLookup(
        nodeLookup,
        connection,
      )
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

  const nodeLookup = createNodeLookup(workflow)
  const sourceNode = nodeLookup.get(connection.source)
  const targetNode = nodeLookup.get(connection.target)

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
