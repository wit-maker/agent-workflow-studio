import type { ReactNode } from 'react'
import type { HudSnapshot } from '../../domain/cognitiveHud'
import type { ConnectorJob } from '../../domain/connectorQueue'
import type {
  EvaluationResult,
  HumanReviewState,
  ReviewDecision,
} from '../../domain/evaluation'
import type { ExecutionGraph } from '../../domain/executionGraph'
import type { WorkflowRunRecord } from '../../domain/runHistory'
import type {
  AgentRole,
  ConnectionKind,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
  WorkflowStatus,
} from '../../domain/workflow'
import type { ConnectionValidationResult } from '../../state/workflowSelectors'
import type { CanvasMode } from '../TopBar'
import { GameHudShell } from './GameHudShell'

/*
 * CognitiveWorkspaceShell
 *
 * Top-level layout — issue #34 redesign.
 *
 * Region responsibilities:
 *   Top     : Global Run Control + Current State Strip
 *   Left    : Component Palette / Workflow Library / Templates
 *   Center  : Cognitive Workflow Canvas (+ HUD overlay)
 *   Right   : Situation / Inspector / Assistant / Human Review
 *   Bottom  : Collapsible Detail Drawers (the demoted BottomMonitor)
 *   Overlay : Cognitive HUD overlay (in canvas) + Critical Overlay (root)
 *
 * Per Issue #31, the cognitive HUD is the attention-allocation editing
 * layer (not a tab), and the situation assistant is the human-role
 * expression of the situation-explanation generation layer (not a
 * single tab or a character image). This shell is the structural home
 * for those concepts; the actual layer logic continues to grow in
 * follow-up phases.
 */

type CognitiveWorkspaceShellProps = {
  workflow: Workflow
  workflowStatus: WorkflowStatus
  isRunning: boolean
  canvasMode: CanvasMode
  canUndo: boolean
  canRedo: boolean
  selectedNodeId: string
  selectedNode: WorkflowNode | undefined
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  connectionValidation: ConnectionValidationResult[]
  executionGraph: ExecutionGraph | null
  connectorJobs: ConnectorJob[]
  evaluation: EvaluationResult | undefined
  humanReview: HumanReviewState | undefined
  hudSnapshot: HudSnapshot
  runHistoryRecords: WorkflowRunRecord[]
  runHistoryCount: number
  checkOutcome: 'PASS' | 'REVIEW' | 'FAIL'
  onRun: () => void
  onRunSelected: () => void
  onRunFromSelected: () => void
  onDryRun: () => void
  onStop: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  onChangeCanvasMode: (mode: CanvasMode) => void
  onSelectNode: (nodeId: string) => void
  onAddNode: (part: WorkflowNode) => void
  onSaveNode: (
    nodeId: string,
    updates: {
      title: string
      description: string
      agentRole: AgentRole | undefined
      config: Record<string, unknown>
    },
  ) => void
  onCreateConnection: (draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) => void
  onCreateConnectionDraft: (draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) => { ok: boolean; reason: string | null }
  onDeleteConnection: (connectionId: string) => void
  onDeleteNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, position: WorkflowNode['position']) => void
  onResetReactFlowPositions: () => void
  onHumanReviewDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
  detailDrawerSlot: ReactNode
  flashSlot?: ReactNode
  confirmSlot?: ReactNode
}

export function CognitiveWorkspaceShell(props: CognitiveWorkspaceShellProps) {
  return <GameHudShell {...props} />
}
