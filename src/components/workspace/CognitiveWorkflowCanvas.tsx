import type { ReactNode } from 'react'
import type { HudSnapshot } from '../../domain/cognitiveHud'
import type { ConnectionKind, Workflow, WorkflowNode } from '../../domain/workflow'
import type { ConnectionValidationResult } from '../../state/workflowSelectors'
import type { CanvasMode } from '../TopBar'
import { ReactFlowCanvas } from '../ReactFlowCanvas'
import { StagePreview } from '../StagePreview'
import { WorkflowCanvas } from '../WorkflowCanvas'
import type { ExecutionGraph } from '../../domain/executionGraph'
import type { EvaluationResult, HumanReviewState } from '../../domain/evaluation'
import { CognitiveHudOverlay } from './CognitiveHudOverlay'

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
  executionGraph: ExecutionGraph | null
  evaluation: EvaluationResult | undefined
  humanReview: HumanReviewState | undefined
  checkOutcome: 'PASS' | 'REVIEW' | 'FAIL'
  hudSnapshot: HudSnapshot
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
  onResetPositions: () => void
  belowCanvasSlot?: ReactNode
}

export function CognitiveWorkflowCanvas({
  workflow,
  canvasMode,
  selectedNodeId,
  selectedNode,
  connectionValidation,
  executionGraph,
  evaluation,
  humanReview,
  checkOutcome,
  hudSnapshot,
  onSelectNode,
  onCreateConnection,
  onDeleteConnection,
  onDeleteNode,
  onMoveNode,
  onResetPositions,
  belowCanvasSlot,
}: CognitiveWorkflowCanvasProps) {
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
            onSelectNode={onSelectNode}
            connectionValidation={connectionValidation}
            onCreateConnection={onCreateConnection}
            onDeleteConnection={onDeleteConnection}
            onDeleteNode={onDeleteNode}
            onMoveNode={onMoveNode}
            onResetPositions={onResetPositions}
          />
        )}
        <CognitiveHudOverlay hudSnapshot={hudSnapshot} />
      </div>
      <StagePreview
        artifact={workflow.artifact}
        checkOutcome={checkOutcome}
        workflow={workflow}
        selectedNode={selectedNode}
        executionGraph={executionGraph}
        evaluation={evaluation}
        humanReview={humanReview}
      />
      {belowCanvasSlot}
    </div>
  )
}
