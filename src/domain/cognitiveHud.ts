// Cognitive HUD foundation (Phase 1c).
//
// 目的: 「今、何を見るべきか / どこが詰まっているか / どこが危険か /
// 次に何をすべきか」を、現在の workflow / executionGraph / connectorJobs /
// runHistoryCount から導出する read-only な view layer。
//
// このモジュールは pure：localStorage / React state / 外部 API /
// ブラウザ API / 時計に依存しない。保存モデルでもない。
//
// 既存の `RiskState` / `HudState` 語彙 (src/domain/workflow.ts) と整合する。

import type { ConnectorJob } from './connectorQueue'
import {
  connectionKindLabels,
  connectionStatusLabels,
  formatDataTypeLabel,
  nodeCategoryLabels,
  statusLabels,
} from './displayLabels'
import type { ExecutionGraph } from './executionGraph'
import {
  getInputPorts,
  getOutputPorts,
  getUnconnectedRequiredInputPorts,
} from './portRules'
import { canRetry } from './retryPolicy'
import type {
  ConnectionKind,
  ConnectionStatus,
  HudState,
  NodeCategory,
  RiskState,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
} from './workflow'

// ---- Public types ----

export type HudAlertLevel = RiskState['level'] // 0 | 1 | 2 | 3 | 4 | 5

export type HudPriority = HudState['priority'] // 'normal' | 'watch' | 'alert' | 'critical'

export type HudFocusTargetType =
  | 'node'
  | 'step'
  | 'workflow'
  | 'connector'
  | 'storage'
  | 'none'

export type HudSignalKind =
  | 'workflow_status'
  | 'node_failure'
  | 'review_required'
  | 'bottleneck'
  | 'queue_pressure'
  | 'connector_attention'
  | 'storage_notice'
  | 'run_history'

export type HudSignal = {
  id: string
  kind: HudSignalKind
  alertLevel: HudAlertLevel
  priority: HudPriority
  title: string
  detail: string
  targetType: HudFocusTargetType
  targetId: string | null
  targetLabel: string | null
}

export type HudCounts = {
  totalNodes: number
  runningNodes: number
  queuedNodes: number
  failedNodes: number
  reviewRequiredNodes: number
  blockedNodes: number
  retryReadyNodes: number
  connectorJobsFailed: number
  connectorJobsReviewRequired: number
  connectorJobsRetryable: number
  runHistoryCount: number
}

export type HudSnapshot = {
  alertLevel: HudAlertLevel
  priority: HudPriority
  summary: string
  recommendedAction: string
  focusTargetType: HudFocusTargetType
  focusTargetId: string | null
  focusTargetLabel: string | null
  signals: HudSignal[]
  counts: HudCounts
}

export type HudInput = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: readonly ConnectorJob[]
  runHistoryCount: number
}

export type SelectedNodeHudView = {
  nodeId: string
  title: string
  type: string
  category: string
  categoryLabel: string
  status: WorkflowNode['status']
  statusLabel: string
  priority: HudPriority
  alertLevel: HudAlertLevel
  inputCount: number
  outputCount: number
  incomingConnectionCount: number
  outgoingConnectionCount: number
  estimatedTokens: number
  estimatedLatencyMs: number
  focusMatched: boolean
  focusReason: string | null
  recommendedAction: string
  inputSummary: string
  outputSummary: string
  dependencySummary: string
  warningSummaries: string[]
  inlinePreview: InlinePreview
  safeCopySummary: string
}

export type ZoomMode = 'overview' | 'map' | 'normal' | 'detail' | 'deep'

export type ZoomHudView = {
  zoom: number
  zoomPercent: number
  mode: ZoomMode
  label: string
  description: string
  className: string
}

export type InlinePreviewKind = 'text' | 'file' | 'output' | 'normalize' | 'generic'

export type InlinePreview = {
  kind: InlinePreviewKind
  title: string
  text: string
  source: 'description' | 'type' | 'ports'
}

export type SelectedEdgeHudView = {
  connectionId: string
  sourceNodeId: string
  targetNodeId: string
  sourceTitle: string
  targetTitle: string
  label: string
  flowType: ConnectionKind
  flowTypeLabel: string
  status: ConnectionStatus
  statusLabel: string
  carriesSummary: string
  hasCondition: boolean
  conditionSummary: string
  delaySummary: string
  retrySummary: string
  errorRouteSummary: string
  health: 'healthy' | 'watch' | 'blocked'
  healthLabel: string
  recommendedAction: string
  safeCopySummary: string
}

