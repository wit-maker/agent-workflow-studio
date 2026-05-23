import { agentRoleLabels, formatDataTypeLabel, statusLabels } from '../domain/displayLabels'
import type { WorkflowNode } from '../domain/workflow'

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
        {node.agentRole ? agentRoleLabels[node.agentRole] : '未割当'}
      </span>
      <span className="node-ports">
        <span>{node.inputTypes.map(formatDataTypeLabel).join(', ') || '開始'}</span>
        <span>{node.outputTypes.map(formatDataTypeLabel).join(', ')}</span>
      </span>
      <span className="node-metrics">
        {node.metrics?.estimatedTokens ?? 0} トークン / {node.metrics?.estimatedLatencyMs ?? 0} ms
      </span>
    </button>
  )
}
