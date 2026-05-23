import type {
  Workflow,
  WorkflowArtifact,
  WorkflowMetric,
  WorkflowNode,
  WorkflowNodeStatus,
  WorkflowRunLog,
} from '../domain/workflow'

export type NodeEditableFields = Pick<WorkflowNode, 'title' | 'description'> &
  Partial<Pick<WorkflowNode, 'agentRole'>> & {
    config: Record<string, unknown>
  }

export type WorkflowAction =
  | { type: 'selectNode'; nodeId: string }
  | { type: 'updateNodeConfig'; nodeId: string; updates: NodeEditableFields }
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
