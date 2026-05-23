import { agentRoleLabels, statusLabels, type WorkflowNode } from '../domain/workflow'

type NodeCardProps = {
  node: WorkflowNode
  isSelected: boolean
  onSelect: (nodeId: string) => void
}

export function NodeCard({ node, isSelected, onSelect }: NodeCardProps) {
  return (
    <button
      type="button"
      className={`node-card node-${node.status} ${isSelected ? 'selected' : ''}`}
      style={{ left: node.position.x, top: node.position.y }}
      onClick={() => onSelect(node.id)}
    >
      <span className="node-header">
        <span className="node-category">{node.category}</span>
        <span className="node-status">{statusLabels[node.status]}</span>
      </span>
      <strong>{node.title}</strong>
      <span className="node-agent">
        {node.agentRole ? agentRoleLabels[node.agentRole] : 'Unassigned'}
      </span>
      <span className="node-ports">
        <span>{node.inputTypes.join(', ') || 'Start'}</span>
        <span>{node.outputTypes.join(', ')}</span>
      </span>
      <span className="node-metrics">
        {node.metrics?.estimatedTokens ?? 0} tok / {node.metrics?.estimatedLatencyMs ?? 0} ms
      </span>
    </button>
  )
}
