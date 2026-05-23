import type { Workflow } from '../domain/workflow'
import type { WorkflowAction } from './workflowActions'

export type WorkflowState = {
  workflow: Workflow
  selectedNodeId: string
  isRunning: boolean
  checkOutcome: 'PASS' | 'REVIEW' | 'FAIL'
  importError: string | null
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

    case 'runWorkflowStart':
      return {
        ...state,
        isRunning: true,
        importError: null,
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

    default:
      return state
  }
}
