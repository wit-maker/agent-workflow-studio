import type { ArtifactVersion, EvaluationResult, HumanReviewState, RebuildRequest } from '../domain/evaluation'
import type { ExecutionGraph, ExecutionStep } from '../domain/executionGraph'
import { createEmptyExecutionGraph } from '../domain/executionGraph'
import type { Workflow } from '../domain/workflow'
import type { WorkflowAction } from './workflowActions'

export type WorkflowHistorySnapshot = {
  workflow: Workflow
  selectedNodeId: string
}

export type WorkflowState = {
  workflow: Workflow
  past: WorkflowHistorySnapshot[]
  future: WorkflowHistorySnapshot[]
  executionGraph: ExecutionGraph | null
  selectedNodeId: string
  isRunning: boolean
  checkOutcome: 'PASS' | 'REVIEW' | 'FAIL'
  importError: string | null
  evaluation?: EvaluationResult
  humanReview?: HumanReviewState
  rebuildRequests: RebuildRequest[]
  artifactVersions: ArtifactVersion[]
  selectedArtifactVersionId?: string
}

const maxHistoryDepth = 50

function createHistorySnapshot(state: WorkflowState): WorkflowHistorySnapshot {
  return {
    workflow: state.workflow,
    selectedNodeId: state.selectedNodeId,
  }
}

function restoreEditableWorkflow(current: Workflow, snapshot: Workflow): Workflow {
  return {
    ...current,
    id: snapshot.id,
    schemaVersion: snapshot.schemaVersion,
    name: snapshot.name,
    description: snapshot.description,
    version: snapshot.version,
    nodes: snapshot.nodes,
    connections: snapshot.connections,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  }
}

function withHistory(
  state: WorkflowState,
  workflow: Workflow,
  selectedNodeId = state.selectedNodeId,
): WorkflowState {
  return {
    ...state,
    workflow,
    selectedNodeId,
    past: [...state.past, createHistorySnapshot(state)].slice(-maxHistoryDepth),
    future: [],
  }
}

