import { useMemo, useReducer, useRef, useState } from 'react'
import { calculateBottleneck } from '../domain/connectionRules'
import type { RebuildRequest, ReviewDecision } from '../domain/evaluation'
import { runMockEvaluation } from '../domain/evaluationRules'
import type { ExecutionGraph, ExecutionRoute, ExecutionStep } from '../domain/executionGraph'
import { createSampleWorkflow } from '../domain/sampleWorkflow'
import type {
  AgentRole,
  ConnectionKind,
  WorkflowDataType,
  WorkflowRunLog,
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
  const lastRunIdRef = useRef('')
  const {
    workflow,
    selectedNodeId,
    isRunning,
    checkOutcome,
    importError,
    evaluation,
    humanReview,
    rebuildRequests,
    artifactVersions,
    selectedArtifactVersionId,
    executionGraph,
  } = state

  const selectedNode = useMemo(
    () => selectSelectedNode(workflow, selectedNodeId),
    [selectedNodeId, workflow],
  )
  const connectionValidation = useMemo(() => validateConnections(workflow), [workflow])

  const canEvaluate =
    !isRunning &&
    workflow.status !== 'running' &&
    workflow.status !== 'draft' &&
    workflow.logs.length > 0

  async function runMockWorkflow() {
    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    const runId = `run-${new Date().toISOString()}`
    lastRunIdRef.current = runId

    dispatch({
      type: 'runWorkflowStart',
      runId,
      log: makeLog(runId, 'ローカルモック実行を開始しました。外部APIは呼び出しません。'),
    })

    const outcomeSequence: Array<'PASS' | 'REVIEW' | 'FAIL'> = ['PASS', 'REVIEW', 'PASS']
    const outcome = outcomeSequence[new Date().getSeconds() % outcomeSequence.length]
    dispatch({ type: 'setCheckOutcome', outcome })

    const graphSteps: ExecutionStep[] = []
    const graphRoutes: ExecutionRoute[] = []
    let reviewStepId: string | undefined

    for (const node of workflow.nodes) {
      if (runTokenRef.current !== runToken) {
        return
      }

      dispatch({
        type: 'runNodeRunning',
        nodeId: node.id,
        log: makeLog(runId, `${node.title} を開始しました。`, node.id),
      })

      const stepStartedAt = new Date().toISOString()
      await delay(220)

      const isCheckNode = node.type === 'check'
      const nextStatus =
        isCheckNode && outcome === 'REVIEW' ? 'review_required' : 'success'

      const stepId = `step-${node.id}`
      const stepStatus = nextStatus === 'review_required' ? 'review_required' : 'success'
      const step: ExecutionStep = {
        id: stepId,
        runId,
        nodeId: node.id,
        nodeTitle: node.title,
        status: stepStatus,
        route: isCheckNode && outcome === 'REVIEW' ? 'review' : 'main',
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
        durationMs: 220,
        message: isCheckNode ? `チェック結果: ${outcome}` : `${node.title} 完了`,
      }
      graphSteps.push(step)

      if (stepStatus === 'review_required') {
        reviewStepId = stepId
        graphRoutes.push({
          id: `route-review-${node.id}`,
          kind: 'review',
          fromNodeId: node.id,
          reason: '確認待ちが発生しました',
          createdAt: new Date().toISOString(),
        })
      } else {
        graphRoutes.push({
          id: `route-main-${node.id}`,
          kind: 'main',
          fromNodeId: node.id,
          reason: '正常完了',
          createdAt: new Date().toISOString(),
        })
      }

      dispatch({
        type: 'runNodeSuccess',
        nodeId: node.id,
        status: nextStatus,
        log: makeLog(
          runId,
          isCheckNode ? `チェック結果は ${outcome} でした。` : `${node.title} が完了しました。`,
          node.id,
          isCheckNode && outcome !== 'PASS' ? 'warn' : 'info',
        ),
      })
    }

    const graph: ExecutionGraph = {
      runId,
      steps: graphSteps,
      routes: graphRoutes,
      reviewStepId,
      retryCandidates: outcome === 'REVIEW' ? graphSteps.filter((s) => s.status === 'review_required').map((s) => s.id) : [],
    }
    dispatch({ type: 'setExecutionGraph', graph })

    if (runTokenRef.current !== runToken) {
      return
    }

    const bottleneck = calculateBottleneck(workflow.nodes)
    const tokens = workflow.nodes.reduce(
      (total, node) => total + (node.metrics?.estimatedTokens ?? 0),
      0,
    )
    const cost = workflow.nodes.reduce(
      (total, node) => total + (node.metrics?.estimatedCost ?? 0),
      0,
    )
    const latencyMs = workflow.nodes.reduce(
      (total, node) => total + (node.metrics?.estimatedLatencyMs ?? 0),
      0,
    )

    dispatch({
      type: 'updateMetrics',
      metrics: {
        tokens,
        cost,
        latencyMs,
        successRate: outcome === 'FAIL' ? 84 : outcome === 'REVIEW' ? 92 : 100,
        queueCount: 0,
        retryCount: workflow.nodes.reduce(
          (total, node) => total + (node.metrics?.retryCount ?? 0),
          0,
        ),
        bottleneckNodeId: bottleneck?.id ?? null,
      },
    })

    dispatch({
      type: 'setArtifact',
      artifact: {
        title: 'Bootstrap MVP 成果物',
        format: 'Markdown',
        status: outcome === 'REVIEW' ? 'review_required' : 'checked',
        content: [
          '# Agent Workflow Studio モック成果物',
          '',
          `- チェック結果: ${outcome}`,
          `- 実行ノード数: ${workflow.nodes.length}`,
          `- トークン数: ${tokens}`,
          `- 想定コスト: $${cost.toFixed(3)}`,
          `- ボトルネック: ${bottleneck?.title ?? 'なし'}`,
          '',
          'この成果物はローカルシミュレーターで生成されています。外部API呼び出しは行っていません。',
        ].join('\n'),
      },
    })

    dispatch({
      type: 'appendLog',
      log: makeLog(
        runId,
        'メトリクス更新とテンプレート保存モックを完了しました。',
        undefined,
        'metric',
      ),
    })
    dispatch({ type: 'setRunning', isRunning: false })
  }

  function stopRun() {
    runTokenRef.current += 1
    dispatch({ type: 'setRunning', isRunning: false })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `run-stop-${Date.now()}`,
        'ユーザー操作でローカルモック実行を停止しました。',
        undefined,
        'warn',
      ),
    })
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
          `connection-${Date.now()}`,
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
      log: makeLog(`connection-${Date.now()}`, '接続を作成しました。', undefined, 'info'),
    })
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch({ type: 'deleteConnection', connectionId })
    dispatch({
      type: 'appendLog',
      log: makeLog(`connection-${Date.now()}`, '接続を削除しました。', undefined, 'warn'),
    })
  }

  function handleSaveTemplate() {
    const template = saveWorkflowTemplate(workflow)
    setTemplates(listWorkflowTemplates())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `template-${Date.now()}`,
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
        `snapshot-${Date.now()}`,
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
            `import-${Date.now()}`,
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

  function handleEvaluate() {
    if (!canEvaluate) {
      return
    }
    dispatch({ type: 'startEvaluation' })
    const runId = lastRunIdRef.current || `run-eval-${Date.now()}`
    const result = runMockEvaluation(workflow, workflow.artifact, runId, checkOutcome)
    dispatch({ type: 'setEvaluationResult', result })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        runId,
        `評価完了: ${result.totalScore}/${result.maxScore}点 — ${result.summary}`,
        undefined,
        'info',
      ),
    })
  }

  function handleHumanReviewDecide(decision: ReviewDecision, note: string) {
    dispatch({ type: 'setHumanReviewDecision', decision, note })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `review-${Date.now()}`,
        `Human Review: ${decision}${note ? ` — ${note}` : ''}`,
        undefined,
        'approval',
      ),
    })
  }

  function handleRequestRebuild(reason: string, instruction: string) {
    const request: RebuildRequest = {
      id: `rebuild-${Date.now()}`,
      reason,
      instruction,
      createdAt: new Date().toISOString(),
      status: 'requested',
    }
    dispatch({ type: 'requestRebuild', request })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `rebuild-${Date.now()}`,
        `再作成リクエストを作成しました: ${reason}`,
        undefined,
        'info',
      ),
    })
  }

  async function handleStartRebuild(requestId: string) {
    const request = rebuildRequests.find((r) => r.id === requestId)
    if (!request) {
      return
    }
    dispatch({ type: 'startRebuild', requestId })
    dispatch({
      type: 'appendLog',
      log: makeLog(`rebuild-${Date.now()}`, '再作成モックを実行中...', undefined, 'info'),
    })

    await delay(800)

    const nextVersion = artifactVersions.length + 1
    const mockContent = [
      `# 再作成版 v${nextVersion}`,
      '',
      '元の成果物をもとに、次の修正指示を反映したモック成果物です。',
      '',
      `修正指示: ${request.instruction}`,
      '',
      '## 変更内容',
      `- 修正依頼に基づき成果物を再構成しました。`,
      `- バージョン: v${nextVersion}`,
      `- 再作成日時: ${new Date().toLocaleString('ja-JP')}`,
      '',
      'この成果物はローカルモックで生成されています。実AIによる再作成ではありません。',
    ].join('\n')

    const artifactVersion = {
      id: `av-${Date.now()}`,
      version: nextVersion,
      sourceRunId: lastRunIdRef.current || 'unknown',
      content: mockContent,
      createdAt: new Date().toISOString(),
      evaluationId: evaluation?.id,
      rebuildRequestId: requestId,
    }

    dispatch({ type: 'completeRebuild', requestId, artifactVersion })
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `rebuild-${Date.now()}`,
        `再作成完了: v${nextVersion} を成果物バージョン履歴に追加しました。`,
        undefined,
        'info',
      ),
    })
  }

  function handleCancelRebuild(requestId: string) {
    dispatch({ type: 'cancelRebuild', requestId })
    dispatch({
      type: 'appendLog',
      log: makeLog(`rebuild-${Date.now()}`, '再作成リクエストをキャンセルしました。', undefined, 'warn'),
    })
  }

  function handleSelectArtifactVersion(versionId: string) {
    dispatch({ type: 'selectArtifactVersion', versionId })
  }

  return (
    <div className="app-shell">
      <TopBar
        workflowName={workflow.name}
        status={workflow.status}
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
            evaluation={evaluation}
            humanReview={humanReview}
            artifactVersionCount={artifactVersions.length}
            rebuildRequestCount={rebuildRequests.length}
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
        templates={templates}
        snapshots={snapshots}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onSaveSnapshot={handleSaveSnapshot}
        onLoadSnapshot={handleLoadSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        evaluation={evaluation}
        humanReview={humanReview}
        rebuildRequests={rebuildRequests}
        artifactVersions={artifactVersions}
        selectedArtifactVersionId={selectedArtifactVersionId}
        canEvaluate={canEvaluate}
        onEvaluate={handleEvaluate}
        onHumanReviewDecide={handleHumanReviewDecide}
        onRequestRebuild={handleRequestRebuild}
        onStartRebuild={handleStartRebuild}
        onCancelRebuild={handleCancelRebuild}
        onSelectArtifactVersion={handleSelectArtifactVersion}
        executionGraph={executionGraph}
      />
    </div>
  )
}
