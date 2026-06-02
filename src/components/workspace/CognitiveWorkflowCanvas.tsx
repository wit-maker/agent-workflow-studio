import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  buildSelectedEdgeHudView,
  buildSelectedNodeHudView,
  buildWorkflowEdgeRuntimeMap,
  buildWorkflowGroups,
  type CanvasHudAnchor,
  type CanvasHudCollisionState,
  type CanvasHudSize,
  type CentralHudView,
  type HudSnapshot,
  type SemanticFocusPathView,
  type ZoomHudView,
} from '../../domain/cognitiveHud'
import type { ExecutionGraph } from '../../domain/executionGraph'
import type { ConnectionKind, Workflow, WorkflowNode } from '../../domain/workflow'
import type { RunTrace } from '../../domain/runTrace'
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
  selectedConnectionId: string | null
  connectionValidation: ConnectionValidationResult[]
  executionGraph: ExecutionGraph | null
  hudSnapshot: HudSnapshot
  runTrace: RunTrace | null
  semanticFocusPath: SemanticFocusPathView | null
  centralHudView: CentralHudView | null
  miniMapVisible: boolean
  hudSurfaceState: Pick<CanvasHudCollisionState, 'paletteOpen' | 'detailOpen' | 'consoleOpen' | 'notificationOpen'>
  onZoomHudChange: (view: ZoomHudView) => void
  onOpenDetail: () => void
  onOpenRunDetail: () => void
  onRunSelected: () => void
  onSelectNode: (nodeId: string) => void
  onSelectConnectionId: (connectionId: string | null) => void
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
  selectedConnectionId,
  connectionValidation,
  executionGraph,
  hudSnapshot,
  runTrace,
  semanticFocusPath,
  centralHudView,
  miniMapVisible,
  hudSurfaceState,
  onZoomHudChange,
  onOpenDetail,
  onOpenRunDetail,
  onRunSelected,
  onSelectNode,
  onSelectConnectionId,
  onCreateConnection,
  onDeleteConnection,
  onDeleteNode,
  onMoveNode,
  belowCanvasSlot,
}: CognitiveWorkflowCanvasProps) {
  const [nodeHudAnchor, setNodeHudAnchor] = useState<CanvasHudAnchor | null>(null)
  const [edgeHudAnchor, setEdgeHudAnchor] = useState<CanvasHudAnchor | null>(null)
  const [nodeHudSize, setNodeHudSize] = useState<CanvasHudSize | null>(null)
  const [edgeHudSize, setEdgeHudSize] = useState<CanvasHudSize | null>(null)
  const handleHudAnchorChange = useCallback(
    ({ node, edge }: { node: CanvasHudAnchor | null; edge: CanvasHudAnchor | null }) => {
      setNodeHudAnchor((current) => (areHudAnchorsEqual(current, node) ? current : node))
      setEdgeHudAnchor((current) => (areHudAnchorsEqual(current, edge) ? current : edge))
    },
    [],
  )
  const handleNodeHudSizeChange = useCallback((size: CanvasHudSize | null) => {
    setNodeHudSize((current) => (areHudSizesEqual(current, size) ? current : size))
  }, [])
  const handleEdgeHudSizeChange = useCallback((size: CanvasHudSize | null) => {
    setEdgeHudSize((current) => (areHudSizesEqual(current, size) ? current : size))
  }, [])
  const selectedNodeHud = useMemo(
    () =>
      buildSelectedNodeHudView({
        node: selectedNode,
        connections: workflow.connections,
        hudSnapshot,
        semanticFocusPath,
        runTrace,
      }),
    [hudSnapshot, runTrace, selectedNode, semanticFocusPath, workflow.connections],
  )
  const selectedEdgeHud = useMemo(
    () =>
      buildSelectedEdgeHudView({
        workflow,
        connectionId: selectedConnectionId,
        executionGraph,
        runTrace,
        connectionValidation,
      }),
    [connectionValidation, executionGraph, runTrace, selectedConnectionId, workflow],
  )
  const edgeRuntimeByConnectionId = useMemo(
    () =>
      buildWorkflowEdgeRuntimeMap({
        workflow,
        executionGraph,
        runTrace,
        connectionValidation,
      }),
    [connectionValidation, executionGraph, runTrace, workflow],
  )
  const workflowGroups = useMemo(() => buildWorkflowGroups(workflow), [workflow])
  const visibleSelectedNodeHud = selectedEdgeHud ? null : selectedNodeHud
  const hudCollisionState = useMemo<CanvasHudCollisionState>(
    () => ({
      ...hudSurfaceState,
      miniMapVisible,
      nodeHudSize,
      edgeHudSize,
    }),
    [edgeHudSize, hudSurfaceState, miniMapVisible, nodeHudSize],
  )

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
            onSelectConnectionId={onSelectConnectionId}
            connectionValidation={connectionValidation}
            miniMapVisible={miniMapVisible}
            workflowGroups={workflowGroups}
            semanticFocusPath={semanticFocusPath}
            edgeRuntimeByConnectionId={edgeRuntimeByConnectionId}
            hudCollisionState={hudCollisionState}
            onZoomHudChange={onZoomHudChange}
            onHudAnchorChange={handleHudAnchorChange}
            onCreateConnection={onCreateConnection}
            onDeleteConnection={onDeleteConnection}
            onDeleteNode={onDeleteNode}
            onMoveNode={onMoveNode}
          />
        )}
        <SelectedObjectHud
          view={visibleSelectedNodeHud}
          onRunSelected={onRunSelected}
          onOpenDetail={onOpenDetail}
          onOpenRunDetail={onOpenRunDetail}
          onMoveRight={moveSelectedRight}
          onDeleteSelected={() => selectedNode ? onDeleteNode(selectedNode.id) : undefined}
          anchor={canvasMode === 'standard' ? null : nodeHudAnchor}
          onMeasuredSizeChange={handleNodeHudSizeChange}
        />
        <SelectedEdgeHud
          view={selectedEdgeHud}
          onSelectSource={(nodeId) => {
            onSelectNode(nodeId)
            onSelectConnectionId(null)
          }}
          onSelectTarget={(nodeId) => {
            onSelectNode(nodeId)
            onSelectConnectionId(null)
          }}
          onDeleteEdge={(connectionId) => {
            onDeleteConnection(connectionId)
            onSelectConnectionId(null)
          }}
          onOpenRunDetail={(connectionId) => {
            onSelectConnectionId(connectionId)
            onOpenRunDetail()
          }}
          anchor={canvasMode === 'standard' ? null : edgeHudAnchor}
          onMeasuredSizeChange={handleEdgeHudSizeChange}
        />
        <CognitiveHudOverlay hudSnapshot={hudSnapshot} centralHudView={centralHudView} semanticFocusPath={semanticFocusPath} />
      </div>
      {belowCanvasSlot}
    </div>
  )
}

function areHudAnchorsEqual(a: CanvasHudAnchor | null, b: CanvasHudAnchor | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.source === b.source &&
    a.placement === b.placement &&
    a.collisionIds.join('|') === b.collisionIds.join('|')
  )
}

function areHudSizesEqual(a: CanvasHudSize | null, b: CanvasHudSize | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.width === b.width && a.height === b.height
}
