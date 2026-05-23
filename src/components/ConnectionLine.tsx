import type { WorkflowConnection, WorkflowNode } from '../domain/workflow'

type ConnectionLineProps = {
  connection: WorkflowConnection
  nodes: WorkflowNode[]
}

export function ConnectionLine({ connection, nodes }: ConnectionLineProps) {
  const source = nodes.find((node) => node.id === connection.sourceNodeId)
  const target = nodes.find((node) => node.id === connection.targetNodeId)

  if (!source || !target) {
    return null
  }

  const x1 = source.position.x + 196
  const y1 = source.position.y + 58
  const x2 = target.position.x
  const y2 = target.position.y + 58
  const mid = Math.max(24, (x2 - x1) / 2)
  const path = `M ${x1} ${y1} C ${x1 + mid} ${y1}, ${x2 - mid} ${y2}, ${x2} ${y2}`

  return (
    <g className={`connection connection-${connection.status}`}>
      <path d={path} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}>
        {connection.kind}
      </text>
    </g>
  )
}
