import { createPortsFromTypes } from './portRules'
import type { WorkflowNode } from './workflow'

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function slugFrom(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'node'
}

export function createUniqueNodeId(nodes: WorkflowNode[], type: string): string {
  const existingIds = new Set(nodes.map((node) => node.id))
  const base = `node-${slugFrom(type)}`
  let index = nodes.length + 1
  let candidate = `${base}-${index}`

  while (existingIds.has(candidate)) {
    index += 1
    candidate = `${base}-${index}`
  }

  return candidate
}

function getNextPosition(nodes: WorkflowNode[], selectedNodeId?: string): WorkflowNode['position'] {
  const selectedNode = nodes.find((node) => node.id === selectedNodeId)

  if (selectedNode) {
    return {
      x: selectedNode.position.x + 96,
      y: selectedNode.position.y + 72,
    }
  }

  if (nodes.length === 0) {
    return { x: 320, y: 140 }
  }

  const rightMost = nodes.reduce((current, node) =>
    node.position.x > current.position.x ? node : current,
  )

  return {
    x: rightMost.position.x + 96,
    y: rightMost.position.y + 72,
  }
}

export function createNodeFromPart(
  part: WorkflowNode,
  nodes: WorkflowNode[],
  selectedNodeId?: string,
): WorkflowNode {
  const id = createUniqueNodeId(nodes, part.type)

  return {
    ...part,
    id,
    title: `${part.title} copy`,
    status: 'idle',
    inputPorts: part.inputPorts
      ? JSON.parse(JSON.stringify(part.inputPorts))
      : createPortsFromTypes(part.inputTypes, 'input'),
    outputPorts: part.outputPorts
      ? JSON.parse(JSON.stringify(part.outputPorts))
      : createPortsFromTypes(part.outputTypes, 'output'),
    config: cloneRecord(part.config ?? {}),
    position: getNextPosition(nodes, selectedNodeId),
    lastRun: undefined,
  }
}
