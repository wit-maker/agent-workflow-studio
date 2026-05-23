import type { WorkflowConnection, WorkflowDataType, WorkflowNode, WorkflowPort } from './workflow'

function portIdFromType(direction: 'input' | 'output', dataType: WorkflowDataType): string {
  return `${dataType}-${direction === 'input' ? 'in' : 'out'}`
}

export function createPortsFromTypes(
  types: WorkflowDataType[],
  direction: 'input' | 'output',
): WorkflowPort[] {
  return types.map((dataType, index) => ({
    id: portIdFromType(direction, dataType),
    label: dataType,
    direction,
    dataType,
    // 入力ポートは単一型のノードのみ index 0 を必須とする
    required: direction === 'input' && types.length === 1 && index === 0,
    description: undefined,
  }))
}

export function getInputPorts(node: WorkflowNode): WorkflowPort[] {
  if (node.inputPorts && node.inputPorts.length > 0) {
    return node.inputPorts
  }
  return createPortsFromTypes(node.inputTypes, 'input')
}

export function getOutputPorts(node: WorkflowNode): WorkflowPort[] {
  if (node.outputPorts && node.outputPorts.length > 0) {
    return node.outputPorts
  }
  return createPortsFromTypes(node.outputTypes, 'output')
}

export function findPort(ports: WorkflowPort[], portId: string): WorkflowPort | undefined {
  return ports.find((port) => port.id === portId)
}

export function isPortConnected(
  port: WorkflowPort,
  nodeId: string,
  connections: WorkflowConnection[],
): boolean {
  if (port.direction === 'input') {
    return connections.some((conn) => {
      if (conn.targetNodeId !== nodeId) return false
      if (conn.targetPortId === port.id) return true
      if (conn.targetPort === port.dataType) return true
      if (conn.carries.includes(port.dataType)) return true
      return false
    })
  }
  return connections.some((conn) => {
    if (conn.sourceNodeId !== nodeId) return false
    if (conn.sourcePortId === port.id) return true
    if (conn.sourcePort === port.dataType) return true
    if (conn.carries.includes(port.dataType)) return true
    return false
  })
}

export function getUnconnectedRequiredInputPorts(
  node: WorkflowNode,
  connections: WorkflowConnection[],
): WorkflowPort[] {
  return getInputPorts(node).filter(
    (port) => port.required && !isPortConnected(port, node.id, connections),
  )
}
