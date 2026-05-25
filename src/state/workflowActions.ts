import type { EvaluationResult, HumanReviewState, RebuildRequest, ArtifactVersion, ReviewDecision } from '../domain/evaluation'
import type { ExecutionRoute, ExecutionStep } from '../domain/executionGraph'
import type { WorkflowRunStatus } from '../domain/runHistory'
import type {
  Workflow,
  WorkflowArtifact,
  WorkflowConnection,
  WorkflowMetric,
  WorkflowNode,
  WorkflowNodeStatus,
  WorkflowRunLog,
  WorkflowStatus,
} from '../domain/workflow'

export type NodeEditableFields = Pick<WorkflowNode, 'title' | 'description'> &
  Partial<Pick<WorkflowNode, 'agentRole'>> & {
    config: Record<string, unknown>
  }

export type WorkflowAction =
  | { type: 'selectNode'; nodeId: string }
  | { type: 'addNode'; node: WorkflowNode }
  | { type: 'deleteNode'; nodeId: string }
  | { type: 'updateNodePositions'; positions: Record<string, WorkflowNode['position']> }
  | { type: 'updateNodeConfig'; nodeId: string; updates: NodeEditableFields }
  | { type: 'createConnection'; connection: WorkflowConnection }
  | { type: 'deleteConnection'; connectionId: string }
  | { type: 'runWorkflowStart'; runId: string; log: WorkflowRunLog; nodeIds?: string[] }
  | { type: 'clearExecutionGraph' }
  | { type: 'runNodeQueued'; nodeId: string }
  | { type: 'runNodeRunning'; nodeId: string; log: WorkflowRunLog }
  | {
      type: 'runNodeSuccess'
      nodeId: string
      status?: Extract<WorkflowNodeStatus, 'success' | 'review_required' | 'skipped'>
      log: WorkflowRunLog
    }
  | { type: 'runNodeFailed'; nodeId: string; log: WorkflowRunLog; error?: string }
  | { type: 'runNodeRetryReady'; nodeId: string }
  | { type: 'runStepQueued'; step: ExecutionStep }
  | { type: 'runStepRunning'; stepId: string; startedAt?: string; message?: string }
  | {
      type: 'runStepSuccess'
      stepId: string
      finishedAt?: string
      durationMs?: number
      message?: string
    }
  | {
      type: 'runStepFailed'
      stepId: string
      finishedAt?: string
      durationMs?: number
      message?: string
      error?: string
    }
  | {
      type: 'runStepReviewRequired'
      stepId: string
      finishedAt?: string
      durationMs?: number
      message?: string
    }
  | { type: 'addExecutionRoute'; route: ExecutionRoute }
  | { type: 'setRetryCandidate'; stepId: string }
  | { type: 'retryExecutionStep'; step: ExecutionStep }
  | { type: 'approveReviewStep'; stepId: string }
  | { type: 'returnReviewStep'; stepId: string }
  | { type: 'skipReviewStep'; step: ExecutionStep }
  | { type: 'appendLog'; log: WorkflowRunLog }
  | { type: 'updateMetrics'; metrics: WorkflowMetric }
  | { type: 'setArtifact'; artifact: WorkflowArtifact }
  | { type: 'setWorkflowStatus'; status: WorkflowStatus }
  | { type: 'importWorkflow'; workflow: Workflow }
  | { type: 'resetWorkflow'; workflow: Workflow }
  | { type: 'setRunning'; isRunning: boolean }
  | { type: 'setCheckOutcome'; outcome: 'PASS' | 'REVIEW' | 'FAIL' }
  | { type: 'setImportError'; message: string | null }
  | { type: 'startEvaluation' }
  | { type: 'setEvaluationResult'; result: EvaluationResult }
  | { type: 'setHumanReviewDecision'; decision: ReviewDecision; reviewer: string; note?: string }
  | { type: 'updateHumanReview'; review: HumanReviewState }
  | { type: 'requestRebuild'; request: RebuildRequest }
  | { type: 'startRebuild'; requestId: string }
  | { type: 'completeRebuild'; requestId: string }
  | { type: 'cancelRebuild'; requestId: string }
  | { type: 'addArtifactVersion'; version: ArtifactVersion }
  | { type: 'selectArtifactVersion'; versionId: string }
  | { type: 'clearEvaluation' }
  | { type: 'runFinished'; runId: string; workflowStatus: WorkflowStatus; runStatus: WorkflowRunStatus }
  | { type: 'clearCompletedRun' }
  | { type: 'undo' }
  | { type: 'redo' }
