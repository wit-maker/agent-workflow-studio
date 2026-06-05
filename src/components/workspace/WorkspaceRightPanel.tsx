import { useEffect, useRef, useState } from 'react'
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
  WorkflowConnectionRuntimePolicy,
  WorkflowNode,
} from '../../domain/workflow'
import type { ConnectionValidationResult } from '../../state/workflowSelectors'
import { HumanReviewPanel } from '../HumanReviewPanel'
import { Inspector } from '../Inspector'
import { AssistantPanel } from './AssistantPanel'
import { SituationPanel } from './SituationPanel'

/*
 * WorkspaceRightPanel
 *
 * Right region — issue #34 redesign.
 *
 * Replaces the previous "selected node config only" inspector with a
 * mode-switching container:
 *
 *   - Situation: derived "what to look at right now" view (read-only)
 *   - Inspector: existing selected node / connection editor
 *   - Assistant: situation-explanation layer surfaced for humans
 *   - Human Review: approve / revise / reject / skip flow
 *
 * Modes are local UI state. New node selections nudge the panel to
 * Inspector, and newly pending reviews nudge it to Human Review. The
 * user can always switch modes manually after either nudge.
 */

type RightPanelMode = 'situation' | 'inspector' | 'assistant' | 'humanReview'

type WorkspaceRightPanelProps = {
  selectedNode: WorkflowNode | undefined
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  connectionValidation: ConnectionValidationResult[]
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: ConnectorJob[]
  hudSnapshot: HudSnapshot
  runHistoryRecords: WorkflowRunRecord[]
  evaluation: EvaluationResult | undefined
  humanReview: HumanReviewState | undefined
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
  onUpdateConnectionRuntimePolicy: (
    connectionId: string,
    runtimePolicy: WorkflowConnectionRuntimePolicy | undefined,
  ) => void
  onDeleteConnection: (connectionId: string) => void
  onDeleteNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, position: WorkflowNode['position']) => void
  onHumanReviewDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
}

export function WorkspaceRightPanel({
  selectedNode,
  nodes,
  connections,
  connectionValidation,
  workflow,
  executionGraph,
  connectorJobs,
  hudSnapshot,
  runHistoryRecords,
  evaluation,
  humanReview,
  onSaveNode,
  onCreateConnection,
  onUpdateConnectionRuntimePolicy,
  onDeleteConnection,
  onDeleteNode,
  onMoveNode,
  onHumanReviewDecide,
  onRequestRebuild,
}: WorkspaceRightPanelProps) {
  const [mode, setMode] = useState<RightPanelMode>('situation')
  const previousSelectedNodeIdRef = useRef<string | null>(null)
  const previousReviewPendingRef = useRef(false)

  const reviewPending = humanReview
    ? humanReview.decision === 'pending'
    : workflow.status === 'review_required' || evaluation?.status === 'needs_review'

  useEffect(() => {
    const becamePending = reviewPending && !previousReviewPendingRef.current
    if (becamePending) {
      setMode('humanReview')
    }
    previousReviewPendingRef.current = reviewPending
  }, [reviewPending])

  useEffect(() => {
    const selectedNodeId = selectedNode?.id ?? null
    const changedSelection = selectedNodeId !== previousSelectedNodeIdRef.current
    if (selectedNodeId && changedSelection && !reviewPending) {
      setMode('inspector')
    }
    previousSelectedNodeIdRef.current = selectedNodeId
  }, [selectedNode?.id, reviewPending])

  return (
    <aside className="workspace-right-panel" aria-label="状況・選択・補佐・レビュー">
      <nav className="right-panel-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'situation'}
          className={mode === 'situation' ? 'active' : ''}
          onClick={() => setMode('situation')}
        >
          状況
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'inspector'}
          className={mode === 'inspector' ? 'active' : ''}
          onClick={() => setMode('inspector')}
        >
          選択
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'assistant'}
          className={mode === 'assistant' ? 'active' : ''}
          onClick={() => setMode('assistant')}
        >
          補佐官
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'humanReview'}
          className={`${mode === 'humanReview' ? 'active' : ''} ${reviewPending ? 'pending' : ''}`}
          onClick={() => setMode('humanReview')}
        >
          レビュー
          {reviewPending ? <span className="pending-dot" aria-label="承認待ち" /> : null}
        </button>
      </nav>

      <div className="right-panel-body">
        {mode === 'situation' ? <SituationPanel hudSnapshot={hudSnapshot} /> : null}
        {mode === 'inspector' ? (
          <Inspector
            selectedNode={selectedNode}
            nodes={nodes}
            connections={connections}
            connectionValidation={connectionValidation}
            onSaveNode={onSaveNode}
            onCreateConnection={onCreateConnection}
            onUpdateConnectionRuntimePolicy={onUpdateConnectionRuntimePolicy}
            onDeleteConnection={onDeleteConnection}
            onDeleteNode={onDeleteNode}
            onMoveNode={onMoveNode}
          />
        ) : null}
        {mode === 'assistant' ? (
          <AssistantPanel
            workflow={workflow}
            executionGraph={executionGraph}
            connectorJobs={connectorJobs}
            connectionValidation={connectionValidation}
            hudSnapshot={hudSnapshot}
            runHistoryRecords={runHistoryRecords}
          />
        ) : null}
        {mode === 'humanReview' ? (
          <div className="right-panel-human-review">
            <HumanReviewPanel
              evaluation={evaluation}
              humanReview={humanReview}
              onDecide={onHumanReviewDecide}
              onRequestRebuild={onRequestRebuild}
            />
          </div>
        ) : null}
      </div>
    </aside>
  )
}