export type WorkflowGroupTone = 'input' | 'transform' | 'execute' | 'check' | 'output'

export type WorkflowGroupView = {
  id: string
  title: string
  tone: WorkflowGroupTone
  nodeIds: string[]
}

// ---- Tunables ----

const ELEVATED_RETRY_THRESHOLD = 2
const PREVIEW_MAX_LENGTH = 96

// ---- Public helpers ----

export function mapAlertLevelToPriority(level: HudAlertLevel): HudPriority {
  if (level >= 5) return 'critical'
  if (level === 4) return 'critical'
  if (level === 3) return 'alert'
  if (level === 2) return 'watch'
  if (level === 1) return 'watch'
  return 'normal'
}

export const hudPriorityLabels: Record<HudPriority, string> = {
  normal: '通常',
  watch: '注視',
  alert: '警戒',
  critical: '危険',
}

export const hudSignalKindLabels: Record<HudSignalKind, string> = {
  workflow_status: 'ワークフロー状態',
  node_failure: 'ノード失敗',
  review_required: '人間確認待ち',
  bottleneck: 'ボトルネック',
  queue_pressure: 'キュー滞留',
  connector_attention: 'コネクター',
  storage_notice: 'ストレージ',
  run_history: '実行履歴',
}

export function buildZoomHudView(zoom: number): ZoomHudView {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const zoomPercent = Math.round(safeZoom * 100)
  const mode = zoomPercent <= 35
    ? 'overview'
    : zoomPercent <= 74
      ? 'map'
      : zoomPercent <= 149
        ? 'normal'
        : zoomPercent <= 299
          ? 'detail'
          : 'deep'

  const labels: Record<ZoomMode, string> = {
    overview: 'Overview',
    map: 'Map',
    normal: 'Normal',
    detail: 'Detail',
    deep: 'Deep',
  }
  const descriptions: Record<ZoomMode, string> = {
    overview: '構造とグループを優先します。',
    map: '関係と経路を優先します。',
    normal: '通常のノードカード表示です。',
    detail: 'ノード内の要約を強調します。',
    deep: '入出力とプレビューを濃く表示します。',
  }

  return {
    zoom: safeZoom,
    zoomPercent,
    mode,
    label: labels[mode],
    description: descriptions[mode],
    className: `zoom-mode-${mode}`,
  }
}

export function buildInlinePreview(node: WorkflowNode): InlinePreview {
  const inputTypes = node.inputTypes.map(formatDataTypeLabel).join(', ')
  const outputTypes = node.outputTypes.map(formatDataTypeLabel).join(', ')
  const description = truncateText(node.description, PREVIEW_MAX_LENGTH)

  if (node.type === 'text-input' || node.category === 'input' && node.outputTypes.includes('Text')) {
    return {
      kind: 'text',
      title: 'Text preview',
      text: description || '人間入力テキストを次のノードへ渡します。',
      source: description ? 'description' : 'type',
    }
  }

  if (node.type === 'file-input' || node.outputTypes.includes('File')) {
    return {
      kind: 'file',
      title: 'File preview',
      text: description || 'ローカルファイル入力の参照のみを扱います。',
      source: description ? 'description' : 'type',
    }
  }

  if (node.type === 'normalize' || node.category === 'transform') {
    return {
      kind: 'normalize',
      title: 'Normalize preview',
      text: description || `${inputTypes || '入力'} から ${outputTypes || 'Context'} へ整形します。`,
      source: description ? 'description' : 'ports',
    }
  }

  if (node.category === 'output' || node.type === 'output') {
    return {
      kind: 'output',
      title: 'Output preview',
      text: description || `${outputTypes || 'Artifact'} をローカル表示します。`,
      source: description ? 'description' : 'ports',
    }
  }

  return {
    kind: 'generic',
    title: 'Node preview',
    text: description || `${inputTypes || 'Start'} -> ${outputTypes || 'Result'}`,
    source: description ? 'description' : 'ports',
  }
}

