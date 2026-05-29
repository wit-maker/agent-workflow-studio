import { agentRoleLabels, formatDataTypeLabel, nodeCategoryLabels, statusLabels } from '../domain/displayLabels'
import { getInputPorts, getOutputPorts } from '../domain/portRules'
import type { NodeCategory, WorkflowNode } from '../domain/workflow'

type NodeCardProps = {
  node: WorkflowNode
  isSelected: boolean
  onSelect: (nodeId: string) => void
}

// HUD overlay badge — issue #34. Silent on success/idle/running; foregrounds
// failure / review / blocked / retry so the canvas itself carries the signal.
function nodeHudBadge(status: WorkflowNode['status']): { label: string; tone: string } | null {
  switch (status) {
    case 'failed':
      return { label: '失敗', tone: 'failed' }
    case 'review_required':
      return { label: '確認待ち', tone: 'review' }
    case 'blocked':
      return { label: '停止', tone: 'failed' }
    case 'retry_ready':
      return { label: '再試行可', tone: 'retry' }
    default:
      return null
  }
}

export function NodeCard({ node, isSelected, onSelect }: NodeCardProps) {
  const badge = nodeHudBadge(node.status)

  return (
    <button
      type="button"
      className={`node-card node-${node.status} ${isSelected ? 'selected' : ''}`}
      style={{ left: node.position.x, top: node.position.y }}
      onClick={() => onSelect(node.id)}
    >
      {badge ? (
        <span className={`node-hud-badge node-hud-badge-${badge.tone}`} aria-label={`HUD: ${badge.label}`}>
          {badge.label}
        </span>
      ) : null}
      <span className="node-header">
        <span className="node-category">{nodeCategoryLabels[node.category as NodeCategory] ?? node.category}</span>
        <span className="node-status">{statusLabels[node.status]}</span>
      </span>
      <strong>{node.title}</strong>
      <span className="node-agent">
        {node.agentRole ? agentRoleLabels[node.agentRole] : '未割当'}
      </span>
      <span className="node-ports">
        <span>
          {getInputPorts(node).length === 0
            ? '開始'
            : getInputPorts(node)
                .map((p) => `${formatDataTypeLabel(p.dataType)}${p.required ? '*' : ''}`)
                .join(', ')}
        </span>
        <span>{getOutputPorts(node).map((p) => formatDataTypeLabel(p.dataType)).join(', ')}</span>
      </span>
      <span className="node-metrics">
        {node.metrics?.estimatedTokens ?? 0} トークン / {node.metrics?.estimatedLatencyMs ?? 0} ms
      </span>
    </button>
  )
}
