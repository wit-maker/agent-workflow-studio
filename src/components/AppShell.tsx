import { useMemo, useReducer, useRef, useState } from 'react'
import { calculateBottleneck } from '../domain/connectionRules'
import type { ArtifactVersion, ReviewDecision } from '../domain/evaluation'
import { runLocalEvaluation } from '../domain/evaluationRules'
import type {
  ExecutionRoute,
  ExecutionRouteKind,
  ExecutionStep,
} from '../domain/executionGraph'
import { createSampleWorkflow } from '../domain/sampleWorkflow'
import type {
  AgentRole,
  ConnectionKind,
  WorkflowArtifact,
  WorkflowDataType,
  WorkflowNode,
  WorkflowRunLog,
  WorkflowStatus,
} from '../domain/workflow'
import {
  deleteWorkflowTemplate,
  listWorkflowTemplates,
  loadWorkflowTemplate,
  saveWorkflowTemplate,
  type SavedWorkflowTemplate,
} from '../storage/localTemplates'
import {
  deleteWorkflowSnapshot,
  listWorkflowSnapshots,
  loadWorkflowSnapshot,
  saveWorkflowSnapshot,
  type SavedWorkflowSnapshot,
} from '../storage/localWorkflowHistory'
import { createWorkflowState, workflowReducer } from '../state/workflowReducer'
import {
  selectSelectedNode,
  validateConnectionDraft,
  validateConnections,
  validateWorkflowImport,
} from '../state/workflowSelectors'
import { BottomMonitor } from './BottomMonitor'
import { Inspector } from './Inspector'
import { PartsPalette } from './PartsPalette'
import { StagePreview } from './StagePreview'
import { TopBar } from './TopBar'
import { WorkflowCanvas } from './WorkflowCanvas'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

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