export function buildSelectedNodeHudView(options: {
  node: WorkflowNode | undefined
  connections: readonly WorkflowConnection[]
  hudSnapshot: HudSnapshot
}): SelectedNodeHudView | null {
  const { node, connections, hudSnapshot } = options
  if (!node) return null

  const inputCount = getInputPorts(node).length
  const outputCount = getOutputPorts(node).length
  const incomingConnections = connections.filter(
    (connection) => connection.targetNodeId === node.id,
  )
  const outgoingConnections = connections.filter(
    (connection) => connection.sourceNodeId === node.id,
  )
  const focusSignal =
    hudSnapshot.signals.find(
      (signal) => signal.targetType === 'node' && signal.targetId === node.id,
    ) ?? null
  const missingRequired = getUnconnectedRequiredInputPorts(node, [...connections])
  const warningSummaries = [
    ...missingRequired.map((port) => `必須入力未接続: ${port.label}`),
    ...(node.status === 'failed'
      ? [node.lastRun?.error ?? '直近実行で失敗しています。']
      : []),
    ...(node.status === 'review_required' ? ['人間確認待ちです。'] : []),
    ...(node.status === 'blocked' ? ['前段の影響で停止しています。'] : []),
  ]
  const inputSummary = summarizePorts(getInputPorts(node), '入力なし')
  const outputSummary = summarizePorts(getOutputPorts(node), '出力なし')
  const dependencySummary = [
    incomingConnections.length > 0 ? `上流 ${incomingConnections.length}` : '上流なし',
    outgoingConnections.length > 0 ? `下流 ${outgoingConnections.length}` : '下流なし',
  ].join(' / ')
  const inlinePreview = buildInlinePreview(node)
  const categoryLabel = nodeCategoryLabels[node.category as NodeCategory] ?? node.category
  const statusLabel = statusLabels[node.status]

  return {
    nodeId: node.id,
    title: node.title,
    type: node.type,
    category: node.category,
    categoryLabel,
    status: node.status,
    statusLabel,
    priority: focusSignal?.priority ?? hudSnapshot.priority,
    alertLevel: focusSignal?.alertLevel ?? hudSnapshot.alertLevel,
    inputCount,
    outputCount,
    incomingConnectionCount: incomingConnections.length,
    outgoingConnectionCount: outgoingConnections.length,
    estimatedTokens: node.metrics?.estimatedTokens ?? 0,
    estimatedLatencyMs: node.metrics?.estimatedLatencyMs ?? 0,
    focusMatched: focusSignal !== null || hudSnapshot.focusTargetId === node.id,
    focusReason: focusSignal?.title ?? null,
    recommendedAction: focusSignal?.detail ?? hudSnapshot.recommendedAction,
    inputSummary,
    outputSummary,
    dependencySummary,
    warningSummaries,
    inlinePreview,
    safeCopySummary: [
      `node: ${node.title} (${node.id})`,
      `type: ${node.type}`,
      `status: ${statusLabel}`,
      `io: ${inputSummary} -> ${outputSummary}`,
      `estimate: ${node.metrics?.estimatedTokens ?? 0} tokens / ${node.metrics?.estimatedLatencyMs ?? 0} ms`,
      `next: ${focusSignal?.detail ?? hudSnapshot.recommendedAction}`,
    ].join('\n'),
  }
}

