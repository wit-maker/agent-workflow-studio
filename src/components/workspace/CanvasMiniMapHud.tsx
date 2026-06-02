import { MiniMap, type Node } from '@xyflow/react'
import type { ReactFlowWorkflowNodeData } from '../../domain/reactFlowAdapter'

function nodeColor(node: Node): string {
  const data = node.data as Partial<ReactFlowWorkflowNodeData> | undefined
  switch (data?.node?.status) {
    case 'failed':
    case 'blocked':
      return '#f87171'
    case 'review_required':
    case 'retry_ready':
      return '#fbbf24'
    case 'running':
    case 'queued':
      return '#60a5fa'
    case 'success':
      return '#34d399'
    default:
      return '#94a3b8'
  }
}

export function CanvasMiniMapHud() {
  return (
    <MiniMap
      ariaLabel="キャンバスミニマップ"
      className="canvas-minimap-hud"
      bgColor="rgba(4, 12, 24, 0.84)"
      maskColor="rgba(15, 23, 42, 0.46)"
      maskStrokeColor="#67e8f9"
      maskStrokeWidth={1.5}
      nodeBorderRadius={3}
      nodeColor={nodeColor}
      nodeStrokeColor="#0f172a"
      nodeStrokeWidth={1}
      pannable
      position="bottom-right"
      zoomable
      zoomStep={0.18}
    />
  )
}
