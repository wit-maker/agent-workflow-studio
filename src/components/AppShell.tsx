import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { calculateBottleneck } from '../domain/connectionRules'
import { findPort, getOutputPorts } from '../domain/portRules'
import type { ArtifactVersion, ReviewDecision } from '../domain/evaluation'
import { runLocalEvaluation } from '../domain/evaluationRules'
import { buildRunArtifact, buildRunMetrics, SUCCESS_RATE_BY_OUTCOME } from '../domain/runEngine'
import { executeMockNode } from '../domain/nodeExecutors'
import { planWorkflowRun, type RunMode } from '../domain/runPlanner'
import type {
  ExecutionRoute,
  ExecutionRouteKind,
  ExecutionStep,
} from '../domain/executionGraph'
import { createSampleWorkflow } from '../domain/sampleWorkflow'
import { createNodeFromPart } from '../domain/workflowAuthoring'
import { buildConnectorLogMessage } from '../domain/agentExecution'
import type { ConnectorJob } from '../domain/connectorQueue'
import { buildConnectorJobs } from '../domain/connectorExecutionPlanner'
import {
  retryConnectorJob,
  markJobReviewed,
  skipConnectorJob,
  cancelConnectorJob,
} from '../domain/recoveryActions'
import type {
  AgentRole,
  ConnectionKind,
  Workflow,
  WorkflowArtifact,
  WorkflowNode,
  WorkflowRunLog,
  WorkflowStatus,
} from '../domain/workflow'
import {
  createWorkflowRunRecord,
  mapRunPlannerMode,
  mapWorkflowStatusToRunStatus,
  type WorkflowRunHistory,
  type WorkflowRunMode,
} from '../domain/runHistory'
import { appendRunRecord, loadRunHistory } from '../storage/runHistoryStorage'
import { deriveHudSnapshot } from '../domain/cognitiveHud'
import { buildRunTrace } from '../domain/runTrace'
import {
  duplicateWorkflowTemplate,
  loadWorkflowTemplate,
  type SavedWorkflowTemplate,
} from '../storage/localTemplates'
import {
  deleteWorkflowSnapshot,
  listWorkflowSnapshots,
  loadWorkflowSnapshot,
  saveWorkflowSnapshot,
  type SavedWorkflowSnapshot,
} from '../storage/localWorkflowHistory'
import {
  readCanvasModePreference,
  readReactFlowPositions,
  writeReactFlowPositions,
  writeCanvasModePreference,
  clearReactFlowPositions,
  type SavedCanvasMode,
} from '../storage/localCanvasState'
import {
  saveCurrentWorkflow,
  loadCurrentWorkflow,
} from '../storage/localWorkflowState'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../storage/localAppSettings'
import { scaleNodePosition, unscaleNodePosition } from '../domain/reactFlowAdapter'
import { createWorkflowState, workflowReducer } from '../state/workflowReducer'
import {
  selectSelectedNode,
  validateConnectionDraft,
  validateConnections,
  validateWorkflowImport,
} from '../state/workflowSelectors'
import { BottomMonitor } from './BottomMonitor'
import { type CanvasMode } from './TopBar'
import { CognitiveWorkspaceShell } from './workspace/CognitiveWorkspaceShell'
import { storageAdapter } from '../storage/storageAdapter'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function countPlannedConnections(workflow: Workflow, plannedNodes: WorkflowNode[]): number {
  const plannedIds = new Set(plannedNodes.map((node) => node.id))
  return workflow.connections.filter(
    (connection) =>
      plannedIds.has(connection.sourceNodeId) && plannedIds.has(connection.targetNodeId),
  ).length
}

function toCanvasMode(savedMode: SavedCanvasMode | null): CanvasMode {
  return savedMode === 'standard' ? 'standard' : 'reactFlow'
}

function toSavedCanvasMode(mode: CanvasMode): SavedCanvasMode {
  return mode === 'reactFlow' ? 'react-flow' : 'standard'
}

function createInitialWorkflow() {
  const savedPositions = readReactFlowPositions()
  const savedWorkflow = loadCurrentWorkflow()

  const base = savedWorkflow ?? createSampleWorkflow()

  return {
    ...base,
    nodes: base.nodes.map((node) =>
      savedPositions[node.id]
        ? { ...node, position: unscaleNodePosition(savedPositions[node.id]) }
        : node,
    ),
  }
}