export function buildSelectedEdgeHudView(options: {
  workflow: Workflow
  connectionId: string | null
  connectionValidation?: readonly { connectionId?: string; valid: boolean; reason?: string | null }[]
}): SelectedEdgeHudView | null {
  const { workflow, connectionId, connectionValidation = [] } = options
  if (!connectionId) return null

  const connection = workflow.connections.find((item) => item.id === connectionId)
  if (!connection) return null

  const source = workflow.nodes.find((node) => node.id === connection.sourceNodeId)
  const target = workflow.nodes.find((node) => node.id === connection.targetNodeId)
  const validation = connectionValidation.find((item) => item.connectionId === connection.id)
  const carriesSummary =
    connection.carries.length > 0
      ? connection.carries.map(formatDataTypeLabel).join(', ')
      : '未指定'
  const conditionKinds: ConnectionKind[] = ['decision', 'approval', 'error', 'retry']
  const hasCondition = conditionKinds.includes(connection.kind)
  const latencyMs = connection.metrics?.latencyMs ?? 0
  const health: SelectedEdgeHudView['health'] =
    connection.status === 'failed' || connection.status === 'invalid' || validation?.valid === false
      ? 'blocked'
      : connection.status === 'throttled' || connection.kind === 'retry' || latencyMs >= 220
        ? 'watch'
        : 'healthy'
  const healthLabel =
    health === 'blocked' ? '要確認' : health === 'watch' ? '注視' : '正常'
  const flowTypeLabel = connectionKindLabels[connection.kind]
  const statusLabel = connectionStatusLabels[connection.status]
  const sourceTitle = source?.title ?? connection.sourceNodeId
  const targetTitle = target?.title ?? connection.targetNodeId
  const recommendedAction =
    health === 'blocked'
      ? validation?.reason ?? '接続条件と上流/下流ノードを確認してください。'
      : health === 'watch'
        ? '遅延・再試行・分岐条件を確認してください。'
        : '接続は安定しています。次は下流ノードの出力を確認できます。'

  return {
    connectionId: connection.id,
    sourceNodeId: connection.sourceNodeId,
    targetNodeId: connection.targetNodeId,
    sourceTitle,
    targetTitle,
    label: `${sourceTitle} -> ${targetTitle}`,
    flowType: connection.kind,
    flowTypeLabel,
    status: connection.status,
    statusLabel,
    carriesSummary,
    hasCondition,
    conditionSummary: hasCondition ? `${flowTypeLabel} 経路` : '条件なし',
    delaySummary: latencyMs > 0 ? `${latencyMs} ms estimate` : 'delay 未設定',
    retrySummary: connection.kind === 'retry' ? 'retry route' : 'retry 仮表示なし',
    errorRouteSummary: connection.kind === 'error' ? 'error route' : 'error route 仮表示なし',
    health,
    healthLabel,
    recommendedAction,
    safeCopySummary: [
      `edge: ${connection.id}`,
      `from: ${sourceTitle}`,
      `to: ${targetTitle}`,
      `flow: ${flowTypeLabel}`,
      `status: ${statusLabel}`,
      `carries: ${carriesSummary}`,
      `health: ${healthLabel}`,
      `next: ${recommendedAction}`,
    ].join('\n'),
  }
}

export function buildWorkflowGroups(workflow: Workflow): WorkflowGroupView[] {
  const groups: Array<{
    id: string
    title: string
    tone: WorkflowGroupTone
    categories: string[]
  }> = [
    { id: 'input-flow', title: 'Input / Trigger', tone: 'input', categories: ['trigger', 'input'] },
    { id: 'shape-flow', title: 'Shape / Route', tone: 'transform', categories: ['transform', 'branch'] },
    { id: 'execute-flow', title: 'Execution', tone: 'execute', categories: ['execute'] },
    { id: 'verify-flow', title: 'Verify / Aggregate', tone: 'check', categories: ['check', 'aggregate', 'safety', 'hud'] },
    { id: 'output-flow', title: 'Output / Record', tone: 'output', categories: ['output', 'record', 'template', 'observe', 'improve'] },
  ]

  return groups
    .map((group) => ({
      id: group.id,
      title: group.title,
      tone: group.tone,
      nodeIds: workflow.nodes
        .filter((node) => group.categories.includes(node.category))
        .map((node) => node.id),
    }))
    .filter((group) => group.nodeIds.length > 0)
}

// ---- Internal ----

const priorityRank: Record<HudPriority, number> = {
  critical: 3,
  alert: 2,
  watch: 1,
  normal: 0,
}