export function AppShell() {
  const [state, dispatch] = useReducer(
    workflowReducer,
    createWorkflowState(createSampleWorkflow()),
  )
  const [templates, setTemplates] = useState<SavedWorkflowTemplate[]>(() =>
    listWorkflowTemplates(),
  )
  const [snapshots, setSnapshots] = useState<SavedWorkflowSnapshot[]>(() =>
    listWorkflowSnapshots(),
  )
  const runTokenRef = useRef(0)
  const runCountRef = useRef(0)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const artifactVersionCountRef = useRef(0)
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

  const selectedNode = useMemo(
    () => selectSelectedNode(workflow, selectedNodeId),
    [selectedNodeId, workflow],
  )
  const connectionValidation = useMemo(() => validateConnections(workflow), [workflow])

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
      successRate: outcome === 'FAIL' ? 54 : outcome === 'REVIEW' ? 78 : 100,
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
    result: 'success' | 'review_required' | 'failed'
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

    await delay(Math.min(durationMs, 260))

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

  async function runMockWorkflow() {
    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    const runId = `run-${new Date().toISOString()}`
    const outcome = calculateOutcomeByRunCount()
    const executedNodes: WorkflowNode[] = []

    dispatch({
      type: 'runWorkflowStart',
      runId,
      log: makeLog(runId, 'ローカルモック実行を開始しました。外部APIは呼び出しません。'),
    })
    dispatch({ type: 'setCheckOutcome', outcome })

    for (let index = 0; index < workflow.nodes.length; index += 1) {
      if (runTokenRef.current !== runToken) {
        return
      }

      const node = workflow.nodes[index]

      if (index > 0) {
        const previousNode = workflow.nodes[index - 1]
        dispatch({
          type: 'addExecutionRoute',
          route: createRoute('main', previousNode.id, node.id, '通常実行フロー'),
        })
      }

      if (node.type === 'check') {
        if (outcome === 'FAIL') {
          const failedStep = await executeNodeStep({
            runId,
            node,
            route: 'error',
            result: 'failed',
          })
          executedNodes.push(node)
          dispatch({
            type: 'addExecutionRoute',
            route: createRoute('error', node.id, undefined, '検査で失敗したため停止'),
          })
          dispatch({ type: 'setRetryCandidate', stepId: failedStep.id })
          dispatch({ type: 'runNodeRetryReady', nodeId: node.id })
          dispatch({
            type: 'setArtifact',
            artifact: buildArtifactContent({
              outcome,
              executedNodes,
              retryCandidates: 1,
              reviewPending: false,
              failedNodeTitle: node.title,
              note: '再試行ボタンから単体再試行できます。',
            }),
          })
          dispatch({
            type: 'updateMetrics',
            metrics: buildMetrics(executedNodes, outcome, 1),
          })
          dispatch({ type: 'setRunning', isRunning: false })
          return
        }

        if (outcome === 'REVIEW') {
          const reviewStep = await executeNodeStep({
            runId,
            node,
            route: 'review',
            result: 'review_required',
          })
          executedNodes.push(node)
          dispatch({
            type: 'addExecutionRoute',
            route: createRoute('review', node.id, workflow.nodes[index + 1]?.id, '人間確認待ち'),
          })
          dispatch({
            type: 'setArtifact',
            artifact: buildArtifactContent({
              outcome,
              executedNodes,
              retryCandidates: 0,
              reviewPending: true,
              note: `確認対象: ${reviewStep.nodeTitle}`,
            }),
          })
          dispatch({
            type: 'updateMetrics',
            metrics: buildMetrics(executedNodes, outcome, 0),
          })
          dispatch({ type: 'setRunning', isRunning: false })
          return
        }
      }

      await executeNodeStep({
        runId,
        node,
        route: 'main',
        result: 'success',
      })
      executedNodes.push(node)
    }

    dispatch({
      type: 'setArtifact',
      artifact: buildArtifactContent({
        outcome,
        executedNodes,
        retryCandidates: 0,
        reviewPending: false,
      }),
    })
    dispatch({
      type: 'updateMetrics',
      metrics: buildMetrics(executedNodes, outcome, 0),
    })
    dispatch({ type: 'setWorkflowStatus', status: 'success' })
    dispatch({
      type: 'appendLog',
      log: makeLog(runId, '実行グラフとメトリクスを更新しました。', undefined, 'metric'),
    })
    dispatch({ type: 'setRunning', isRunning: false })
  }

  function stopRun() {
    runTokenRef.current += 1
    dispatch({ type: 'setRunning', isRunning: false })
    dispatch({ type: 'setWorkflowStatus', status: 'paused' })
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
  }

  function handleReset() {
    runTokenRef.current += 1
    dispatch({ type: 'resetWorkflow', workflow: createSampleWorkflow() })
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

  function handleCreateConnection(draft: {
    sourceNodeId: string
    sourcePort: string
    targetNodeId: string
    targetPort: string
    kind: ConnectionKind
  }) {
    const validation = validateConnectionDraft(workflow, {
      sourceNodeId: draft.sourceNodeId,
      sourcePort: draft.sourcePort as WorkflowDataType,
      targetNodeId: draft.targetNodeId,
      targetPort: draft.targetPort as WorkflowDataType,
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
      return
    }

    dispatch({
      type: 'createConnection',
      connection: {
        id: `edge-${Date.now()}`,
        sourceNodeId: draft.sourceNodeId,
        sourcePort: draft.sourcePort,
        targetNodeId: draft.targetNodeId,
        targetPort: draft.targetPort,
        kind: draft.kind,
        carries: [draft.sourcePort as WorkflowDataType],
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

  function handleSaveTemplate() {
    const template = saveWorkflowTemplate(workflow)
    setTemplates(listWorkflowTemplates())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `template-${Date.now()}`,
        `テンプレートを保存しました: ${template.name}`,
        undefined,
        'info',
      ),
    })
  }

  function handleLoadTemplate(id: string) {
    const loaded = loadWorkflowTemplate(id)
    if (!loaded) {
      return
    }
    dispatch({ type: 'importWorkflow', workflow: loaded })
  }

  function handleDeleteTemplate(id: string) {
    setTemplates(deleteWorkflowTemplate(id))
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
    dispatch({ type: 'importWorkflow', workflow: loaded })
  }

  function handleDeleteSnapshot(id: string) {
    setSnapshots(deleteWorkflowSnapshot(id))
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
    dispatch({
      type: 'setWorkflowStatus',
      status: isCompleted ? 'success' : 'review_required',
    })
    dispatch({ type: 'setRunning', isRunning: false })
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
    dispatch({ type: 'setWorkflowStatus', status: 'paused' })
    dispatch({ type: 'setRunning', isRunning: false })
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

  async function handleEvaluate() {
    if (!executionGraph || isEvaluating) {
      return
    }
    setIsEvaluating(true)
    dispatch({ type: 'startEvaluation' })
    await delay(800)
    const result = runLocalEvaluation(workflow, executionGraph, executionGraph.runId)
    dispatch({ type: 'setEvaluationResult', result })

    artifactVersionCountRef.current += 1
    const version: ArtifactVersion = {
      id: `av-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      version: artifactVersionCountRef.current,
      sourceRunId: executionGraph.runId,
      content: workflow.artifact.content,
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
    dispatch({ type: 'startRebuild', requestId })
    await delay(800)
    dispatch({ type: 'completeRebuild', requestId })

    artifactVersionCountRef.current += 1
    const version: ArtifactVersion = {
      id: `av-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      version: artifactVersionCountRef.current,
      sourceRunId: executionGraph?.runId ?? `rebuild-${requestId}`,
      content: `${workflow.artifact.content}\n\n---\n再作成バージョン v${artifactVersionCountRef.current} (${new Date().toLocaleString('ja-JP')})`,
      createdAt: new Date().toISOString(),
      rebuildRequestId: requestId,
    }
    dispatch({ type: 'addArtifactVersion', version })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        executionGraph?.runId ?? `rebuild-${requestId}`,
        `再作成が完了し、バージョン v${version.version} を保存しました。`,
        undefined,
        'info',
      ),
    })
  }

  function handleCancelRebuild(requestId: string) {
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
    anchor.download = `${workflow.id || 'workflow'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
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

      dispatch({ type: 'importWorkflow', workflow: result.workflow })
    } catch (error) {
      dispatch({
        type: 'setImportError',
        message: error instanceof Error ? error.message : 'JSONの読込に失敗しました。',
      })
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        workflowName={workflow.name}
        status={workflow.status as WorkflowStatus}
        isRunning={isRunning}
        onRun={runMockWorkflow}
        onStop={stopRun}
        onReset={handleReset}
        onExportJson={exportJson}
        onImportJson={importJson}
      />
      {importError ? <div className="import-error">{importError}</div> : null}
      <div className="workspace-grid">
        <PartsPalette
          parts={workflow.nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={(nodeId) => dispatch({ type: 'selectNode', nodeId })}
        />
        <div className="center-stack">
          <WorkflowCanvas
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onSelectNode={(nodeId) => dispatch({ type: 'selectNode', nodeId })}
            connectionValidation={connectionValidation}
          />
          <StagePreview
            artifact={workflow.artifact}
            checkOutcome={checkOutcome}
            workflow={workflow}
            selectedNode={selectedNode}
            executionGraph={executionGraph}
            evaluation={evaluation}
            humanReview={humanReview}
          />
        </div>
        <Inspector
          selectedNode={selectedNode}
          nodes={workflow.nodes}
          connections={workflow.connections}
          connectionValidation={connectionValidation}
          onSaveNode={handleSaveNode}
          onCreateConnection={handleCreateConnection}
          onDeleteConnection={handleDeleteConnection}
        />
      </div>
      <BottomMonitor
        workflow={workflow}
        executionGraph={executionGraph}
        templates={templates}
        snapshots={snapshots}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
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
      />
    </div>
  )
}
