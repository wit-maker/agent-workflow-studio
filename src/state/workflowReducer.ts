import type { ArtifactVersion, EvaluationResult, HumanReviewState, RebuildRequest } from '../domain/evaluation'
import type { ExecutionGraph } from '../domain/executionGraph'
import type { Workflow } from '../domain/workflow'
import type { WorkflowAction } from './workflowActions'

export type WorkflowState = {
  workflow: Workflow
  selectedNodeId: string
  isRunning: boolean
  checkOutcome: 'PASS' | 'REVIEW' | 'FAIL'
  importError: string | null
  evaluation?: EvaluationResult
  humanReview?: HumanReviewState
  rebuildRequests: RebuildRequest[]
  artifactVersions: ArtifactVersion[]
  selectedArtifactVersionId?: string
  executionGraph: ExecutionGraph | null
}

function markNodeStatus(
  workflow: Workflow,
  nodeId: string,
  status: Workflow['nodes'][number]['status'],
  error?: string,
): Workflow {
  const now = new Date().toISOString()

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            status,
            lastRun: {
              ...node.lastRun,
              ...(status === 'running' ? { startedAt: now } : {}),
              ...(status === 'success' ||
              status === 'review_required' ||
              status === 'failed'
                ? { finishedAt: now }
                : {}),
              ...(error ? { error } : {}),
            },
          }
        : node,
    ),
    updatedAt: now,
  }
}

export function createWorkflowState(workflow: Workflow): WorkflowState {
  return {
    workflow,
    selectedNodeId: workflow.nodes[0]?.id ?? '',
    isRunning: false,
    checkOutcome: 'PASS',
    importError: null,
    evaluation: undefined,
    humanReview: undefined,
    rebuildRequests: [],
    artifactVersions: [],
    selectedArtifactVersionId: undefined,
    executionGraph: null,
  }
}

