import { useMemo, useState, type ReactNode } from 'react'
import {
  buildSelectedEdgeHudView,
  buildSelectedNodeHudView,
  buildWorkflowGroups,
  type HudSnapshot,
  type ZoomHudView,
} from '../../domain/cognitiveHud'
import type { ConnectionKind, Workflow, WorkflowNode } from '../../domain/workflow'
import type { ConnectionValidationResult } from '../../state/workflowSelectors'
import type { CanvasMode } from '../TopBar'
import { ReactFlowCanvas } from '../ReactFlowCanvas'
import { WorkflowCanvas } from '../WorkflowCanvas'
import { CognitiveHudOverlay } from './CognitiveHudOverlay'
import { SelectedEdgeHud } from './SelectedEdgeHud'
import { SelectedObjectHud } from './SelectedObjectHud'

/*
 * CognitiveWorkflowCanvas
 *
 * Center region — issue #34 redesign.
 *
 * Re-uses the existing WorkflowCanvas / ReactFlowCanvas as the work canvas
 * substrate but re-frames it as the Cognitive Workflow Canvas: a stack
 * where the canvas itself is the bottom layer and CognitiveHudOverlay sits
 * on top of it as the attention-allocation layer.
 *
 * The StagePreview (existing output stage) is kept inline below the canvas
 * for now so existing run output remains visible during the shell migration.
 * Subsequent phases may demote StagePreview to a Detail Drawer.
 */

type CognitiveWorkflowCanvasProps = {
  workflow: Workflow
  canvasMode: CanvasMode
  selectedNodeId: string
  selectedNode: WorkflowNode | undefined
  connectionValidation: ConnectionValidationResult[]
  hudSnapshot: HudSnapshot
  miniMapVisible: boolean
  onZoomHudChange: (view: ZoomHudView) => void
  onOpenDetail: () => void
  onRunSelected: () => void
  onSelectNode: (nodeId: string) => void
  onCreateConnection: (draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) => { ok: boolean; reason: string | null }
  onDeleteConnection: (connectionId: string) => void
  onDeleteNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, position: WorkflowNode['position']) => void
  belowCanvasSlot?: ReactNode
}

export function CognitiveWorkflowCanvas({
  workflow,
  canvasMode,
  selectedNodeId,
  selectedNode,
  connectionValidation,
  hudSnapshot,
  miniMapVisible,
  onZoomHudChange,
  onOpenDetail,
  onRunSelected,
  onSelectNode,
  onCreateConnection,
  onDeleteConnection,
  onDeleteNode,
  onMoveNode,
  belowCanvasSlot,
}: CognitiveWorkflowCanvasProps) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const selectedNodeHud = useMemo(
    () =>
      buildSelectedNodeHudView({
        node: selectedNode,
        connections: workflow.connections,
        hudSnapshot,
      }),
    [hudSnapshot, selectedNode, workflow.connections],
  )
  const selectedEdgeHud = useMemo(
    () =>
      buildSelectedEdgeHudView({
        workflow,
        connectionId: selectedConnectionId,
        connectionValidation,
      }),
    [connectionValidation, selectedConnectionId, workflow],
  )
  const workflowGroups = useMemo(() => buildWorkflowGroups(workflow), [workflow])

  function moveSelectedRight() {
    if (!selectedNode) return
    onMoveNode(selectedNode.id, {
      x: selectedNode.position.x + 40,
      y: selectedNode.position.y,
    })
  }

  return (
    <div className="cognitive-workflow-canvas" aria-label="認知ワークフローキャンバス">
      <div className="cognitive-workflow-canvas-stage">
        {canvasMode === 'standard' ? (
          <WorkflowCanvas
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            connectionValidation={connectionValidation}
          />
        ) : (
          <ReactFlowCanvas
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            selectedConnectionId={selectedConnectionId}
            onSelectNode={onSelectNode}
            onSelectConnectionId={setSelectedConnectionId}
            connectionValidation={connectionValidation}
            miniMapVisible={miniMapVisible}
            workflowGroups={workflowGroups}
            onZoomHudChange={onZoomHudChange}
            onCreateConnection={onCreateConnection}
            onDeleteConnection={onDeleteConnection}
            onDeleteNode={onDeleteNode}
            onMoveNode={onMoveNode}
          />
        )}
        <SelectedObjectHud
          view={selectedNodeHud}
          onRunSelected={onRunSelected}
          onOpenDetail={onOpenDetail}
          onMoveRight={moveSelectedRight}
          onDeleteSelected={() => selectedNode ? onDeleteNode(selectedNode.id) : undefined}
        />
        <SelectedEdgeHud
          view={selectedEdgeHud}
          onSelectSource={(nodeId) => {
            onSelectNode(nodeId)
            setSelectedConnectionId(null)
          }}
          onSelectTarget={(nodeId) => {
            onSelectNode(nodeId)
            setSelectedConnectionId(null)
          }}
          onDeleteEdge={(connectionId) => {
            onDeleteConnection(connectionId)
            setSelectedConnectionId(null)
          }}
        />
        <CognitiveHudOverlay hudSnapshot={hudSnapshot} />
      </div>
      {belowCanvasSlot}
    </div>
  )
}
