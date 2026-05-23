import type {
  Workflow,
  WorkflowArtifact,
  WorkflowMetric,
  WorkflowConnection,
  WorkflowNode,
  WorkflowNodeStatus,
  WorkflowRunLog,
} from '../domain/workflow'
import type {
  ArtifactVersion,
  EvaluationResult,
  HumanReviewState,
  RebuildRequest,
  ReviewDecision,
} from '../domain/evaluation'
import type { ExecutionGraph } from '../domain/executionGraph'

export type NodeEditableFields = Pick<WorkflowNode, 'title' | 'description'> &
  Partial<Pick<WorkflowNode, 'agentRole'>> & {
    config: Record<string, unknown>
  }

export type WorkflowAction =
  | { type: 'selectNode'; nodeId: string }
  | { type: 'updateNodeConfig'; nodeId: string; updates: NodeEditableFields }
  | { type: 'createConnection'; connection: WorkflowConnection }
  | { type: 'deleteConnection'; connectionId: string }
  | { type: 'runWorkflowStart'; runId: string; log: WorkflowRunLog }
  | { type: 'runNodeQueued'; nodeId: string }
  | { type: 'runNodeRunning'; nodeId: string; log: WorkflowRunLog }
  | {
      type: 'runNodeSuccess'
      nodeId: string
      status?: Extract<WorkflowNodeStatus, 'success' | 'review_required'>
      log: WorkflowRunLog
    }
  | { type: 'runNodeFailed'; nodeId: string; log: WorkflowRunLog; error?: string }
  | { type: 'appendLog'; log: WorkflowRunLog }
  | { type: 'updateMetrics'; metrics: WorkflowMetric }
  | { type: 'setArtifact'; artifact: WorkflowArtifact }
  | { type: 'importWorkflow'; workflow: Workflow }
  | { type: 'resetWorkflow'; workflow: Workflow }
  | { type: 'setRunning'; isRunning: boolean }
  | { type: 'setCheckOutcome'; outcome: 'PASS' | 'REVIEW' | 'FAIL' }
  | { type: 'setImportError'; message: string | null }
  | { type: 'startEvaluation' }
  | { type: 'setEvaluationResult'; result: EvaluationResult }
  | { type: 'setHumanReviewDecision'; decision: ReviewDecision; note?: string }
  | { type: 'requestRebuild'; request: RebuildRequest }
  | { type: 'startRebuild'; requestId: string }
  | { type: 'completeRebuild'; requestId: string; artifactVersion: ArtifactVersion }
  | { type: 'cancelRebuild'; requestId: string }
  | { type: 'addArtifactVersion'; version: ArtifactVersion }
  | { type: 'selectArtifactVersion'; versionId: string }
  | { type: 'clearEvaluation' }
  | { type: 'updateHumanReview'; review: HumanReviewState }
  | { type: 'setExecutionGraph'; graph: ExecutionGraph }
  | { type: 'clearExecutionGraph' }