function getSafeSelectedNodeId(workflow: Workflow, selectedNodeId: string): string {
  return workflow.nodes.some((node) => node.id === selectedNodeId)
    ? selectedNodeId
    : (workflow.nodes[0]?.id ?? '')
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
              status === 'failed' ||
              status === 'skipped'
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

function updateExecutionStep(
  graph: ExecutionGraph | null,
  stepId: string,
  updater: (step: ExecutionStep) => ExecutionStep,
): ExecutionGraph | null {
  if (!graph) {
    return null
  }

  return {
    ...graph,
    steps: graph.steps.map((step) => (step.id === stepId ? updater(step) : step)),
  }
}

function appendUnique(values: string[], nextValue: string): string[] {
  return values.includes(nextValue) ? values : [...values, nextValue]
}

export function createWorkflowState(workflow: Workflow): WorkflowState {
  return {
    workflow,
    past: [],
    future: [],
    executionGraph: null,
    selectedNodeId: workflow.nodes[0]?.id ?? '',
    isRunning: false,
    checkOutcome: 'PASS',
    importError: null,
    evaluation: undefined,
    humanReview: undefined,
    rebuildRequests: [],
    artifactVersions: [],
    selectedArtifactVersionId: undefined,
  }
}

export function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  switch (action.type) {
    case 'selectNode':
      return { ...state, selectedNodeId: action.nodeId }

    case 'addNode':
      return withHistory(
        state,
        {
          ...state.workflow,
          nodes: [...state.workflow.nodes, action.node],
          updatedAt: new Date().toISOString(),
        },
        action.node.id,
      )

    case 'deleteNode': {
      const nextNodes = state.workflow.nodes.filter((node) => node.id !== action.nodeId)
      const nextSelectedNodeId =
        state.selectedNodeId === action.nodeId
          ? (nextNodes[0]?.id ?? '')
          : state.selectedNodeId

      return withHistory(
        state,
        {
          ...state.workflow,
          nodes: nextNodes,
          connections: state.workflow.connections.filter(
            (connection) =>
              connection.sourceNodeId !== action.nodeId &&
              connection.targetNodeId !== action.nodeId,
          ),
          updatedAt: new Date().toISOString(),
        },
        nextSelectedNodeId,
      )
    }

    case 'updateNodePositions': {
      const changed = state.workflow.nodes.some((node) => {
        const nextPosition = action.positions[node.id]
        return (
          nextPosition &&
          (nextPosition.x !== node.position.x || nextPosition.y !== node.position.y)
        )
      })

      if (!changed) {
        return state
      }

      return withHistory(state, {
        ...state.workflow,
        nodes: state.workflow.nodes.map((node) =>
          action.positions[node.id] ? { ...node, position: action.positions[node.id] } : node,
        ),
        updatedAt: new Date().toISOString(),
      })
    }

    case 'updateNodeConfig':
      return withHistory(state, {
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
        })

    case 'createConnection':
      return withHistory(state, {
          ...state.workflow,
          connections: [...state.workflow.connections, action.connection],
          updatedAt: new Date().toISOString(),
        })

    case 'deleteConnection':
      return withHistory(state, {
          ...state.workflow,
          connections: state.workflow.connections.filter(
            (connection) => connection.id !== action.connectionId,
          ),
          updatedAt: new Date().toISOString(),
        })

    case 'runWorkflowStart': {
      const queuedNodeIds = action.nodeIds ? new Set(action.nodeIds) : null
      return {
        ...state,
        isRunning: true,
        importError: null,
        evaluation: undefined,
        humanReview: undefined,
        executionGraph: createEmptyExecutionGraph(action.runId),
        workflow: {
          ...state.workflow,
          status: 'running',
          nodes: state.workflow.nodes.map((node) => ({
            ...node,
            status: !queuedNodeIds || queuedNodeIds.has(node.id) ? 'queued' : 'idle',
          })),
          connections: state.workflow.connections.map((connection) => ({
            ...connection,
            status: 'inactive',
          })),
          logs: [action.log],
          artifact: {
            title: '実行準備中の成果物',
            format: 'Preview',
            content: 'ローカルシミュレーターが成果物を準備しています。',
            status: 'draft',
          },
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'clearExecutionGraph':
      return {
        ...state,
        executionGraph: null,
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
          status: 'running',
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
            status !== 'skipped' &&
            (connection.sourceNodeId === action.nodeId || connection.targetNodeId === action.nodeId)
              ? { ...connection, status: 'success' }
              : connection,
          ),
          status: status === 'review_required' ? 'review_required' : state.workflow.status,
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

    case 'runNodeRetryReady':
      return {
        ...state,
        workflow: markNodeStatus(state.workflow, action.nodeId, 'retry_ready'),
      }

    case 'runStepQueued':
      return {
        ...state,
        executionGraph: state.executionGraph
          ? {
              ...state.executionGraph,
              steps: [...state.executionGraph.steps, action.step],
              activeStepId: action.step.id,
            }
          : {
              ...createEmptyExecutionGraph(action.step.runId),
              steps: [action.step],
              activeStepId: action.step.id,
            },
      }

    case 'runStepRunning': {
      const updatedGraph = updateExecutionStep(state.executionGraph, action.stepId, (step) => ({
        ...step,
        status: 'running',
        startedAt: action.startedAt ?? step.startedAt ?? new Date().toISOString(),
        message: action.message ?? step.message,
      }))
      return {
        ...state,
        executionGraph: updatedGraph
          ? {
              ...updatedGraph,
              activeStepId: action.stepId,
            }
          : state.executionGraph,
      }
    }

    case 'runStepSuccess': {
      const updatedGraph = updateExecutionStep(state.executionGraph, action.stepId, (step) => ({
        ...step,
        status: 'success',
        finishedAt: action.finishedAt ?? new Date().toISOString(),
        durationMs: action.durationMs ?? step.durationMs,
        message: action.message ?? step.message,
      }))
      const updatedStep = updatedGraph?.steps.find((step) => step.id === action.stepId)

      return {
        ...state,
        executionGraph: updatedGraph
          ? {
              ...updatedGraph,
              activeStepId:
                updatedGraph.activeStepId === action.stepId
                  ? undefined
                  : updatedGraph.activeStepId,
              failedStepId:
                updatedGraph.failedStepId === action.stepId
                  ? undefined
                  : updatedGraph.failedStepId,
              reviewStepId:
                updatedGraph.reviewStepId === action.stepId
                  ? undefined
                  : updatedGraph.reviewStepId,
              retryCandidates: updatedGraph.retryCandidates.filter(
                (candidate) =>
                  candidate !== action.stepId &&
                  candidate !== updatedStep?.retryOfStepId,
              ),
            }
          : state.executionGraph,
      }
    }

    case 'runStepFailed': {
      const updatedGraph = updateExecutionStep(state.executionGraph, action.stepId, (step) => ({
        ...step,
        status: 'failed',
        finishedAt: action.finishedAt ?? new Date().toISOString(),
        durationMs: action.durationMs ?? step.durationMs,
        message: action.message ?? step.message,
        error: action.error ?? step.error,
      }))
      return {
        ...state,
        executionGraph: updatedGraph
          ? {
              ...updatedGraph,
              activeStepId: undefined,
              failedStepId: action.stepId,
            }
          : state.executionGraph,
      }
    }

    case 'runStepReviewRequired': {
      const updatedGraph = updateExecutionStep(state.executionGraph, action.stepId, (step) => ({
        ...step,
        status: 'review_required',
        finishedAt: action.finishedAt ?? new Date().toISOString(),
        durationMs: action.durationMs ?? step.durationMs,
        message: action.message ?? step.message,
      }))
      return {
        ...state,
        executionGraph: updatedGraph
          ? {
              ...updatedGraph,
              activeStepId: undefined,
              reviewStepId: action.stepId,
            }
          : state.executionGraph,
      }
    }

    case 'addExecutionRoute':
      return state.executionGraph
        ? {
            ...state,
            executionGraph: {
              ...state.executionGraph,
              routes: [...state.executionGraph.routes, action.route],
            },
          }
        : state

    case 'setRetryCandidate':
      return state.executionGraph
        ? {
            ...state,
            executionGraph: {
              ...state.executionGraph,
              retryCandidates: appendUnique(state.executionGraph.retryCandidates, action.stepId),
            },
          }
        : state

    case 'retryExecutionStep':
      return {
        ...state,
        executionGraph: state.executionGraph
          ? {
              ...state.executionGraph,
              steps: [...state.executionGraph.steps, action.step],
              activeStepId: action.step.id,
            }
          : {
              ...createEmptyExecutionGraph(action.step.runId),
              steps: [action.step],
              activeStepId: action.step.id,
            },
      }

    case 'approveReviewStep': {
      const updatedGraph = updateExecutionStep(state.executionGraph, action.stepId, (step) => ({
        ...step,
        status: 'success',
        message: '確認後に続行しました。',
      }))
      return {
        ...state,
        executionGraph: updatedGraph
          ? {
              ...updatedGraph,
              reviewStepId: undefined,
              failedStepId: undefined,
            }
          : state.executionGraph,
      }
    }

    case 'returnReviewStep': {
      const updatedGraph = updateExecutionStep(state.executionGraph, action.stepId, (step) => ({
        ...step,
        status: 'failed',
        error: step.error ?? '確認結果により差し戻されました。',
      }))
      return {
        ...state,
        executionGraph: updatedGraph
          ? {
              ...updatedGraph,
              reviewStepId: undefined,
              failedStepId: action.stepId,
              retryCandidates: appendUnique(updatedGraph.retryCandidates, action.stepId),
            }
          : state.executionGraph,
      }
    }

    case 'skipReviewStep':
      return {
        ...state,
        executionGraph: state.executionGraph
          ? {
              ...state.executionGraph,
              steps: [...state.executionGraph.steps, action.step],
              reviewStepId: undefined,
              activeStepId: undefined,
            }
          : {
              ...createEmptyExecutionGraph(action.step.runId),
              steps: [action.step],
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

    case 'setWorkflowStatus':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          status: action.status,
          updatedAt: new Date().toISOString(),
        },
      }

    case 'importWorkflow':
      return {
        ...state,
        past: [...state.past, createHistorySnapshot(state)].slice(-maxHistoryDepth),
        future: [],
        workflow: action.workflow,
        executionGraph: null,
        selectedNodeId: action.workflow.nodes[0]?.id ?? '',
        isRunning: false,
        importError: null,
        evaluation: undefined,
        humanReview: undefined,
        rebuildRequests: [],
        artifactVersions: [],
        selectedArtifactVersionId: undefined,
      }

    case 'resetWorkflow':
      return {
        ...createWorkflowState(action.workflow),
        past: [...state.past, createHistorySnapshot(state)].slice(-maxHistoryDepth),
      }

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
          : undefined,
      }

    case 'setEvaluationResult':
      return { ...state, evaluation: action.result }

    case 'setHumanReviewDecision':
      return {
        ...state,
        humanReview: {
          decision: action.decision,
          reviewer: action.reviewer,
          note: action.note,
          decidedAt: new Date().toISOString(),
        },
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
        rebuildRequests: state.rebuildRequests.map((req) =>
          req.id === action.requestId ? { ...req, status: 'running' } : req,
        ),
      }

    case 'completeRebuild':
      return {
        ...state,
        rebuildRequests: state.rebuildRequests.map((req) =>
          req.id === action.requestId ? { ...req, status: 'completed' } : req,
        ),
      }

    case 'cancelRebuild':
      return {
        ...state,
        rebuildRequests: state.rebuildRequests.map((req) =>
          req.id === action.requestId ? { ...req, status: 'cancelled' } : req,
        ),
      }

    case 'addArtifactVersion':
      return {
        ...state,
        artifactVersions: [...state.artifactVersions, action.version],
        selectedArtifactVersionId: action.version.id,
        workflow: {
          ...state.workflow,
          artifact: { ...state.workflow.artifact, content: action.version.content },
          updatedAt: new Date().toISOString(),
        },
      }

    case 'selectArtifactVersion': {
      const version = state.artifactVersions.find((v) => v.id === action.versionId)
      return {
        ...state,
        selectedArtifactVersionId: action.versionId,
        workflow: version
          ? {
              ...state.workflow,
              artifact: { ...state.workflow.artifact, content: version.content },
              updatedAt: new Date().toISOString(),
            }
          : state.workflow,
      }
    }

    case 'clearEvaluation':
      return {
        ...state,
        evaluation: undefined,
        humanReview: undefined,
      }

    case 'undo': {
      const previous = state.past[state.past.length - 1]
      if (!previous) {
        return state
      }

      const workflow = restoreEditableWorkflow(state.workflow, previous.workflow)
      return {
        ...state,
        workflow,
        selectedNodeId: getSafeSelectedNodeId(workflow, previous.selectedNodeId),
        past: state.past.slice(0, -1),
        future: [createHistorySnapshot(state), ...state.future],
        executionGraph: null,
        isRunning: false,
      }
    }

    case 'redo': {
      const next = state.future[0]
      if (!next) {
        return state
      }

      const workflow = restoreEditableWorkflow(state.workflow, next.workflow)
      return {
        ...state,
        workflow,
        selectedNodeId: getSafeSelectedNodeId(workflow, next.selectedNodeId),
        past: [...state.past, createHistorySnapshot(state)].slice(-maxHistoryDepth),
        future: state.future.slice(1),
        executionGraph: null,
        isRunning: false,
      }
    }

    default:
      return state
  }
}