export function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  switch (action.type) {
    case 'selectNode':
      return { ...state, selectedNodeId: action.nodeId }

    case 'updateNodeConfig':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((node) =>
            node.id === action.nodeId
              ? {
                  ...node,
                  title: action.updates.title,
                  description: action.updates.description,
                  agentRole: action.updates.agentRole,
                  config: action.updates.config,
                }
              : node,
          ),
          updatedAt: new Date().toISOString(),
        },
      }

    case 'createConnection':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          connections: [...state.workflow.connections, action.connection],
          updatedAt: new Date().toISOString(),
        },
      }

    case 'deleteConnection':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          connections: state.workflow.connections.filter(
            (connection) => connection.id !== action.connectionId,
          ),
          updatedAt: new Date().toISOString(),
        },
      }

    case 'runWorkflowStart':
      return {
        ...state,
        isRunning: true,
        importError: null,
        evaluation: undefined,
        humanReview: undefined,
        executionGraph: null,
        workflow: {
          ...state.workflow,
          status: 'running',
          nodes: state.workflow.nodes.map((node) => ({ ...node, status: 'queued' })),
          connections: state.workflow.connections.map((connection) => ({
            ...connection,
            status: 'inactive',
          })),
          logs: [action.log],
          artifact: {
            title: 'Artifact in progress',
            format: 'Preview',
            content: 'The local simulator is preparing the workflow artifact.',
            status: 'draft',
          },
          updatedAt: new Date().toISOString(),
        },
      }

    case 'runNodeQueued':
      return {
        ...state,
        workflow: markNodeStatus(state.workflow, action.nodeId, 'queued'),
      }

    case 'runNodeRunning':
      return {
        ...state,
        workflow: {
          ...markNodeStatus(state.workflow, action.nodeId, 'running'),
          logs: [...state.workflow.logs, action.log],
          connections: state.workflow.connections.map((connection) =>
            connection.sourceNodeId === action.nodeId || connection.targetNodeId === action.nodeId
              ? { ...connection, status: 'active' }
              : connection,
          ),
        },
      }

    case 'runNodeSuccess': {
      const status = action.status ?? 'success'
      return {
        ...state,
        workflow: {
          ...markNodeStatus(state.workflow, action.nodeId, status),
          logs: [...state.workflow.logs, action.log],
          connections: state.workflow.connections.map((connection) =>
            connection.sourceNodeId === action.nodeId || connection.targetNodeId === action.nodeId
              ? { ...connection, status: 'success' }
              : connection,
          ),
        },
      }
    }

    case 'runNodeFailed':
      return {
        ...state,
        isRunning: false,
        workflow: {
          ...markNodeStatus(state.workflow, action.nodeId, 'failed', action.error),
          status: 'failed',
          logs: [...state.workflow.logs, action.log],
        },
      }

    case 'appendLog':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          logs: [...state.workflow.logs, action.log],
          updatedAt: new Date().toISOString(),
        },
      }

    case 'updateMetrics':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          metrics: action.metrics,
          status: state.checkOutcome === 'REVIEW' ? 'review_required' : 'success',
          updatedAt: new Date().toISOString(),
        },
      }

    case 'setArtifact':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          artifact: action.artifact,
          updatedAt: new Date().toISOString(),
        },
      }

    case 'importWorkflow':
      return {
        ...state,
        workflow: action.workflow,
        selectedNodeId: action.workflow.nodes[0]?.id ?? '',
        isRunning: false,
        importError: null,
      }

    case 'resetWorkflow':
      return createWorkflowState(action.workflow)

    case 'setRunning':
      return { ...state, isRunning: action.isRunning }

    case 'setCheckOutcome':
      return { ...state, checkOutcome: action.outcome }

    case 'setImportError':
      return { ...state, importError: action.message }

    case 'startEvaluation':
      return {
        ...state,
        evaluation: state.evaluation
          ? { ...state.evaluation, status: 'evaluating' }
          : {
              id: `eval-pending-${Date.now()}`,
              runId: '',
              status: 'evaluating',
              totalScore: 0,
              maxScore: 100,
              criteria: [],
              summary: '評価中...',
              createdAt: new Date().toISOString(),
            },
      }

    case 'setEvaluationResult':
      return { ...state, evaluation: action.result }

    case 'setHumanReviewDecision': {
      const now = new Date().toISOString()
      return {
        ...state,
        humanReview: {
          decision: action.decision,
          reviewer: 'human',
          note: action.note,
          decidedAt: now,
        },
      }
    }

    case 'updateHumanReview':
      return { ...state, humanReview: action.review }

    case 'requestRebuild':
      return {
        ...state,
        rebuildRequests: [...state.rebuildRequests, action.request],
      }

    case 'startRebuild':
      return {
        ...state,
        rebuildRequests: state.rebuildRequests.map((r) =>
          r.id === action.requestId ? { ...r, status: 'running' } : r,
        ),
      }

    case 'completeRebuild':
      return {
        ...state,
        rebuildRequests: state.rebuildRequests.map((r) =>
          r.id === action.requestId ? { ...r, status: 'completed' } : r,
        ),
        artifactVersions: [...state.artifactVersions, action.artifactVersion],
        selectedArtifactVersionId: action.artifactVersion.id,
        workflow: {
          ...state.workflow,
          artifact: {
            ...state.workflow.artifact,
            content: action.artifactVersion.content,
            status: 'draft',
          },
        },
      }

    case 'cancelRebuild':
      return {
        ...state,
        rebuildRequests: state.rebuildRequests.map((r) =>
          r.id === action.requestId ? { ...r, status: 'cancelled' } : r,
        ),
      }

    case 'addArtifactVersion':
      return {
        ...state,
        artifactVersions: [...state.artifactVersions, action.version],
        selectedArtifactVersionId: action.version.id,
      }

    case 'selectArtifactVersion': {
      const version = state.artifactVersions.find((v) => v.id === action.versionId)
      if (!version) {
        return { ...state, selectedArtifactVersionId: action.versionId }
      }
      return {
        ...state,
        selectedArtifactVersionId: action.versionId,
        workflow: {
          ...state.workflow,
          artifact: {
            ...state.workflow.artifact,
            content: version.content,
          },
        },
      }
    }

    case 'clearEvaluation':
      return {
        ...state,
        evaluation: undefined,
        humanReview: undefined,
      }

    case 'setExecutionGraph':
      return { ...state, executionGraph: action.graph }

    case 'clearExecutionGraph':
      return { ...state, executionGraph: null }

    default:
      return state
  }
}