function nodeLabel(node: WorkflowNode | undefined, fallback: string): string {
  return node?.title ?? fallback
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function summarizePorts(
  ports: ReturnType<typeof getInputPorts>,
  emptyText: string,
): string {
  if (ports.length === 0) {
    return emptyText
  }
  return ports
    .slice(0, 4)
    .map((port) => `${port.label}:${formatDataTypeLabel(port.dataType)}${port.required ? '*' : ''}`)
    .join(', ')
}

type NodeStatusCounts = Pick<
  HudCounts,
  | 'totalNodes'
  | 'runningNodes'
  | 'queuedNodes'
  | 'failedNodes'
  | 'reviewRequiredNodes'
  | 'blockedNodes'
  | 'retryReadyNodes'
>

function countNodesByStatus(workflow: Workflow): NodeStatusCounts {
  let running = 0
  let queued = 0
  let failed = 0
  let review = 0
  let blocked = 0
  let retry = 0
  for (const node of workflow.nodes) {
    switch (node.status) {
      case 'running':
        running += 1
        break
      case 'queued':
        queued += 1
        break
      case 'failed':
        failed += 1
        break
      case 'review_required':
        review += 1
        break
      case 'blocked':
        blocked += 1
        break
      case 'retry_ready':
        retry += 1
        break
      default:
        break
    }
  }
  return {
    totalNodes: workflow.nodes.length,
    runningNodes: running,
    queuedNodes: queued,
    failedNodes: failed,
    reviewRequiredNodes: review,
    blockedNodes: blocked,
    retryReadyNodes: retry,
  }
}

function collectSignals(input: HudInput): HudSignal[] {
  const { workflow, executionGraph, connectorJobs, runHistoryCount } = input
  const signals: HudSignal[] = []

  // ---- Level 5: workflow failed / failed node exists ----

  if (workflow.status === 'failed') {
    signals.push({
      id: 'workflow-failed',
      kind: 'workflow_status',
      alertLevel: 5,
      priority: 'critical',
      title: 'ワークフローが失敗しました',
      detail: '直近の実行が失敗で終了しました。失敗ノードを確認してください。',
      targetType: 'workflow',
      targetId: workflow.id,
      targetLabel: workflow.name,
    })
  }

  const failedNodes = workflow.nodes.filter((node) => node.status === 'failed')
  for (const node of failedNodes) {
    signals.push({
      id: `node-failed:${node.id}`,
      kind: 'node_failure',
      alertLevel: 5,
      priority: 'critical',
      title: `失敗ノード: ${node.title}`,
      detail: 'エラー経路へ分岐したノードがあります。原因を確認してください。',
      targetType: 'node',
      targetId: node.id,
      targetLabel: node.title,
    })
  }

  // ---- Level 4: review_required / blocked ----

  if (workflow.status === 'review_required') {
    signals.push({
      id: 'workflow-review-required',
      kind: 'review_required',
      alertLevel: 4,
      priority: 'critical',
      title: 'ワークフローが確認待ちです',
      detail: '承認 / 差し戻し / スキップを判断してください。',
      targetType: 'workflow',
      targetId: workflow.id,
      targetLabel: workflow.name,
    })
  }

  const reviewNodes = workflow.nodes.filter((node) => node.status === 'review_required')
  for (const node of reviewNodes) {
    signals.push({
      id: `node-review:${node.id}`,
      kind: 'review_required',
      alertLevel: 4,
      priority: 'critical',
      title: `確認待ちノード: ${node.title}`,
      detail: '人間の判断を待っています。',
      targetType: 'node',
      targetId: node.id,
      targetLabel: node.title,
    })
  }

  if (executionGraph) {
    const reviewSteps = executionGraph.steps.filter(
      (step) => step.status === 'review_required',
    )
    for (const step of reviewSteps) {
      signals.push({
        id: `step-review:${step.id}`,
        kind: 'review_required',
        alertLevel: 4,
        priority: 'critical',
        title: `確認待ちステップ: ${step.nodeTitle}`,
        detail: step.message ?? '確認待ちで停止しています。',
        targetType: 'step',
        targetId: step.id,
        targetLabel: step.nodeTitle,
      })
    }
  }

  const blockedNodes = workflow.nodes.filter((node) => node.status === 'blocked')
  for (const node of blockedNodes) {
    signals.push({
      id: `node-blocked:${node.id}`,
      kind: 'node_failure',
      alertLevel: 4,
      priority: 'critical',
      title: `停止中ノード: ${node.title}`,
      detail: '前段の影響で停止しています。',
      targetType: 'node',
      targetId: node.id,
      targetLabel: node.title,
    })
  }

  // ---- Level 3: bottleneck / connector attention / retry candidate ----

  const bottleneckId = workflow.metrics.bottleneckNodeId
  if (bottleneckId) {
    const bottleneckNode = workflow.nodes.find((node) => node.id === bottleneckId)
    signals.push({
      id: `bottleneck:${bottleneckId}`,
      kind: 'bottleneck',
      alertLevel: 3,
      priority: 'alert',
      title: `ボトルネック: ${nodeLabel(bottleneckNode, bottleneckId)}`,
      detail: '実行時間とリトライ回数から推定されたボトルネックです。',
      targetType: 'node',
      targetId: bottleneckId,
      targetLabel: nodeLabel(bottleneckNode, bottleneckId),
    })
  }

  const failedJobs = connectorJobs.filter((job) => job.status === 'failed')
  for (const job of failedJobs) {
    signals.push({
      id: `connector-failed:${job.id}`,
      kind: 'connector_attention',
      alertLevel: 3,
      priority: 'alert',
      title: `コネクター失敗: ${job.connectorLabel}`,
      detail: job.error ?? `${job.nodeTitle} のコネクタージョブが失敗しました。`,
      targetType: 'connector',
      targetId: job.id,
      targetLabel: job.connectorLabel,
    })
  }

  const reviewJobs = connectorJobs.filter((job) => job.status === 'review_required')
  for (const job of reviewJobs) {
    signals.push({
      id: `connector-review:${job.id}`,
      kind: 'connector_attention',
      alertLevel: 3,
      priority: 'alert',
      title: `コネクター確認待ち: ${job.connectorLabel}`,
      detail: `${job.nodeTitle} のコネクタージョブが確認待ちです。`,
      targetType: 'connector',
      targetId: job.id,
      targetLabel: job.connectorLabel,
    })
  }

  if (executionGraph && executionGraph.retryCandidates.length > 0) {
    const candidateSteps = executionGraph.steps.filter((step) =>
      executionGraph.retryCandidates.includes(step.id),
    )
    for (const step of candidateSteps) {
      signals.push({
        id: `retry-candidate:${step.id}`,
        kind: 'queue_pressure',
        alertLevel: 3,
        priority: 'alert',
        title: `再試行候補: ${step.nodeTitle}`,
        detail: step.error ?? step.message ?? '再試行可能なステップがあります。',
        targetType: 'step',
        targetId: step.id,
        targetLabel: step.nodeTitle,
      })
    }
  }

  // ---- Level 2: running / queued / elevated retry ----

  const runningNodes = workflow.nodes.filter((node) => node.status === 'running')
  for (const node of runningNodes) {
    signals.push({
      id: `node-running:${node.id}`,
      kind: 'workflow_status',
      alertLevel: 2,
      priority: 'watch',
      title: `実行中: ${node.title}`,
      detail: 'ノードが実行中です。',
      targetType: 'node',
      targetId: node.id,
      targetLabel: node.title,
    })
  }

  const queuedNodes = workflow.nodes.filter((node) => node.status === 'queued')
  if (queuedNodes.length > 0) {
    const head = queuedNodes[0]
    signals.push({
      id: 'queue-pressure',
      kind: 'queue_pressure',
      alertLevel: 2,
      priority: 'watch',
      title: `待機列に ${queuedNodes.length} 件あります`,
      detail: `先頭: ${head.title}`,
      targetType: 'node',
      targetId: head.id,
      targetLabel: head.title,
    })
  }

  if (workflow.metrics.retryCount >= ELEVATED_RETRY_THRESHOLD) {
    signals.push({
      id: 'retry-elevated',
      kind: 'queue_pressure',
      alertLevel: 2,
      priority: 'watch',
      title: `再試行回数が増えています (${workflow.metrics.retryCount})`,
      detail: '同じノードで複数回失敗していないか確認してください。',
      targetType: 'workflow',
      targetId: workflow.id,
      targetLabel: workflow.name,
    })
  }

  // ---- Level 1: run history / storage notice ----

  if (runHistoryCount > 0) {
    signals.push({
      id: 'run-history',
      kind: 'run_history',
      alertLevel: 1,
      priority: 'watch',
      title: `実行履歴: ${runHistoryCount} 件`,
      detail: 'ローカル保存された Run Record があります（最新 50 件）。',
      targetType: 'storage',
      targetId: 'run-history',
      targetLabel: '実行履歴',
    })
  }

  if (workflow.status === 'paused' || workflow.status === 'cancelled') {
    signals.push({
      id: 'workflow-paused',
      kind: 'storage_notice',
      alertLevel: 1,
      priority: 'watch',
      title:
        workflow.status === 'paused'
          ? 'ワークフローは一時停止中です'
          : 'ワークフローはキャンセル済みです',
      detail: '直近の実行が中断されました。再開または再実行を検討してください。',
      targetType: 'workflow',
      targetId: workflow.id,
      targetLabel: workflow.name,
    })
  }

  // ---- Sort ----

  signals.sort((a, b) => {
    if (b.alertLevel !== a.alertLevel) return b.alertLevel - a.alertLevel
    if (priorityRank[b.priority] !== priorityRank[a.priority]) {
      return priorityRank[b.priority] - priorityRank[a.priority]
    }
    return a.id.localeCompare(b.id)
  })

  return signals
}

function summarizeSnapshot(
  topSignal: HudSignal | undefined,
  level: HudAlertLevel,
  counts: HudCounts,
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
): { summary: string; recommendedAction: string } {
  if (!topSignal || level === 0) {
    const baseline =
      workflow.status === 'success'
        ? '直近の実行は成功しました。'
        : workflow.status === 'running'
          ? '実行中です。'
          : '注視すべき問題はありません。'
    return {
      summary: baseline,
      recommendedAction:
        workflow.status === 'running'
          ? '実行完了まで待機してください。'
          : '次の Run を開始できます。',
    }
  }

  switch (topSignal.kind) {
    case 'workflow_status':
      if (workflow.status === 'failed') {
        if (counts.failedNodes > 0) {
          return {
            summary: `ワークフローが失敗しました（失敗ノード ${counts.failedNodes} 件）。`,
            recommendedAction: '失敗ノードを開いてエラー内容を確認してください。',
          }
        }
        const failedStep =
          executionGraph?.steps.find((step) => step.id === executionGraph.failedStepId) ?? null
        if (failedStep) {
          return {
            summary: `ワークフローが失敗しました（失敗ステップ: ${failedStep.nodeTitle}）。`,
            recommendedAction: '実行グラフ タブで失敗ステップの詳細を確認してください。',
          }
        }
        return {
          summary: 'ワークフローが失敗しました。',
          recommendedAction: 'ログと実行グラフ タブで失敗原因を確認してください。',
        }
      }
      return {
        summary: topSignal.title,
        recommendedAction: '実行状態を確認してください。',
      }
    case 'node_failure':
      return {
        summary: `失敗ノードがあります: ${topSignal.targetLabel ?? '不明'}`,
        recommendedAction: '実行グラフ / 再試行候補から原因を確認してください。',
      }
    case 'review_required':
      return {
        summary:
          counts.reviewRequiredNodes > 0
            ? `確認待ちが ${counts.reviewRequiredNodes} 件あります。`
            : '確認待ちのステップがあります。',
        recommendedAction: 'キュー タブで承認 / 差し戻し / スキップを判断してください。',
      }
    case 'bottleneck':
      return {
        summary: `ボトルネック候補: ${topSignal.targetLabel ?? '不明'}`,
        recommendedAction: '当該ノードの設定やリトライ条件を見直してください。',
      }
    case 'queue_pressure':
      return {
        summary: topSignal.title,
        recommendedAction: 'キュー タブで状態を確認してください。',
      }
    case 'connector_attention':
      return {
        summary: topSignal.title,
        recommendedAction: 'キュー タブのコネクタージョブで詳細を確認してください。',
      }
    case 'storage_notice':
      return {
        summary: topSignal.title,
        recommendedAction: '実行を再開するか、新しい Run を開始してください。',
      }
    case 'run_history':
      return {
        summary: topSignal.title,
        recommendedAction: 'ストレージ タブで履歴を確認できます。',
      }
  }
}

// ---- Public API ----

/**
 * 現在状態から HUD snapshot を導出する pure function。
 *
 * - 入力は workflow / executionGraph / connectorJobs / runHistoryCount のみ。
 * - localStorage / React state / 外部 API / 時計には依存しない。
 * - 戻り値は読み取り専用の view 表現（保存モデルではない）。
 */
export function deriveHudSnapshot(input: HudInput): HudSnapshot {
  const signals = collectSignals(input)
  const nodeCounts = countNodesByStatus(input.workflow)
  const counts: HudCounts = {
    ...nodeCounts,
    connectorJobsFailed: input.connectorJobs.filter((job) => job.status === 'failed').length,
    connectorJobsReviewRequired: input.connectorJobs.filter(
      (job) => job.status === 'review_required',
    ).length,
    connectorJobsRetryable: input.connectorJobs.filter(
      (job) => job.status === 'failed' && canRetry(job.retryCount),
    ).length,
    runHistoryCount: input.runHistoryCount,
  }

  const topSignal = signals[0]
  const alertLevel: HudAlertLevel = topSignal?.alertLevel ?? 0
  const priority: HudPriority = mapAlertLevelToPriority(alertLevel)
  const { summary, recommendedAction } = summarizeSnapshot(
    topSignal,
    alertLevel,
    counts,
    input.workflow,
    input.executionGraph,
  )

  return {
    alertLevel,
    priority,
    summary,
    recommendedAction,
    focusTargetType: topSignal?.targetType ?? 'none',
    focusTargetId: topSignal?.targetId ?? null,
    focusTargetLabel: topSignal?.targetLabel ?? null,
    signals,
    counts,
  }
}