function makeLog(
  runId: string,
  message: string,
  nodeId?: string,
  level: WorkflowRunLog['level'] = 'info',
): WorkflowRunLog {
  return {
    id: `${runId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    runId,
    timestamp: new Date().toISOString(),
    nodeId,
    level,
    message,
  }
}

function createStep(
  runId: string,
  node: WorkflowNode,
  route: ExecutionRouteKind,
  status: ExecutionStep['status'] = 'queued',
  retryOfStepId?: string,
): ExecutionStep {
  return {
    id: `${runId}-${node.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    runId,
    nodeId: node.id,
    nodeTitle: node.title,
    status,
    route,
    message:
      status === 'retry_ready'
        ? '再試行待ちです。'
        : status === 'review_required'
          ? '確認待ちです。'
          : undefined,
    retryOfStepId,
  }
}

function createRoute(
  kind: ExecutionRouteKind,
  fromNodeId: string,
  toNodeId: string | undefined,
  reason: string,
): ExecutionRoute {
  return {
    id: `${kind}-${fromNodeId}-${toNodeId ?? 'end'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    fromNodeId,
    toNodeId,
    reason,
    createdAt: new Date().toISOString(),
  }
}

function buildArtifactContent(options: {
  outcome: 'PASS' | 'REVIEW' | 'FAIL'
  executedNodes: WorkflowNode[]
  retryCandidates: number
  reviewPending: boolean
  failedNodeTitle?: string
  note?: string
}): WorkflowArtifact {
  const bottleneck = calculateBottleneck(options.executedNodes)

  return {
    title:
      options.outcome === 'FAIL'
        ? '実行失敗サマリー'
        : options.outcome === 'REVIEW'
          ? '確認待ちサマリー'
          : 'Bootstrap MVP 成果物',
    format: 'Markdown' as const,
    status:
      options.outcome === 'FAIL'
        ? 'failed'
        : options.outcome === 'REVIEW'
          ? 'review_required'
          : 'checked',
    content: [
      '# Agent Workflow Studio 実行サマリー',
      '',
      `- 判定: ${options.outcome}`,
      `- 実行ノード数: ${options.executedNodes.length}`,
      `- 確認待ち: ${options.reviewPending ? 'あり' : 'なし'}`,
      `- 再試行候補: ${options.retryCandidates} 件`,
      `- 失敗ノード: ${options.failedNodeTitle ?? 'なし'}`,
      `- ボトルネック: ${bottleneck?.title ?? 'なし'}`,
      ...(options.note ? [`- メモ: ${options.note}`] : []),
      '',
      'この結果はローカルモック実行によるものです。実APIは呼び出していません。',
    ].join('\n'),
  }
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.closest('[contenteditable="true"]') !== null
  )
}

export function AppShell() {
  const [state, dispatch] = useReducer(
    workflowReducer,
    createWorkflowState(createInitialWorkflow()),
  )
  const [templates, setTemplates] = useState<SavedWorkflowTemplate[]>(() =>
    storageAdapter.loadTemplates(),
  )
  const [appSettings, setAppSettings] = useState<AppSettings>(() => storageAdapter.loadSettings())
  const [snapshots, setSnapshots] = useState<SavedWorkflowSnapshot[]>(() =>
    listWorkflowSnapshots(),
  )
  const runTokenRef = useRef(0)
  const runCountRef = useRef(0)
  const pendingRunRef = useRef<{
    runId: string
    startedAt: string
    mode: WorkflowRunMode
    workflowSnapshot: Workflow
    plannedNodeCount: number
    plannedConnectionCount: number
  } | null>(null)
  const [runHistory, setRunHistory] = useState<WorkflowRunHistory>(() => loadRunHistory())
  const [connectorJobs, setConnectorJobs] = useState<ConnectorJob[]>([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null)
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(() =>
    toCanvasMode(readCanvasModePreference()),
  )
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null)
  const artifactVersionCountRef = useRef(0)
  const cancelledRebuildIdsRef = useRef<Set<string>>(new Set())
  const {
    workflow,
    executionGraph,
    selectedNodeId,
    isRunning,
    checkOutcome,
    importError,
    evaluation,
    humanReview,
    rebuildRequests,
    artifactVersions,
    selectedArtifactVersionId,
  } = state
  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  const selectedNode = useMemo(
    () => selectSelectedNode(workflow, selectedNodeId),
    [selectedNodeId, workflow],
  )
  const pendingDeleteNode = useMemo(
    () => workflow.nodes.find((node) => node.id === pendingDeleteNodeId),
    [pendingDeleteNodeId, workflow.nodes],
  )
  const pendingDeleteConnectionCount = useMemo(
    () =>
      pendingDeleteNodeId
        ? workflow.connections.filter(
            (connection) =>
              connection.sourceNodeId === pendingDeleteNodeId ||
              connection.targetNodeId === pendingDeleteNodeId,
          ).length
        : 0,
    [pendingDeleteNodeId, workflow.connections],
  )
  const connectionValidation = useMemo(() => validateConnections(workflow), [workflow])
  const hudSnapshot = useMemo(
    () =>
      deriveHudSnapshot({
        workflow,
        executionGraph,
        connectorJobs,
        runHistoryCount: runHistory.records.length,
      }),
    [workflow, executionGraph, connectorJobs, runHistory.records.length],
  )
  const runTrace = useMemo(
    () =>
      buildRunTrace({
        workflow,
        executionGraph,
        connectorJobs,
        runHistoryRecords: runHistory.records,
      }),
    [workflow, executionGraph, connectorJobs, runHistory.records],
  )

  useEffect(() => {
    const savedCanvasMode = toSavedCanvasMode(canvasMode)
    writeCanvasModePreference(savedCanvasMode)
    storageAdapter.saveSettings({ canvasMode: savedCanvasMode })
  }, [canvasMode])

  useEffect(() => {
    if (!isRunning) {
      saveCurrentWorkflow(workflow)
    }
  }, [workflow, isRunning])

  useEffect(() => {
    if (!state.completedRun) return
    const { runId, runStatus } = state.completedRun
    const pending = pendingRunRef.current
    if (pending && pending.runId === runId) {
      const runLogs = workflow.logs.filter((log) => log.runId === runId)
      const record = createWorkflowRunRecord({
        runId: pending.runId,
        source: pending.workflowSnapshot,
        mode: pending.mode,
        status: runStatus,
        startedAt: pending.startedAt,
        finishedAt: new Date().toISOString(),
        nodeCount: pending.plannedNodeCount,
        connectionCount: pending.plannedConnectionCount,
        logs: runLogs,
      })
      setRunHistory(appendRunRecord(record))
      // Keep pendingRunRef alive for review_required so the continuation
      // can replace this interim record with the final terminal-state record.
      if (runStatus !== 'review_required') {
        pendingRunRef.current = null
      }
    }
    dispatch({ type: 'clearCompletedRun' })
  }, [state.completedRun, workflow.logs])

  useEffect(() => {
    if (!importSuccessMessage) return
    const timer = window.setTimeout(() => setImportSuccessMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [importSuccessMessage])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (isEditableElement(event.target) || isRunning) {
          return
        }

        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        if (isEditableElement(event.target) || isRunning) {
          return
        }

        event.preventDefault()
        dispatch({ type: 'redo' })
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }

      if (isEditableElement(event.target)) {
        return
      }

      if (!selectedNodeId) {
        return
      }

      event.preventDefault()
      if (workflow.nodes.some((node) => node.id === selectedNodeId)) {
        setPendingDeleteNodeId(selectedNodeId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, workflow.nodes, dispatch, isRunning])

  function calculateOutcomeByRunCount(): 'PASS' | 'REVIEW' | 'FAIL' {
    const currentCount = runCountRef.current
    runCountRef.current += 1
    if (currentCount % 3 === 0) {
      return 'FAIL'
    }
    if (currentCount % 3 === 1) {
      return 'REVIEW'
    }
    return 'PASS'
  }

  function getStepDuration(node: WorkflowNode, attempt = 0): number {
    const base = Math.max(120, Math.round((node.metrics?.estimatedLatencyMs ?? 600) / 4))
    return base + attempt * 90
  }

  function buildMetrics(
    executedNodes: WorkflowNode[],
    outcome: 'PASS' | 'REVIEW' | 'FAIL',
    retryCount: number,
  ) {
    const bottleneck = calculateBottleneck(executedNodes)
    return {
      tokens: executedNodes.reduce(
        (total, node) => total + (node.metrics?.estimatedTokens ?? 0),
        0,
      ),
      cost: executedNodes.reduce(
        (total, node) => total + (node.metrics?.estimatedCost ?? 0),
        0,
      ),
      latencyMs: executedNodes.reduce(
        (total, node) => total + getStepDuration(node),
        0,
      ),
      successRate: SUCCESS_RATE_BY_OUTCOME[outcome] ?? SUCCESS_RATE_BY_OUTCOME.PASS,
      queueCount: Math.max(workflow.nodes.length - executedNodes.length, 0),
      retryCount,
      bottleneckNodeId: bottleneck?.id ?? null,
    }
  }

  async function executeNodeStep(options: {
    runId: string
    node: WorkflowNode
    route: ExecutionRouteKind
    attempt?: number
    retryOfStepId?: string
    result: 'success' | 'review_required' | 'failed' | 'skipped'
  }): Promise<ExecutionStep> {
    const durationMs = getStepDuration(options.node, options.attempt ?? 0)
    const step = createStep(
      options.runId,
      options.node,
      options.route,
      options.route === 'retry' ? 'retry_ready' : 'queued',
      options.retryOfStepId,
    )

    if (options.route === 'retry') {
      dispatch({ type: 'retryExecutionStep', step })
      dispatch({ type: 'runNodeRetryReady', nodeId: options.node.id })
    } else {
      dispatch({ type: 'runStepQueued', step })
      dispatch({ type: 'runNodeQueued', nodeId: options.node.id })
    }

    await delay(90)

    dispatch({
      type: 'runStepRunning',
      stepId: step.id,
      startedAt: new Date().toISOString(),
      message: `${options.node.title} を実行中です。`,
    })
    dispatch({
      type: 'runNodeRunning',
      nodeId: options.node.id,
      log: makeLog(options.runId, `${options.node.title} を開始しました。`, options.node.id),
    })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        options.runId,
        buildConnectorLogMessage(options.node),
        options.node.id,
        'info',
      ),
    })

    await delay(Math.min(durationMs, 260))

    if (options.result === 'skipped') {
      dispatch({
        type: 'runStepSuccess',
        stepId: step.id,
        finishedAt: new Date().toISOString(),
        durationMs,
        message: `${options.node.title} validated without local execution.`,
      })
      dispatch({
        type: 'runNodeSuccess',
        nodeId: options.node.id,
        status: 'skipped',
        log: makeLog(
          options.runId,
          `${options.node.title} was validated only and skipped.`,
          options.node.id,
          'info',
        ),
      })
      return step
    }

    if (options.result === 'failed') {
      dispatch({
        type: 'runStepFailed',
        stepId: step.id,
        finishedAt: new Date().toISOString(),
        durationMs,
        message: `${options.node.title} が失敗しました。`,
        error: 'ローカルモックでエラールートへ分岐しました。',
      })
      dispatch({
        type: 'runNodeFailed',
        nodeId: options.node.id,
        error: 'ローカルモックでエラールートへ分岐しました。',
        log: makeLog(
          options.runId,
          `${options.node.title} が失敗し、エラールートへ移動しました。`,
          options.node.id,
          'error',
        ),
      })
      return step
    }

    if (options.result === 'review_required') {
      dispatch({
        type: 'runStepReviewRequired',
        stepId: step.id,
        finishedAt: new Date().toISOString(),
        durationMs,
        message: `${options.node.title} が確認待ちになりました。`,
      })
      dispatch({
        type: 'runNodeSuccess',
        nodeId: options.node.id,
        status: 'review_required',
        log: makeLog(
          options.runId,
          `${options.node.title} は確認待ちです。`,
          options.node.id,
          'warn',
        ),
      })
      return step
    }

    dispatch({
      type: 'runStepSuccess',
      stepId: step.id,
      finishedAt: new Date().toISOString(),
      durationMs,
      message: `${options.node.title} が完了しました。`,
    })
    dispatch({
      type: 'runNodeSuccess',
      nodeId: options.node.id,
      log: makeLog(options.runId, `${options.node.title} が完了しました。`, options.node.id),
    })

    return step
  }

  async function continueMainSequence(options: {
    runId: string
    nodes: WorkflowNode[]
    startIndex: number
    reviewMode?: boolean
  }): Promise<WorkflowNode[]> {
    const executedNodes: WorkflowNode[] = []

    for (let index = options.startIndex; index < options.nodes.length; index += 1) {
      const node = options.nodes[index]

      if (index > 0) {
        const previousNode = options.nodes[index - 1]
        dispatch({
          type: 'addExecutionRoute',
          route: createRoute('main', previousNode.id, node.id, '通常実行フロー'),
        })
      }

      const step = await executeNodeStep({
        runId: options.runId,
        node,
        route: 'main',
        result: 'success',
      })

      executedNodes.push(node)

      if (node.type === 'check' && options.reviewMode) {
        dispatch({
          type: 'runStepReviewRequired',
          stepId: step.id,
          finishedAt: new Date().toISOString(),
          durationMs: getStepDuration(node),
          message: '確認待ちで停止しました。',
        })
        return executedNodes
      }
    }

    return executedNodes
  }

  async function runPlannedWorkflow(mode: RunMode) {
    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    const startedAt = new Date().toISOString()
    const runId = `run-${startedAt}`
    const plan = planWorkflowRun(workflow, mode, selectedNodeId)
    pendingRunRef.current = {
      runId,
      startedAt,
      mode: mapRunPlannerMode(mode),
      workflowSnapshot: workflow,
      plannedNodeCount: plan.nodes.length,
      plannedConnectionCount: countPlannedConnections(workflow, plan.nodes),
    }
    const plannedHasCheck = plan.nodes.some((node) => node.type === 'check')
    const outcome = mode === 'dryRun' || !plannedHasCheck ? 'PASS' : calculateOutcomeByRunCount()
    const executedNodes: WorkflowNode[] = []
    const decisions: ReturnType<typeof executeMockNode>[] = []

    // M13: build connector jobs for all planned nodes
    const initialJobs = buildConnectorJobs(runId, plan.nodes)
    const jobMap = new Map(initialJobs.map((j) => [j.nodeId, j]))
    setConnectorJobs([...jobMap.values()])

    dispatch({
      type: 'runWorkflowStart',
      runId,
      nodeIds: plan.nodes.map((node) => node.id),
      log: makeLog(
        runId,
        `Local mock run started. mode=${mode}. No real API calls are made.`,
      ),
    })
    dispatch({ type: 'setCheckOutcome', outcome })

    for (const warning of plan.warnings) {
      dispatch({ type: 'appendLog', log: makeLog(runId, warning, undefined, 'warn') })
    }

    for (let index = 0; index < plan.nodes.length; index += 1) {
      if (runTokenRef.current !== runToken) {
        return
      }

      const node = plan.nodes[index]
      const decision = executeMockNode(node, outcome, mode)
      decisions.push(decision)

      // M13: mark connector job as running
      const currentJob = jobMap.get(node.id)
      if (currentJob) {
        const runningJob: ConnectorJob = {
          ...currentJob,
          status: 'running',
          startedAt: new Date().toISOString(),
        }
        jobMap.set(node.id, runningJob)
        setConnectorJobs([...jobMap.values()])
      }

      if (index > 0) {
        const previousNode = plan.nodes[index - 1]
        dispatch({
          type: 'addExecutionRoute',
          route: createRoute('main', previousNode.id, node.id, '通常実行フロー'),
        })
      }

      if (decision.route !== 'main') {
        dispatch({
          type: 'addExecutionRoute',
          route: createRoute(
            decision.route,
            node.id,
            decision.route === 'review' ? plan.nodes[index + 1]?.id : undefined,
            decision.message,
          ),
        })
      }

      const step = await executeNodeStep({
        runId,
        node,
        route: decision.route,
        result: decision.result,
      })
      executedNodes.push(node)

      if (runTokenRef.current !== runToken) {
        return
      }

      // M13: update connector job status after execution
      const jobAfterExec = jobMap.get(node.id)
      if (jobAfterExec) {
        const finalJobStatus: ConnectorJob['status'] =
          decision.result === 'failed'
            ? 'failed'
            : decision.result === 'review_required'
              ? 'review_required'
              : decision.result === 'skipped'
                ? 'skipped'
                : 'success'
        const finalJob: ConnectorJob = {
          ...jobAfterExec,
          status: finalJobStatus,
          finishedAt: new Date().toISOString(),
          outputSummary: `${decision.message} (mock)`,
          error: decision.result === 'failed' ? 'ローカルモックでエラールートへ分岐しました。' : undefined,
        }
        jobMap.set(node.id, finalJob)
        setConnectorJobs([...jobMap.values()])
        dispatch({
          type: 'appendLog',
          log: makeLog(
            runId,
            `[job: …${finalJob.id.slice(-8)}] ${finalJob.connectorLabel} / ${finalJobStatus} — ${node.title}`,
            node.id,
            finalJobStatus === 'failed' ? 'error' : 'info',
          ),
        })
      }

      if (decision.retryCandidate) {
        dispatch({
          type: 'addExecutionRoute',
          route: createRoute(
            'retry',
            node.id,
            node.id,
            'Retry candidate after local mock failure.',
          ),
        })
        dispatch({ type: 'setRetryCandidate', stepId: step.id })
        dispatch({ type: 'runNodeRetryReady', nodeId: node.id })
      }

      if (decision.result === 'failed' || decision.result === 'review_required') {
        dispatch({
          type: 'setArtifact',
          artifact: buildRunArtifact({
            plan,
            outcome,
            executedNodes,
            decisions,
            failedNodeTitle: decision.result === 'failed' ? node.title : undefined,
          }),
        })
        dispatch({
          type: 'updateMetrics',
          metrics: buildRunMetrics(
            plan.nodes.length,
            executedNodes,
            outcome,
            decisions.filter((item) => item.retryCandidate).length,
          ),
        })
        if (runTokenRef.current !== runToken) return
        dispatch({
          type: 'runFinished',
          runId,
          workflowStatus: decision.result === 'failed' ? 'failed' : 'review_required',
          runStatus: decision.result === 'failed' ? 'failed' : 'review_required',
        })
        return
      }
    }

    dispatch({
      type: 'setArtifact',
      artifact: buildRunArtifact({ plan, outcome, executedNodes, decisions }),
    })
    dispatch({
      type: 'updateMetrics',
      metrics: buildRunMetrics(
        plan.nodes.length,
        executedNodes,
        outcome,
        decisions.filter((item) => item.retryCandidate).length,
      ),
    })
    dispatch({
      type: 'appendLog',
      log: makeLog(runId, 'Local run engine updated artifact and metrics.', undefined, 'metric'),
    })
    if (runTokenRef.current !== runToken) return
    dispatch({ type: 'runFinished', runId, workflowStatus: 'success', runStatus: 'success' })
  }

  async function runMockWorkflow(mode: RunMode = 'all') {
    await runPlannedWorkflow(mode)
  }

  function stopRun() {
    runTokenRef.current += 1
    const stopRunId = executionGraph?.runId ?? pendingRunRef.current?.runId ?? ''
    if (executionGraph) {
      dispatch({
        type: 'appendLog',
        log: makeLog(
          executionGraph.runId,
          'ユーザー操作でローカルモック実行を停止しました。',
          undefined,
          'warn',
        ),
      })
    }
    dispatch({ type: 'runFinished', runId: stopRunId, workflowStatus: 'paused', runStatus: 'cancelled' })
  }

  function handleReset() {
    runTokenRef.current += 1
    artifactVersionCountRef.current = 0
    dispatch({ type: 'resetWorkflow', workflow: createSampleWorkflow() })
  }

  function handleResetStorage() {
    storageAdapter.clearAll()
    runTokenRef.current += 1
    artifactVersionCountRef.current = 0
    pendingRunRef.current = null
    setRunHistory(loadRunHistory())
    // Reset in-memory UI state to defaults after clearing persisted storage
    setAppSettings(DEFAULT_APP_SETTINGS)
    setCanvasMode(toCanvasMode(null))
    dispatch({ type: 'resetWorkflow', workflow: createSampleWorkflow() })
  }

  function handleImportBundle(bundle: {
    workflow: Workflow
    templates: SavedWorkflowTemplate[]
    settings?: AppSettings
  }) {
    artifactVersionCountRef.current = 0
    dispatch({ type: 'importWorkflow', workflow: bundle.workflow })

    const isFullBundle = typeof bundle.settings !== 'undefined'

    if (isFullBundle) {
      setTemplates(storageAdapter.replaceTemplates(bundle.templates))
      storageAdapter.saveSettings(bundle.settings ?? {})
      if (bundle.settings) {
        writeCanvasModePreference(bundle.settings.canvasMode)
        setCanvasMode(toCanvasMode(bundle.settings.canvasMode))
        setAppSettings(bundle.settings)
      }
    } else if (bundle.templates.length > 0) {
      const currentTemplates = storageAdapter.loadTemplates()
      const mergedTemplates = [
        ...currentTemplates,
        ...bundle.templates.filter(
          (incoming) =>
            !currentTemplates.some((existing) => existing.id === incoming.id),
        ),
      ]
      setTemplates(storageAdapter.replaceTemplates(mergedTemplates))
    }

    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `import-bundle-${Date.now()}`,
        isFullBundle
          ? `フルバンドルを復元しました: ${bundle.workflow.name} (テンプレート ${bundle.templates.length} 件 / 設定あり)`
          : `ワークフローバンドルを読み込みました: ${bundle.workflow.name}${bundle.templates.length > 0 ? ` (テンプレート ${bundle.templates.length} 件を既存ライブラリへ追加)` : ''}`,
        undefined,
        'info',
      ),
    })
  }

  function handleSaveNode(
    nodeId: string,
    updates: {
      title: string
      description: string
      agentRole: AgentRole | undefined
      config: Record<string, unknown>
    },
  ) {
    dispatch({ type: 'updateNodeConfig', nodeId, updates })
  }

  function handleAddNode(part: WorkflowNode) {
    const node = createNodeFromPart(part, workflow.nodes, selectedNodeId)
    dispatch({ type: 'addNode', node })
  }

  function handleDeleteNode(nodeId: string) {
    const node = workflow.nodes.find((item) => item.id === nodeId)
    if (!node) {
      return
    }

    setPendingDeleteNodeId(nodeId)
  }

  function handleMoveNode(nodeId: string, position: WorkflowNode['position']) {
    dispatch({ type: 'updateNodePositions', positions: { [nodeId]: position } })
    writeReactFlowPositions({
      ...Object.fromEntries(
        workflow.nodes.map((node) => [node.id, scaleNodePosition(node.position)]),
      ),
      [nodeId]: scaleNodePosition(position),
    })
  }

  function confirmDeleteNode() {
    if (!pendingDeleteNodeId) {
      return
    }

    dispatch({ type: 'deleteNode', nodeId: pendingDeleteNodeId })
    setPendingDeleteNodeId(null)
  }

  function createConnectionFromDraft(draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) {
    const validation = validateConnectionDraft(workflow, {
      sourceNodeId: draft.sourceNodeId,
      sourcePortId: draft.sourcePortId,
      targetNodeId: draft.targetNodeId,
      targetPortId: draft.targetPortId,
      kind: draft.kind,
    })

    if (!validation.valid) {
      dispatch({
        type: 'appendLog',
        log: makeLog(
          executionGraph?.runId ?? `connection-${Date.now()}`,
          `接続を作成できませんでした: ${validation.reason}`,
          undefined,
          'warn',
        ),
      })
      return {
        ok: false as const,
        reason: validation.reason,
      }
    }

    const srcNode = workflow.nodes.find((n) => n.id === draft.sourceNodeId)
    const srcPort = srcNode ? findPort(getOutputPorts(srcNode), draft.sourcePortId) : undefined

    dispatch({
      type: 'createConnection',
      connection: {
        id: `edge-${Date.now()}`,
        sourceNodeId: draft.sourceNodeId,
        sourcePortId: draft.sourcePortId,
        targetNodeId: draft.targetNodeId,
        targetPortId: draft.targetPortId,
        kind: draft.kind,
        carries: srcPort ? [srcPort.dataType] : [],
        status: 'inactive',
      },
    })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `connection-${Date.now()}`,
        '接続を作成しました。',
        undefined,
        'info',
      ),
    })
    return {
      ok: true as const,
      reason: null,
    }
  }

  function handleCreateConnection(draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) {
    return createConnectionFromDraft(draft)
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch({ type: 'deleteConnection', connectionId })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `connection-${Date.now()}`,
        '接続を削除しました。',
        undefined,
        'warn',
      ),
    })
  }

  function handleSaveTemplate(input: {
    name: string
    description: string
    tags: string[]
    category?: string
  }) {
    const template = storageAdapter.saveTemplate({
      workflow,
      name: input.name,
      description: input.description,
      tags: input.tags,
      category: input.category,
      lastEvaluationStatus: evaluation?.status,
      lastEvaluationScore: evaluation?.totalScore,
      artifactVersionCount: artifactVersions.length,
      createdFromRunId: executionGraph?.runId,
    })
    setTemplates(storageAdapter.loadTemplates())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `template-${Date.now()}`,
        `テンプレートを保存しました: ${template.name}`,
        undefined,
        'info',
      ),
    })
    return template
  }

  function handleLoadTemplate(id: string) {
    const selectedTemplate = templates.find((template) => template.id === id)
    const loaded = loadWorkflowTemplate(id)
    if (!loaded) {
      return
    }

    const importedWorkflow = JSON.parse(JSON.stringify(loaded)) as typeof loaded
    importedWorkflow.name = `${selectedTemplate?.name ?? importedWorkflow.name} workflow`
    importedWorkflow.logs = [
      ...importedWorkflow.logs,
      makeLog(
        executionGraph?.runId ?? `template-load-${Date.now()}`,
        `テンプレートを読み込みました: ${selectedTemplate?.name ?? importedWorkflow.name}`,
        undefined,
        'info',
      ),
    ]
    importedWorkflow.updatedAt = new Date().toISOString()

    artifactVersionCountRef.current = 0
    dispatch({ type: 'importWorkflow', workflow: importedWorkflow })
  }

  function handleDuplicateTemplate(id: string) {
    const duplicated = duplicateWorkflowTemplate(id)
    if (!duplicated) {
      return null
    }

    setTemplates(storageAdapter.loadTemplates())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `template-duplicate-${Date.now()}`,
        `テンプレートを複製しました: ${duplicated.name}`,
        undefined,
        'info',
      ),
    })

    return duplicated
  }

  function handleDeleteTemplate(id: string) {
    setTemplates(storageAdapter.deleteTemplate(id))
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `template-delete-${Date.now()}`,
        'テンプレートを削除しました。',
        undefined,
        'warn',
      ),
    })
  }

  function handleChangeActiveTab(activeTab: string) {
    storageAdapter.saveSettings({ activeTab })
    setAppSettings((current) =>
      current.activeTab === activeTab ? current : { ...current, activeTab },
    )
  }

  function handleChangeCanvasMode(nextMode: CanvasMode) {
    const savedCanvasMode = toSavedCanvasMode(nextMode)
    setCanvasMode(nextMode)
    setAppSettings((current) =>
      current.canvasMode === savedCanvasMode
        ? current
        : { ...current, canvasMode: savedCanvasMode },
    )
  }

  function handleSaveSnapshot() {
    const snapshot = saveWorkflowSnapshot(workflow)
    setSnapshots(listWorkflowSnapshots())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `snapshot-${Date.now()}`,
        `スナップショットを保存しました: ${snapshot.name}`,
        undefined,
        'info',
      ),
    })
  }

  function handleLoadSnapshot(id: string) {
    const loaded = loadWorkflowSnapshot(id)
    if (!loaded) {
      return
    }
    artifactVersionCountRef.current = 0
    dispatch({ type: 'importWorkflow', workflow: loaded })
  }

  function handleDeleteSnapshot(id: string) {
    setSnapshots(deleteWorkflowSnapshot(id))
  }

  function handleResetReactFlowPositions() {
    clearReactFlowPositions()
    const defaultPositions = Object.fromEntries(
      workflow.nodes.map((node) => [node.id, node.position]),
    )

    dispatch({ type: 'updateNodePositions', positions: defaultPositions })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `canvas-${Date.now()}`,
        'React Flow Canvas のノード位置を初期配置に戻しました。',
      ),
    })
  }

  async function handleApproveReviewStep(stepId: string) {
    if (!executionGraph) {
      return
    }
    const reviewStep = executionGraph.steps.find((step) => step.id === stepId)
    if (!reviewStep) {
      return
    }

    const nodeIndex = workflow.nodes.findIndex((node) => node.id === reviewStep.nodeId)
    dispatch({ type: 'approveReviewStep', stepId })
    dispatch({
      type: 'runNodeSuccess',
      nodeId: reviewStep.nodeId,
      status: 'success',
      log: makeLog(
        executionGraph.runId,
        `${reviewStep.nodeTitle} を承認して続行しました。`,
        reviewStep.nodeId,
        'approval',
      ),
    })
    dispatch({
      type: 'addExecutionRoute',
      route: createRoute(
        'review',
        reviewStep.nodeId,
        workflow.nodes[nodeIndex + 1]?.id,
        '人間承認で続行',
      ),
    })
    dispatch({ type: 'setCheckOutcome', outcome: 'PASS' })
    dispatch({ type: 'setRunning', isRunning: true })
    dispatch({ type: 'setWorkflowStatus', status: 'running' })

    const remainingNodes = await continueMainSequence({
      runId: executionGraph.runId,
      nodes: workflow.nodes,
      startIndex: nodeIndex + 1,
      reviewMode: true,
    })
    const executedNodes = workflow.nodes.slice(0, nodeIndex + 1).concat(remainingNodes)
    const isCompleted = executedNodes.length === workflow.nodes.length

    dispatch({
      type: 'setArtifact',
      artifact: buildArtifactContent({
        outcome: 'PASS',
        executedNodes,
        retryCandidates: executionGraph.retryCandidates.filter((candidate) => candidate !== stepId)
          .length,
        reviewPending: !isCompleted,
        note: isCompleted
          ? '確認後に残りのノードを続行しました。'
          : '次の確認待ちで一時停止しました。',
      }),
    })
    dispatch({
      type: 'updateMetrics',
      metrics: buildMetrics(executedNodes, 'PASS', workflow.metrics.retryCount),
    })
    const continuationStatus = isCompleted ? 'success' : 'review_required'
    dispatch({
      type: 'runFinished',
      runId: executionGraph.runId,
      workflowStatus: continuationStatus,
      runStatus: mapWorkflowStatusToRunStatus(continuationStatus),
    })
  }

  function handleReturnReviewStep(stepId: string) {
    if (!executionGraph) {
      return
    }
    const reviewStep = executionGraph.steps.find((step) => step.id === stepId)
    if (!reviewStep) {
      return
    }

    dispatch({ type: 'returnReviewStep', stepId })
    dispatch({
      type: 'runNodeFailed',
      nodeId: reviewStep.nodeId,
      error: '人間確認で差し戻されました。',
      log: makeLog(
        executionGraph.runId,
        `${reviewStep.nodeTitle} を差し戻しました。再試行候補に追加します。`,
        reviewStep.nodeId,
        'warn',
      ),
    })
    dispatch({
      type: 'addExecutionRoute',
      route: createRoute('error', reviewStep.nodeId, undefined, '差し戻し'),
    })
    dispatch({
      type: 'addExecutionRoute',
      route: createRoute('retry', reviewStep.nodeId, reviewStep.nodeId, '差し戻し後の再試行候補'),
    })
    dispatch({ type: 'setCheckOutcome', outcome: 'FAIL' })
    dispatch({
      type: 'setArtifact',
      artifact: buildArtifactContent({
        outcome: 'FAIL',
        executedNodes: workflow.nodes.filter((node) =>
          executionGraph.steps.some((step) => step.nodeId === node.id),
        ),
        retryCandidates: executionGraph.retryCandidates.length + 1,
        reviewPending: false,
        failedNodeTitle: reviewStep.nodeTitle,
        note: '差し戻しにより再試行候補へ追加しました。',
      }),
    })
    // runNodeFailed sets isRunning:false; also fire runFinished so the
    // pending run record is finalized as failed (replaces interim review_required record).
    dispatch({
      type: 'runFinished',
      runId: executionGraph.runId,
      workflowStatus: 'failed',
      runStatus: 'failed',
    })
  }

  function handleSkipReviewStep(stepId: string) {
    if (!executionGraph) {
      return
    }
    const reviewStep = executionGraph.steps.find((step) => step.id === stepId)
    if (!reviewStep) {
      return
    }

    dispatch({
      type: 'skipReviewStep',
      step: {
        ...createStep(executionGraph.runId, workflow.nodes.find((node) => node.id === reviewStep.nodeId) ?? workflow.nodes[0], 'skip', 'skipped'),
        message: '人間確認でスキップしました。',
      },
    })
    dispatch({
      type: 'runNodeSuccess',
      nodeId: reviewStep.nodeId,
      status: 'skipped',
      log: makeLog(
        executionGraph.runId,
        `${reviewStep.nodeTitle} をスキップしました。`,
        reviewStep.nodeId,
        'warn',
      ),
    })
    dispatch({
      type: 'addExecutionRoute',
      route: createRoute('skip', reviewStep.nodeId, undefined, '人間確認でスキップ'),
    })
    dispatch({
      type: 'runFinished',
      runId: executionGraph.runId,
      workflowStatus: 'paused',
      runStatus: 'cancelled',
    })
  }

  async function handleRetryExecutionStep(stepId: string) {
    if (!executionGraph) {
      return
    }
    const originalStep = executionGraph.steps.find((step) => step.id === stepId)
    const targetNode = workflow.nodes.find((node) => node.id === originalStep?.nodeId)
    if (!originalStep || !targetNode) {
      return
    }

    dispatch({
      type: 'addExecutionRoute',
      route: createRoute('retry', targetNode.id, targetNode.id, '再試行を開始'),
    })

    const retryStep = await executeNodeStep({
      runId: executionGraph.runId,
      node: targetNode,
      route: 'retry',
      attempt: 1,
      retryOfStepId: originalStep.id,
      result: 'success',
    })

    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph.runId,
        `${targetNode.title} を再試行し、成功しました。`,
        targetNode.id,
        'info',
      ),
    })
    dispatch({ type: 'setCheckOutcome', outcome: 'PASS' })
    dispatch({ type: 'setWorkflowStatus', status: 'success' })
    dispatch({
      type: 'updateMetrics',
      metrics: {
        ...workflow.metrics,
        tokens: workflow.metrics.tokens + (targetNode.metrics?.estimatedTokens ?? 0),
        cost: Number(
          (workflow.metrics.cost + (targetNode.metrics?.estimatedCost ?? 0)).toFixed(3),
        ),
        latencyMs: workflow.metrics.latencyMs + getStepDuration(targetNode, 1),
        retryCount: workflow.metrics.retryCount + 1,
        successRate: 100,
        bottleneckNodeId:
          calculateBottleneck([...workflow.nodes.filter((node) => node.status === 'success'), targetNode])
            ?.id ?? workflow.metrics.bottleneckNodeId,
      },
    })
    dispatch({
      type: 'setArtifact',
      artifact: buildArtifactContent({
        outcome: 'PASS',
        executedNodes: workflow.nodes.filter((node) => node.status === 'success').concat(targetNode),
        retryCandidates: executionGraph.retryCandidates.filter((candidate) => candidate !== retryStep.retryOfStepId).length,
        reviewPending: false,
        note: `${targetNode.title} の再試行に成功しました。`,
      }),
    })
  }

  function handleRetryConnectorJob(jobId: string) {
    const job = connectorJobs.find((j) => j.id === jobId)
    if (!job) return
    const updated = retryConnectorJob(job)
    if (!updated) return
    setConnectorJobs(connectorJobs.map((j) => (j.id === jobId ? updated : j)))
    const runId = executionGraph?.runId ?? `retry-${Date.now()}`
    dispatch({
      type: 'runNodeSuccess',
      nodeId: job.nodeId,
      log: makeLog(
        runId,
        `[job: …${jobId.slice(-8)}] ${job.connectorLabel} — 再試行 ${updated.retryCount} 回目で成功しました。(mock)`,
        job.nodeId,
        'info',
      ),
    })
    dispatch({
      type: 'updateMetrics',
      metrics: { ...workflow.metrics, retryCount: workflow.metrics.retryCount + 1 },
    })
  }

  function handleMarkConnectorJobReviewed(jobId: string) {
    const job = connectorJobs.find((j) => j.id === jobId)
    if (!job) return
    const updated = markJobReviewed(job)
    setConnectorJobs(connectorJobs.map((j) => (j.id === jobId ? updated : j)))
    dispatch({
      type: 'runNodeSuccess',
      nodeId: job.nodeId,
      log: makeLog(
        executionGraph?.runId ?? `review-${Date.now()}`,
        `[job: …${jobId.slice(-8)}] ${job.connectorLabel} — 確認済みにしました。(mock)`,
        job.nodeId,
        'approval',
      ),
    })
  }

  function handleSkipConnectorJob(jobId: string) {
    const job = connectorJobs.find((j) => j.id === jobId)
    if (!job) return
    const updated = skipConnectorJob(job)
    setConnectorJobs(connectorJobs.map((j) => (j.id === jobId ? updated : j)))
    dispatch({
      type: 'runNodeSuccess',
      nodeId: job.nodeId,
      status: 'skipped',
      log: makeLog(
        executionGraph?.runId ?? `skip-${Date.now()}`,
        `[job: …${jobId.slice(-8)}] ${job.connectorLabel} — スキップしました。`,
        job.nodeId,
        'warn',
      ),
    })
  }

  function handleCancelConnectorJob(jobId: string) {
    const job = connectorJobs.find((j) => j.id === jobId)
    if (!job) return
    const updated = cancelConnectorJob(job)
    if (!updated) return
    setConnectorJobs(connectorJobs.map((j) => (j.id === jobId ? updated : j)))
    dispatch({
      type: 'runNodeSuccess',
      nodeId: job.nodeId,
      status: 'skipped',
      log: makeLog(
        executionGraph?.runId ?? `cancel-${Date.now()}`,
        `[job: …${jobId.slice(-8)}] ${job.connectorLabel} — キャンセルしました。`,
        job.nodeId,
        'warn',
      ),
    })
  }

  async function handleEvaluate() {
    if (!executionGraph || isEvaluating) {
      return
    }
    const snapshotRunToken = runTokenRef.current
    const snapshotRunId = executionGraph.runId
    const snapshotWorkflow = workflow
    setIsEvaluating(true)
    dispatch({ type: 'startEvaluation' })
    await delay(800)
    if (runTokenRef.current !== snapshotRunToken) {
      setIsEvaluating(false)
      return
    }
    const result = runLocalEvaluation(snapshotWorkflow, executionGraph, snapshotRunId)
    dispatch({ type: 'setEvaluationResult', result })

    artifactVersionCountRef.current += 1
    const version: ArtifactVersion = {
      id: `av-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      version: artifactVersionCountRef.current,
      sourceRunId: snapshotRunId,
      content: snapshotWorkflow.artifact.content,
      createdAt: new Date().toISOString(),
      evaluationId: result.id,
    }
    dispatch({ type: 'addArtifactVersion', version })
    setIsEvaluating(false)
  }

  function handleHumanReviewDecide(decision: ReviewDecision, note: string) {
    dispatch({
      type: 'setHumanReviewDecision',
      decision,
      reviewer: 'ローカルユーザー',
      note: note || undefined,
    })
  }

  function handleRequestRebuild(reason: string, instruction: string) {
    const requestId = `rebuild-${Date.now()}-${Math.random().toString(16).slice(2)}`
    dispatch({
      type: 'requestRebuild',
      request: {
        id: requestId,
        sourceArtifactId: evaluation?.artifactId,
        reason,
        instruction,
        createdAt: new Date().toISOString(),
        status: 'pending',
      },
    })
  }

  async function handleStartRebuild(requestId: string) {
    cancelledRebuildIdsRef.current.delete(requestId)
    dispatch({ type: 'startRebuild', requestId })
    const snapshotRunId = executionGraph?.runId ?? `rebuild-${requestId}`
    const snapshotContent = workflow.artifact.content
    await delay(800)
    if (cancelledRebuildIdsRef.current.has(requestId)) {
      cancelledRebuildIdsRef.current.delete(requestId)
      return
    }
    dispatch({ type: 'completeRebuild', requestId })

    artifactVersionCountRef.current += 1
    const version: ArtifactVersion = {
      id: `av-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      version: artifactVersionCountRef.current,
      sourceRunId: snapshotRunId,
      content: `${snapshotContent}\n\n---\n再作成バージョン v${artifactVersionCountRef.current} (${new Date().toLocaleString('ja-JP')})`,
      createdAt: new Date().toISOString(),
      rebuildRequestId: requestId,
    }
    dispatch({ type: 'addArtifactVersion', version })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        snapshotRunId,
        `再作成が完了し、バージョン v${version.version} を保存しました。`,
        undefined,
        'info',
      ),
    })
  }

  function handleCancelRebuild(requestId: string) {
    cancelledRebuildIdsRef.current.add(requestId)
    dispatch({ type: 'cancelRebuild', requestId })
  }

  function handleSelectArtifactVersion(versionId: string) {
    dispatch({ type: 'selectArtifactVersion', versionId })
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const date = new Date().toLocaleDateString('sv-SE')
    anchor.download = `${workflow.id || 'workflow'}_${date}.json`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  async function importJson(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = validateWorkflowImport(parsed)

      if (!result.valid || !result.workflow) {
        dispatch({
          type: 'setImportError',
          message: result.error ?? '読み込んだワークフローが不正です。',
        })
        dispatch({
          type: 'appendLog',
          log: makeLog(
            executionGraph?.runId ?? `import-${Date.now()}`,
            `JSON読込を中止しました: ${result.error ?? '不正なワークフローです。'}`,
            undefined,
            'warn',
          ),
        })
        return
      }

      artifactVersionCountRef.current = 0
      dispatch({ type: 'importWorkflow', workflow: result.workflow })
      dispatch({ type: 'setImportError', message: null })
      setImportSuccessMessage(`「${result.workflow.name}」を読み込みました。`)
    } catch (error) {
      dispatch({
        type: 'setImportError',
        message: error instanceof Error ? error.message : 'JSONの読込に失敗しました。',
      })
    }
  }

  const flashSlot = (
    <>
      {importError ? <div className="import-error">{importError}</div> : null}
      {!importError && importSuccessMessage ? (
        <div className="import-success">{importSuccessMessage}</div>
      ) : null}
    </>
  )

  const confirmSlot = pendingDeleteNode ? (
    <section className="confirm-panel" aria-label="Node delete confirmation">
      <div>
        <strong>Delete node "{pendingDeleteNode.title}"?</strong>
        <p>
          {pendingDeleteConnectionCount} related connection(s) will also be deleted.
        </p>
      </div>
      <div className="confirm-actions">
        <button type="button" className="primary-button danger-action" onClick={confirmDeleteNode}>
          Delete node
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setPendingDeleteNodeId(null)}
        >
          Cancel
        </button>
      </div>
    </section>
  ) : null

  const detailDrawerSlot = (
    <BottomMonitor
      workflow={workflow}
      executionGraph={executionGraph}
      connectorJobs={connectorJobs}
      onRetryConnectorJob={handleRetryConnectorJob}
      onMarkConnectorJobReviewed={handleMarkConnectorJobReviewed}
      onSkipConnectorJob={handleSkipConnectorJob}
      onCancelConnectorJob={handleCancelConnectorJob}
      templates={templates}
      snapshots={snapshots}
      onSaveTemplate={handleSaveTemplate}
      onLoadTemplate={handleLoadTemplate}
      onDuplicateTemplate={handleDuplicateTemplate}
      onDeleteTemplate={handleDeleteTemplate}
      onSaveSnapshot={handleSaveSnapshot}
      onLoadSnapshot={handleLoadSnapshot}
      onDeleteSnapshot={handleDeleteSnapshot}
      onRetryExecutionStep={handleRetryExecutionStep}
      onApproveReviewStep={handleApproveReviewStep}
      onReturnReviewStep={handleReturnReviewStep}
      onSkipReviewStep={handleSkipReviewStep}
      evaluation={evaluation}
      humanReview={humanReview}
      rebuildRequests={rebuildRequests}
      artifactVersions={artifactVersions}
      selectedArtifactVersionId={selectedArtifactVersionId}
      canEvaluate={!!executionGraph && !isRunning}
      isEvaluating={isEvaluating}
      onEvaluate={handleEvaluate}
      onHumanReviewDecide={handleHumanReviewDecide}
      onRequestRebuild={handleRequestRebuild}
      onStartRebuild={handleStartRebuild}
      onCancelRebuild={handleCancelRebuild}
      onSelectArtifactVersion={handleSelectArtifactVersion}
      onResetStorage={handleResetStorage}
      runHistoryCount={runHistory.records.length}
      runHistoryRecords={runHistory.records}
      hudSnapshot={hudSnapshot}
      runTrace={runTrace}
      settings={{
        ...appSettings,
        canvasMode: toSavedCanvasMode(canvasMode),
      }}
      onChangeActiveTab={handleChangeActiveTab}
      onImportBundle={handleImportBundle}
    />
  )

  return (
    <CognitiveWorkspaceShell
      workflow={workflow}
      workflowStatus={workflow.status as WorkflowStatus}
      isRunning={isRunning}
      canvasMode={canvasMode}
      canUndo={canUndo}
      canRedo={canRedo}
      selectedNodeId={selectedNodeId}
      selectedNode={selectedNode}
      nodes={workflow.nodes}
      connections={workflow.connections}
      connectionValidation={connectionValidation}
      executionGraph={executionGraph}
      connectorJobs={connectorJobs}
      evaluation={evaluation}
      humanReview={humanReview}
      hudSnapshot={hudSnapshot}
      runHistoryRecords={runHistory.records}
      runHistoryCount={runHistory.records.length}
      checkOutcome={checkOutcome}
      onRun={() => runMockWorkflow()}
      onRunSelected={() => runMockWorkflow('selected')}
      onRunFromSelected={() => runMockWorkflow('fromSelected')}
      onDryRun={() => runMockWorkflow('dryRun')}
      onStop={stopRun}
      onReset={handleReset}
      onUndo={() => dispatch({ type: 'undo' })}
      onRedo={() => dispatch({ type: 'redo' })}
      onExportJson={exportJson}
      onImportJson={importJson}
      onChangeCanvasMode={handleChangeCanvasMode}
      onSelectNode={(nodeId) => dispatch({ type: 'selectNode', nodeId })}
      onAddNode={handleAddNode}
      onSaveNode={handleSaveNode}
      onCreateConnection={handleCreateConnection}
      onCreateConnectionDraft={createConnectionFromDraft}
      onDeleteConnection={handleDeleteConnection}
      onDeleteNode={handleDeleteNode}
      onMoveNode={handleMoveNode}
      onResetReactFlowPositions={handleResetReactFlowPositions}
      onHumanReviewDecide={handleHumanReviewDecide}
      onRequestRebuild={handleRequestRebuild}
      detailDrawerSlot={detailDrawerSlot}
      flashSlot={flashSlot}
      confirmSlot={confirmSlot}
    />
  )
}
