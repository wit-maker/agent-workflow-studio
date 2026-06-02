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
import type { EvaluationResult, HumanReviewState } from './evaluation'
import {
  connectionKindLabels,
  connectionStatusLabels,
  executionStepStatusLabels,
  formatDataTypeLabel,
  nodeCategoryLabels,
  routeKindLabels,
  statusLabels,
} from './displayLabels'
import { summarizeConnectionRuntimePolicy } from './edgeRuntimePolicy'
import type { ExecutionGraph, ExecutionRouteKind, ExecutionStepStatus } from './executionGraph'
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
import type { WorkflowRunRecord, WorkflowRunStatus } from './runHistory'
import type { RunStep, RunTrace } from './runTrace'
import { formatEvidenceSummary } from './runStepEvidence'

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
  historyRunId: string | null
  historySource: RunTrace['source'] | 'none'
  historyEvidenceCount: number
  historyEvidenceSummaries: string[]
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

export type EdgeRuntimeState = 'idle' | 'ready' | 'active' | 'observed' | 'blocked' | 'stale'

export type EdgeRuntimeHealth = 'healthy' | 'watch' | 'blocked'

export type EdgeRuntimeSemantics = {
  connectionId: string
  state: EdgeRuntimeState
  stateLabel: string
  health: EdgeRuntimeHealth
  healthLabel: string
  sourceStepStatus: string
  targetStepStatus: string
  routeSummary: string
  observedRouteKinds: ExecutionRouteKind[]
  evidenceCount: number
  traceRunId: string | null
  traceSource: RunTrace['source'] | 'none'
  delaySummary: string
  retrySummary: string
  errorRouteSummary: string
  conditionSummary: string
  recommendedAction: string
  className: string
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
  health: EdgeRuntimeHealth
  healthLabel: string
  runtimeState: EdgeRuntimeState
  runtimeLabel: string
  sourceRuntimeStatus: string
  targetRuntimeStatus: string
  observedRouteSummary: string
  runtimeEvidenceCount: number
  traceRunId: string | null
  traceSource: RunTrace['source'] | 'none'
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

export type CanvasHudPlacement =
  | 'right'
  | 'left'
  | 'below'
  | 'above'
  | 'top-safe'
  | 'fallback'

export type CanvasHudSize = {
  width: number
  height: number
}

export type CanvasHudCollisionState = {
  paletteOpen: boolean
  detailOpen: boolean
  consoleOpen: boolean
  notificationOpen: boolean
  miniMapVisible: boolean
  nodeHudSize: CanvasHudSize | null
  edgeHudSize: CanvasHudSize | null
}

export type CanvasHudAnchor = {
  x: number
  y: number
  source: 'node' | 'edge'
  placement: CanvasHudPlacement
  collisionIds: string[]
}

export type SemanticFocusSource =
  | 'failure'
  | 'approval'
  | 'validation'
  | 'retry'
  | 'running'
  | 'bottleneck'
  | 'hud-signal'

export type SemanticFocusPathView = {
  id: string
  source: SemanticFocusSource
  priority: HudPriority
  alertLevel: HudAlertLevel
  title: string
  summary: string
  nextAction: string
  primaryNodeId: string | null
  nodeIds: string[]
  connectionIds: string[]
  dimUnfocused: boolean
  evidenceCount: number
}

export type CentralHudVariant =
  | 'watch'
  | 'validation'
  | 'approval'
  | 'failure'
  | 'danger'

export type CentralHudView = {
  variant: CentralHudVariant
  priority: HudPriority
  alertLevel: HudAlertLevel
  headline: string
  detail: string
  nextAction: string
  focusLabel: string | null
  sourceLabel: string
  signalCount: number
}

export type HudDensityMode = 'quiet' | 'balanced' | 'deep'

export type HudDangerVisibility = 'critical-only' | 'attention' | 'all'

export type HudDensityView = {
  mode: HudDensityMode
  label: string
  shortLabel: string
  description: string
  className: string
  signalLimit: number
  historyLimit: number
  dangerVisibility: HudDangerVisibility
  dangerVisibilityLabel: string
  collapsePolicy: string
}

export type HudNotificationTone = HudPriority | 'info'

export type HudNotificationItem = {
  id: string
  tone: HudNotificationTone
  alertLevel: HudAlertLevel
  title: string
  detail: string
  sourceLabel: string
  targetType: HudFocusTargetType
  targetId: string | null
  targetLabel: string | null
}

export type HudHistoryEntry = {
  id: string
  runId: string
  title: string
  status: WorkflowRunStatus
  statusLabel: string
  modeLabel: string
  summary: string
  startedAtLabel: string
  durationLabel: string
  evidenceCount: number
  issueCount: number
}

export type HudNotificationBundleView = {
  density: HudDensityView
  headline: string
  statusLine: string
  notificationItems: HudNotificationItem[]
  hiddenNotificationCount: number
  historyEntries: HudHistoryEntry[]
  hiddenHistoryCount: number
  latestRunSummary: string
  evidenceSummary: string
  safeCopySummary: string
}

export type ConnectionValidationSummary = {
  connectionId?: string
  valid: boolean
  reason?: string | null
  severity?: 'info' | 'warn' | 'error'
}

// ---- Tunables ----

const ELEVATED_RETRY_THRESHOLD = 2
const PREVIEW_MAX_LENGTH = 96
const SEMANTIC_FOCUS_MAX_NODES = 9
const SEMANTIC_FOCUS_MAX_CONNECTIONS = 12

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
  semanticFocusPath?: SemanticFocusPathView | null
  runTrace?: RunTrace | null
}): SelectedNodeHudView | null {
  const { node, connections, hudSnapshot, semanticFocusPath = null, runTrace = null } = options
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
  const semanticFocusMatched = semanticFocusPath?.nodeIds.includes(node.id) ?? false
  const semanticPrimaryMatched = semanticFocusPath?.primaryNodeId === node.id
  const matchedSemanticFocusPath = semanticFocusMatched ? semanticFocusPath : null
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
  const nodeTraceSteps = runTrace?.steps.filter((step) => step.nodeId === node.id) ?? []
  const historyEvidence = nodeTraceSteps.flatMap((step) => step.evidence)
  const historyEvidenceSummaries = historyEvidence
    .map(formatEvidenceSummary)
    .slice(-4)

  return {
    nodeId: node.id,
    title: node.title,
    type: node.type,
    category: node.category,
    categoryLabel,
    status: node.status,
    statusLabel,
    priority: matchedSemanticFocusPath
      ? matchedSemanticFocusPath.priority
      : focusSignal?.priority ?? hudSnapshot.priority,
    alertLevel: matchedSemanticFocusPath
      ? matchedSemanticFocusPath.alertLevel
      : focusSignal?.alertLevel ?? hudSnapshot.alertLevel,
    inputCount,
    outputCount,
    incomingConnectionCount: incomingConnections.length,
    outgoingConnectionCount: outgoingConnections.length,
    estimatedTokens: node.metrics?.estimatedTokens ?? 0,
    estimatedLatencyMs: node.metrics?.estimatedLatencyMs ?? 0,
    focusMatched: semanticFocusMatched || focusSignal !== null || hudSnapshot.focusTargetId === node.id,
    focusReason: matchedSemanticFocusPath && semanticPrimaryMatched
      ? matchedSemanticFocusPath.title
      : matchedSemanticFocusPath
        ? `${matchedSemanticFocusPath.title} path`
        : focusSignal?.title ?? null,
    recommendedAction: matchedSemanticFocusPath
      ? matchedSemanticFocusPath.nextAction
      : focusSignal?.detail ?? hudSnapshot.recommendedAction,
    inputSummary,
    outputSummary,
    dependencySummary,
    warningSummaries,
    inlinePreview,
    historyRunId: runTrace?.runId ?? null,
    historySource: runTrace?.source ?? 'none',
    historyEvidenceCount: historyEvidence.length,
    historyEvidenceSummaries,
    safeCopySummary: [
      `node: ${node.title} (${node.id})`,
      `type: ${node.type}`,
      `status: ${statusLabel}`,
      `io: ${inputSummary} -> ${outputSummary}`,
      `estimate: ${node.metrics?.estimatedTokens ?? 0} tokens / ${node.metrics?.estimatedLatencyMs ?? 0} ms`,
      `trace: ${runTrace?.runId ?? 'none'} / evidence ${historyEvidence.length}`,
      `next: ${
        matchedSemanticFocusPath
          ? matchedSemanticFocusPath.nextAction
          : focusSignal?.detail ?? hudSnapshot.recommendedAction
      }`,
    ].join('\n'),
  }
}

type EdgeRuntimeStep = {
  id: string
  nodeId: string
  status: ExecutionStepStatus
  route: ExecutionRouteKind
  durationMs?: number
  evidenceCount: number
}

export function buildWorkflowEdgeRuntimeMap(options: {
  workflow: Workflow
  executionGraph?: ExecutionGraph | null
  runTrace?: RunTrace | null
  connectionValidation?: readonly ConnectionValidationSummary[]
}): ReadonlyMap<string, EdgeRuntimeSemantics> {
  const { workflow, executionGraph = null, runTrace = null, connectionValidation = [] } = options
  const result = new Map<string, EdgeRuntimeSemantics>()

  for (const connection of workflow.connections) {
    const validation = connectionValidation.find((item) => item.connectionId === connection.id)
    result.set(
      connection.id,
      buildEdgeRuntimeSemantics({
        connection,
        executionGraph,
        runTrace,
        validation,
      }),
    )
  }

  return result
}

export function buildSelectedEdgeHudView(options: {
  workflow: Workflow
  connectionId: string | null
  executionGraph?: ExecutionGraph | null
  runTrace?: RunTrace | null
  connectionValidation?: readonly ConnectionValidationSummary[]
}): SelectedEdgeHudView | null {
  const {
    workflow,
    connectionId,
    executionGraph = null,
    runTrace = null,
    connectionValidation = [],
  } = options
  if (!connectionId) return null

  const connection = workflow.connections.find((item) => item.id === connectionId)
  if (!connection) return null

  const source = workflow.nodes.find((node) => node.id === connection.sourceNodeId)
  const target = workflow.nodes.find((node) => node.id === connection.targetNodeId)
  const validation = connectionValidation.find((item) => item.connectionId === connection.id)
  const runtime = buildEdgeRuntimeSemantics({
    connection,
    executionGraph,
    runTrace,
    validation,
  })
  const carriesSummary =
    connection.carries.length > 0
      ? connection.carries.map(formatDataTypeLabel).join(', ')
      : '未指定'
  const conditionKinds: ConnectionKind[] = ['decision', 'approval', 'error', 'retry']
  const hasCondition =
    summarizeConnectionRuntimePolicy(connection).hasCondition ||
    conditionKinds.includes(connection.kind) ||
    runtime.observedRouteKinds.some((kind) => kind !== 'main')
  const flowTypeLabel = connectionKindLabels[connection.kind]
  const statusLabel = connectionStatusLabels[connection.status]
  const sourceTitle = source?.title ?? connection.sourceNodeId
  const targetTitle = target?.title ?? connection.targetNodeId

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
    conditionSummary: runtime.conditionSummary,
    delaySummary: runtime.delaySummary,
    retrySummary: runtime.retrySummary,
    errorRouteSummary: runtime.errorRouteSummary,
    health: runtime.health,
    healthLabel: runtime.healthLabel,
    runtimeState: runtime.state,
    runtimeLabel: runtime.stateLabel,
    sourceRuntimeStatus: runtime.sourceStepStatus,
    targetRuntimeStatus: runtime.targetStepStatus,
    observedRouteSummary: runtime.routeSummary,
    runtimeEvidenceCount: runtime.evidenceCount,
    traceRunId: runtime.traceRunId,
    traceSource: runtime.traceSource,
    recommendedAction: runtime.recommendedAction,
    safeCopySummary: [
      `edge: ${connection.id}`,
      `from: ${sourceTitle}`,
      `to: ${targetTitle}`,
      `flow: ${flowTypeLabel}`,
      `status: ${statusLabel}`,
      `carries: ${carriesSummary}`,
      `runtime: ${runtime.stateLabel} / ${runtime.routeSummary}`,
      ...summarizeConnectionRuntimePolicy(connection).safeCopyLines,
      `source: ${runtime.sourceStepStatus}`,
      `target: ${runtime.targetStepStatus}`,
      `health: ${runtime.healthLabel}`,
      `evidence: ${runtime.evidenceCount}`,
      `trace: ${runtime.traceRunId ?? 'none'} / ${runtime.traceSource}`,
      `next: ${runtime.recommendedAction}`,
    ].join('\n'),
  }
}

function buildEdgeRuntimeSemantics(options: {
  connection: WorkflowConnection
  executionGraph: ExecutionGraph | null
  runTrace: RunTrace | null
  validation?: ConnectionValidationSummary
}): EdgeRuntimeSemantics {
  const { connection, executionGraph, runTrace, validation } = options
  const policySummary = summarizeConnectionRuntimePolicy(connection)
  const sourceSteps = collectRuntimeSteps(connection.sourceNodeId, executionGraph, runTrace)
  const targetSteps = collectRuntimeSteps(connection.targetNodeId, executionGraph, runTrace)
  const latestSourceStep = sourceSteps[sourceSteps.length - 1] ?? null
  const latestTargetStep = targetSteps[targetSteps.length - 1] ?? null
  const observedRoutes =
    executionGraph?.routes.filter((route) => routeMatchesConnection(route, connection)) ?? []
  const observedRouteKinds = uniqueRouteKinds(observedRoutes.map((route) => route.kind))
  const observedDurationMs = [latestSourceStep?.durationMs, latestTargetStep?.durationMs]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .reduce((total, value) => total + value, 0)
  const estimatedLatencyMs = connection.metrics?.latencyMs ?? 0
  const evidenceCount =
    sourceSteps.reduce((total, step) => total + step.evidenceCount, 0) +
    targetSteps.reduce((total, step) => total + step.evidenceCount, 0)
  const retryCandidateCount =
    runTrace?.retryCandidateStepIds.filter((stepId) =>
      sourceSteps.some((step) => step.id === stepId) ||
      targetSteps.some((step) => step.id === stepId),
    ).length ?? 0
  const retryRouteCount =
    observedRoutes.filter((route) => route.kind === 'retry').length +
    sourceSteps.filter((step) => step.route === 'retry').length +
    targetSteps.filter((step) => step.route === 'retry').length
  const errorRouteCount =
    observedRoutes.filter((route) => route.kind === 'error').length +
    sourceSteps.filter((step) => step.status === 'failed').length +
    targetSteps.filter((step) => step.status === 'failed').length
  const reviewRouteCount =
    observedRoutes.filter((route) => route.kind === 'review').length +
    sourceSteps.filter((step) => step.status === 'review_required').length +
    targetSteps.filter((step) => step.status === 'review_required').length
  const validationBlocked = validation?.valid === false
  const staticBlocked = connection.status === 'failed' || connection.status === 'invalid'
  const runtimeFailed =
    latestSourceStep?.status === 'failed' ||
    latestTargetStep?.status === 'failed' ||
    errorRouteCount > 0
  const runtimeActive =
    connection.status === 'active' ||
    latestSourceStep?.status === 'running' ||
    latestTargetStep?.status === 'running'
  const runtimeObserved =
    observedRoutes.length > 0 ||
    connection.status === 'success' ||
    (latestSourceStep?.status === 'success' && latestTargetStep?.status === 'success')
  const runtimeReady =
    latestSourceStep?.status === 'success' &&
    (latestTargetStep?.status === 'queued' || latestTargetStep?.status === 'running')
  const state: EdgeRuntimeState =
    validationBlocked || staticBlocked || runtimeFailed
      ? 'blocked'
      : runtimeActive
        ? 'active'
        : runtimeObserved
          ? 'observed'
          : runtimeReady
            ? 'ready'
            : runTrace?.source === 'run-history'
              ? 'stale'
              : 'idle'
  const health: EdgeRuntimeHealth =
    state === 'blocked'
      ? 'blocked'
      : connection.status === 'throttled' ||
          retryRouteCount > 0 ||
          retryCandidateCount > 0 ||
          reviewRouteCount > 0 ||
          connection.kind === 'retry' ||
          estimatedLatencyMs >= 220 ||
          state === 'stale'
        ? 'watch'
        : 'healthy'
  const stateLabels: Record<EdgeRuntimeState, string> = {
    idle: 'No runtime route',
    ready: 'Ready path',
    active: 'Live path',
    observed: 'Observed path',
    blocked: 'Blocked path',
    stale: 'Audit snapshot',
  }
  const healthLabels: Record<EdgeRuntimeHealth, string> = {
    healthy: 'Healthy',
    watch: 'Watch',
    blocked: 'Blocked',
  }
  const routeSummary =
    observedRouteKinds.length > 0
      ? observedRouteKinds.map((kind) => routeKindLabels[kind]).join(', ')
      : state === 'stale'
        ? 'step evidence only'
        : 'not observed'
  const delaySummary =
    connection.runtimePolicy?.delayMs !== undefined
      ? policySummary.delaySummary
      : observedDurationMs > 0
      ? `observed ${observedDurationMs} ms`
      : estimatedLatencyMs > 0
        ? `estimate ${estimatedLatencyMs} ms`
        : runtimeActive
          ? 'runtime timing pending'
          : 'no delay sample'
  const retrySummary =
    connection.runtimePolicy?.retry
      ? policySummary.retrySummary
      : retryRouteCount > 0
      ? `runtime retry observed (${retryRouteCount})`
      : retryCandidateCount > 0
        ? `${retryCandidateCount} retry candidate(s)`
        : connection.kind === 'retry'
          ? 'retry branch configured'
          : 'no runtime retry'
  const errorRouteSummary =
    connection.runtimePolicy?.errorRoute
      ? policySummary.errorRouteSummary
      : errorRouteCount > 0
      ? `runtime error path observed (${errorRouteCount})`
      : connection.kind === 'error'
        ? 'error branch configured'
        : 'no runtime error route'
  const conditionSummary =
    connection.runtimePolicy?.condition
      ? policySummary.conditionSummary
      : observedRouteKinds.length > 0
      ? `runtime ${routeSummary}`
      : ['decision', 'approval', 'error', 'retry'].includes(connection.kind)
        ? `${connectionKindLabels[connection.kind]} branch configured`
        : 'no branch condition'
  const recommendedAction =
    state === 'blocked'
      ? validation?.reason ?? 'Inspect the source and target runtime steps before the next run.'
      : state === 'active'
        ? 'Watch the target step and confirm the observed route matches the expected branch.'
        : health === 'watch'
          ? 'Review retry / error / approval semantics before promoting this path.'
          : state === 'stale'
            ? 'Run again to refresh this edge with live route evidence.'
            : state === 'observed'
              ? 'Compare the target output with downstream expectations.'
              : 'Run the workflow to collect route evidence for this edge.'

  return {
    connectionId: connection.id,
    state,
    stateLabel: stateLabels[state],
    health,
    healthLabel: healthLabels[health],
    sourceStepStatus: formatRuntimeStepStatus(latestSourceStep),
    targetStepStatus: formatRuntimeStepStatus(latestTargetStep),
    routeSummary,
    observedRouteKinds,
    evidenceCount,
    traceRunId: runTrace?.runId ?? executionGraph?.runId ?? null,
    traceSource: runTrace?.source ?? 'none',
    delaySummary,
    retrySummary,
    errorRouteSummary,
    conditionSummary,
    recommendedAction,
    className: [
      `edge-runtime-${state}`,
      `edge-runtime-health-${health}`,
      ...observedRouteKinds.map((kind) => `edge-runtime-route-${kind}`),
    ].join(' '),
  }
}

function collectRuntimeSteps(
  nodeId: string,
  executionGraph: ExecutionGraph | null,
  runTrace: RunTrace | null,
): EdgeRuntimeStep[] {
  const traceEvidenceCountByStepId = new Map(
    runTrace?.steps.map((step) => [step.id, step.evidence.length]) ?? [],
  )
  const graphSteps =
    executionGraph?.steps
      .filter((step) => step.nodeId === nodeId)
      .map((step) => ({
        id: step.id,
        nodeId: step.nodeId,
        status: step.status,
        route: step.route,
        durationMs: step.durationMs,
        evidenceCount: traceEvidenceCountByStepId.get(step.id) ?? 0,
      })) ?? []

  if (graphSteps.length > 0) {
    return graphSteps
  }

  return runTrace?.steps
    .filter((step) => step.nodeId === nodeId)
    .map((step) => ({
      id: step.id,
      nodeId: step.nodeId,
      status: step.status,
      route: step.route,
      durationMs: step.durationMs,
      evidenceCount: step.evidence.length,
    })) ?? []
}

function routeMatchesConnection(
  route: NonNullable<ExecutionGraph['routes']>[number],
  connection: WorkflowConnection,
): boolean {
  if (route.fromNodeId !== connection.sourceNodeId) {
    return false
  }

  if (route.toNodeId === connection.targetNodeId) {
    return true
  }

  if (!route.toNodeId && (connection.kind === 'error' || connection.kind === 'retry')) {
    return true
  }

  if (
    connection.sourceNodeId === connection.targetNodeId &&
    route.toNodeId === connection.sourceNodeId
  ) {
    return true
  }

  return false
}

function uniqueRouteKinds(kinds: ExecutionRouteKind[]): ExecutionRouteKind[] {
  return kinds.filter((kind, index, array) => array.indexOf(kind) === index)
}

function formatRuntimeStepStatus(step: EdgeRuntimeStep | null): string {
  if (!step) {
    return 'not observed'
  }
  return `${executionStepStatusLabels[step.status]} / ${routeKindLabels[step.route]}`
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

export function buildSemanticFocusPathView(options: {
  workflow: Workflow
  hudSnapshot: HudSnapshot
  executionGraph: ExecutionGraph | null
  connectionValidation?: readonly ConnectionValidationSummary[]
  runTrace?: RunTrace | null
  evaluation?: EvaluationResult
  humanReview?: HumanReviewState
}): SemanticFocusPathView | null {
  const {
    workflow,
    hudSnapshot,
    executionGraph,
    connectionValidation = [],
    runTrace = null,
    evaluation,
    humanReview,
  } = options

  const hasCurrentFailure =
    workflow.status === 'failed' ||
    workflow.nodes.some((node) => node.status === 'failed' || node.status === 'blocked') ||
    Boolean(executionGraph?.failedStepId)
  const failedStep = hasCurrentFailure
    ? findTraceStep(runTrace, 'failed') ?? findExecutionGraphStep(executionGraph, executionGraph?.failedStepId)
    : null
  const failedNode =
    failedStep ? workflow.nodes.find((node) => node.id === failedStep.nodeId) : workflow.nodes.find((node) => node.status === 'failed')
  if (failedNode) {
    const evidenceSummary = failedStep && 'evidence' in failedStep ? pickStepEvidenceSummary(failedStep) : null
    return createSemanticFocusPath({
      workflow,
      executionGraph,
      source: 'failure',
      priority: 'critical',
      alertLevel: 5,
      title: `Failure focus: ${failedNode.title}`,
      summary: evidenceSummary ?? 'A failed node or failed run step needs attention before the next run.',
      nextAction: 'Open the failed node, inspect the latest step evidence, then retry or route to the error path.',
      primaryNodeIds: [failedNode.id],
      seedConnectionIds: pickRouteConnectionIds(workflow, failedNode.id, ['error', 'retry']),
      evidenceCount: failedStep && 'evidence' in failedStep ? failedStep.evidence.length : 0,
    })
  }

  const humanReviewPending =
    humanReview?.decision === 'pending' ||
    humanReview?.decision === 'revise_requested' ||
    evaluation?.status === 'needs_review'
  const hasCurrentReview =
    workflow.status === 'review_required' ||
    workflow.nodes.some((node) => node.status === 'review_required') ||
    Boolean(executionGraph?.reviewStepId) ||
    humanReviewPending
  const reviewStep = hasCurrentReview
    ? findTraceStep(runTrace, 'review_required') ??
      findExecutionGraphStep(executionGraph, executionGraph?.reviewStepId) ??
      executionGraph?.steps.find((step) => step.status === 'review_required') ??
      null
    : null
  const reviewNode =
    reviewStep ? workflow.nodes.find((node) => node.id === reviewStep.nodeId) : workflow.nodes.find((node) => node.status === 'review_required')
  if (reviewNode || humanReviewPending || workflow.status === 'review_required') {
    const primaryNode = reviewNode ?? workflow.nodes.find((node) => node.category === 'check' || node.category === 'safety') ?? workflow.nodes[0]
    if (primaryNode) {
      return createSemanticFocusPath({
        workflow,
        executionGraph,
        source: 'approval',
        priority: 'critical',
        alertLevel: 4,
        title: `Approval focus: ${primaryNode.title}`,
        summary: 'A human review or approval gate is waiting for a decision.',
        nextAction: 'Review the approval context, then approve, request revision, or skip from the console review controls.',
        primaryNodeIds: [primaryNode.id],
        seedConnectionIds: pickRouteConnectionIds(workflow, primaryNode.id, ['approval', 'decision']),
        evidenceCount: reviewStep && 'evidence' in reviewStep ? reviewStep.evidence.length : 0,
      })
    }
  }

  const invalidConnections = connectionValidation.filter(
    (item) => item.connectionId && !item.valid,
  )
  if (invalidConnections.length > 0) {
    const firstInvalidConnectionId = invalidConnections[0].connectionId
    const invalidConnection = workflow.connections.find(
      (connection) => connection.id === firstInvalidConnectionId,
    )
    if (invalidConnection) {
      return createSemanticFocusPath({
        workflow,
        executionGraph,
        source: 'validation',
        priority: invalidConnections.some((item) => item.severity === 'error') ? 'alert' : 'watch',
        alertLevel: invalidConnections.some((item) => item.severity === 'error') ? 3 : 2,
        title: 'Validation focus: connection mismatch',
        summary: truncateText(
          invalidConnections[0].reason ?? 'A connection does not satisfy port or data type validation.',
          PREVIEW_MAX_LENGTH,
        ),
        nextAction: 'Inspect the highlighted edge and reconnect compatible ports before running.',
        primaryNodeIds: [invalidConnection.sourceNodeId, invalidConnection.targetNodeId],
        seedConnectionIds: invalidConnections
          .map((item) => item.connectionId)
          .filter((id): id is string => typeof id === 'string'),
        evidenceCount: invalidConnections.length,
      })
    }
  }

  const hasCurrentRetry =
    workflow.nodes.some((node) => node.status === 'retry_ready') ||
    (executionGraph?.retryCandidates.length ?? 0) > 0
  const retryStep = hasCurrentRetry
    ? runTrace?.steps.find((step) => runTrace.retryCandidateStepIds.includes(step.id)) ??
      executionGraph?.steps.find((step) => executionGraph.retryCandidates.includes(step.id)) ??
      null
    : null
  const retryNode =
    retryStep ? workflow.nodes.find((node) => node.id === retryStep.nodeId) : workflow.nodes.find((node) => node.status === 'retry_ready')
  if (retryNode) {
    return createSemanticFocusPath({
      workflow,
      executionGraph,
      source: 'retry',
      priority: 'alert',
      alertLevel: 3,
      title: `Retry focus: ${retryNode.title}`,
      summary: 'A retry-ready step is available and should be checked before continuing.',
      nextAction: 'Open the retry route, confirm the failure cause is recoverable, then retry the step.',
      primaryNodeIds: [retryNode.id],
      seedConnectionIds: pickRouteConnectionIds(workflow, retryNode.id, ['retry', 'error']),
      evidenceCount: retryStep && 'evidence' in retryStep ? retryStep.evidence.length : 0,
    })
  }

  const hasCurrentRunning =
    workflow.status === 'running' ||
    workflow.nodes.some((node) => node.status === 'running') ||
    Boolean(executionGraph?.activeStepId)
  const runningStep = hasCurrentRunning
    ? findTraceStep(runTrace, 'running') ??
      findExecutionGraphStep(executionGraph, executionGraph?.activeStepId) ??
      executionGraph?.steps.find((step) => step.status === 'running') ??
      null
    : null
  const runningNode =
    runningStep ? workflow.nodes.find((node) => node.id === runningStep.nodeId) : workflow.nodes.find((node) => node.status === 'running')
  if (runningNode) {
    return createSemanticFocusPath({
      workflow,
      executionGraph,
      source: 'running',
      priority: 'watch',
      alertLevel: 2,
      title: `Running focus: ${runningNode.title}`,
      summary: 'The active step is highlighted with its immediate downstream path.',
      nextAction: 'Watch the active step finish, then inspect any generated output or review gate.',
      primaryNodeIds: [runningNode.id],
      seedConnectionIds: pickRouteConnectionIds(workflow, runningNode.id, ['data', 'result', 'decision']),
      evidenceCount: runningStep && 'evidence' in runningStep ? runningStep.evidence.length : 0,
    })
  }

  if (workflow.metrics.bottleneckNodeId) {
    const bottleneckNode = workflow.nodes.find((node) => node.id === workflow.metrics.bottleneckNodeId)
    if (bottleneckNode) {
      return createSemanticFocusPath({
        workflow,
        executionGraph,
        source: 'bottleneck',
        priority: 'alert',
        alertLevel: 3,
        title: `Bottleneck focus: ${bottleneckNode.title}`,
        summary: 'Runtime metrics point to this node as the current bottleneck.',
        nextAction: 'Review latency, retry count, and upstream input volume for this node.',
        primaryNodeIds: [bottleneckNode.id],
        seedConnectionIds: pickRouteConnectionIds(workflow, bottleneckNode.id, ['data', 'result']),
        evidenceCount: 1,
      })
    }
  }

  const signalNodeId = resolveHudSignalNodeId(workflow, executionGraph, hudSnapshot)
  if (signalNodeId && hudSnapshot.priority !== 'normal') {
    const signalNode = workflow.nodes.find((node) => node.id === signalNodeId)
    if (signalNode) {
      return createSemanticFocusPath({
        workflow,
        executionGraph,
        source: 'hud-signal',
        priority: hudSnapshot.priority,
        alertLevel: hudSnapshot.alertLevel,
        title: `HUD focus: ${signalNode.title}`,
        summary: hudSnapshot.summary,
        nextAction: hudSnapshot.recommendedAction,
        primaryNodeIds: [signalNode.id],
        seedConnectionIds: pickRouteConnectionIds(workflow, signalNode.id, ['data', 'result', 'decision']),
        evidenceCount: hudSnapshot.signals.length,
      })
    }
  }

  return null
}

export function buildCentralHudView(options: {
  hudSnapshot: HudSnapshot
  semanticFocusPath: SemanticFocusPathView | null
}): CentralHudView | null {
  const { hudSnapshot, semanticFocusPath } = options

  if (hudSnapshot.priority === 'normal' && !semanticFocusPath) {
    return null
  }

  const variant = resolveCentralHudVariant(hudSnapshot, semanticFocusPath)
  const sourceLabel = semanticFocusPath ? semanticFocusSourceLabels[semanticFocusPath.source] : 'HUD signal'
  const semanticFocusLabel = semanticFocusPath
    ? semanticFocusPath.title.replace(/^[^:]+:\s*/, '') || semanticFocusPath.primaryNodeId
    : null

  return {
    variant,
    priority: semanticFocusPath?.priority ?? hudSnapshot.priority,
    alertLevel: semanticFocusPath?.alertLevel ?? hudSnapshot.alertLevel,
    headline: semanticFocusPath?.title ?? hudSnapshot.summary,
    detail: semanticFocusPath?.summary ?? hudSnapshot.signals[0]?.detail ?? hudSnapshot.summary,
    nextAction: semanticFocusPath?.nextAction ?? hudSnapshot.recommendedAction,
    focusLabel: semanticFocusLabel ?? hudSnapshot.focusTargetLabel,
    sourceLabel,
    signalCount: semanticFocusPath?.evidenceCount ?? hudSnapshot.signals.length,
  }
}

export function buildHudDensityView(mode: HudDensityMode): HudDensityView {
  const views: Record<HudDensityMode, HudDensityView> = {
    quiet: {
      mode: 'quiet',
      label: 'Quiet',
      shortLabel: 'Q',
      description: '常時表示を最小化し、critical と現在フォーカスだけを優先します。',
      className: 'hud-density-quiet',
      signalLimit: 2,
      historyLimit: 3,
      dangerVisibility: 'critical-only',
      dangerVisibilityLabel: 'Critical only',
      collapsePolicy: '通常時は圧縮、L4 以上のみ展開候補にします。',
    },
    balanced: {
      mode: 'balanced',
      label: 'Balanced',
      shortLabel: 'B',
      description: '通知、履歴、選択 HUD の密度を標準にします。',
      className: 'hud-density-balanced',
      signalLimit: 4,
      historyLimit: 5,
      dangerVisibility: 'attention',
      dangerVisibilityLabel: 'Attention',
      collapsePolicy: 'L2 以上と直近履歴をまとめ、詳細は on-demand に逃がします。',
    },
    deep: {
      mode: 'deep',
      label: 'Deep',
      shortLabel: 'D',
      description: '監査と診断向けに通知と履歴を多めに表示します。',
      className: 'hud-density-deep',
      signalLimit: 8,
      historyLimit: 8,
      dangerVisibility: 'all',
      dangerVisibilityLabel: 'All levels',
      collapsePolicy: '低優先度も表示し、履歴と evidence count を濃く見せます。',
    },
  }

  return views[mode]
}

export function getNextHudDensityMode(mode: HudDensityMode): HudDensityMode {
  switch (mode) {
    case 'quiet':
      return 'balanced'
    case 'balanced':
      return 'deep'
    case 'deep':
      return 'quiet'
  }
}

export function buildHudNotificationBundle(options: {
  hudSnapshot: HudSnapshot
  centralHudView: CentralHudView | null
  runTrace?: RunTrace | null
  runHistoryRecords?: readonly WorkflowRunRecord[]
  densityMode?: HudDensityMode
}): HudNotificationBundleView {
  const {
    hudSnapshot,
    centralHudView,
    runTrace = null,
    runHistoryRecords = [],
    densityMode = 'balanced',
  } = options
  const density = buildHudDensityView(densityMode)
  const centralItem = centralHudView
    ? [{
        id: `central:${centralHudView.variant}:${centralHudView.headline}`,
        tone: centralHudView.priority,
        alertLevel: centralHudView.alertLevel,
        title: sanitizeHudText(centralHudView.headline),
        detail: sanitizeHudText(centralHudView.nextAction),
        sourceLabel: centralHudView.sourceLabel,
        targetType: hudSnapshot.focusTargetType,
        targetId: hudSnapshot.focusTargetId,
        targetLabel: sanitizeOptionalHudText(centralHudView.focusLabel ?? hudSnapshot.focusTargetLabel),
      } satisfies HudNotificationItem]
    : []
  const signalItems = hudSnapshot.signals.map((signal) => ({
    id: signal.id,
    tone: signal.priority,
    alertLevel: signal.alertLevel,
    title: sanitizeHudText(signal.title),
    detail: sanitizeHudText(signal.detail),
    sourceLabel: hudSignalKindLabels[signal.kind],
    targetType: signal.targetType,
    targetId: signal.targetId,
    targetLabel: sanitizeOptionalHudText(signal.targetLabel),
  } satisfies HudNotificationItem))
  const safetyItems = (runTrace?.safetyWarnings ?? []).slice(0, 2).map((warning, index) => ({
    id: `trace-safety:${index}`,
    tone: 'watch',
    alertLevel: 2 as HudAlertLevel,
    title: 'Trace safety filter',
    detail: sanitizeHudText(warning),
    sourceLabel: runTrace?.source === 'run-history' ? 'Audit snapshot' : 'Current trace',
    targetType: 'storage' as HudFocusTargetType,
    targetId: runTrace?.runId ?? null,
    targetLabel: 'Run trace',
  } satisfies HudNotificationItem))
  const allNotifications = uniqueHudNotifications([
    ...centralItem,
    ...signalItems,
    ...safetyItems,
  ])
  const notificationItems = allNotifications.slice(0, density.signalLimit)
  const historyRecords = [...runHistoryRecords].reverse()
  const historyEntries = historyRecords
    .slice(0, density.historyLimit)
    .map(buildHudHistoryEntry)
  const latestRecord = historyRecords[0]
  const totalEvidenceCount =
    (runTrace?.steps.reduce((sum, step) => sum + step.evidence.length, 0) ?? 0) +
    (runTrace?.runEvidence.length ?? 0)
  const latestRunSummary = latestRecord
    ? `${formatRunStatusLabel(latestRecord.status)} / ${formatRunModeLabel(latestRecord.mode)} / ${formatDuration(latestRecord.durationMs)}`
    : '実行履歴なし'
  const evidenceSummary = runTrace
    ? `${runTrace.source === 'run-history' ? 'audit' : 'trace'} ${runTrace.auditEventCount ?? totalEvidenceCount} events / evidence ${totalEvidenceCount}`
    : 'trace なし'
  const headline = sanitizeHudText(centralHudView?.headline ?? hudSnapshot.summary)
  const statusLine = [
    `L${hudSnapshot.alertLevel} ${hudPriorityLabels[hudSnapshot.priority]}`,
    `signals ${hudSnapshot.signals.length}`,
    evidenceSummary,
  ].join(' / ')

  return {
    density,
    headline,
    statusLine,
    notificationItems,
    hiddenNotificationCount: Math.max(0, allNotifications.length - notificationItems.length),
    historyEntries,
    hiddenHistoryCount: Math.max(0, historyRecords.length - historyEntries.length),
    latestRunSummary,
    evidenceSummary,
    safeCopySummary: [
      `HUD: ${headline}`,
      statusLine,
      `density: ${density.label}`,
      `danger visibility: ${density.dangerVisibilityLabel}`,
      `collapse policy: ${density.collapsePolicy}`,
      `latest run: ${latestRunSummary}`,
      ...notificationItems.map((item) => `signal: L${item.alertLevel} ${item.title} - ${item.detail}`),
      ...historyEntries.map((entry) => `history: ${entry.runId} ${entry.statusLabel} ${entry.summary}`),
    ].join('\n'),
  }
}

// ---- Internal ----

const semanticFocusSourceLabels: Record<SemanticFocusSource, string> = {
  failure: 'Failure cause',
  approval: 'Approval gate',
  validation: 'Validation',
  retry: 'Retry route',
  running: 'Active run',
  bottleneck: 'Bottleneck',
  'hud-signal': 'HUD signal',
}

function resolveCentralHudVariant(
  hudSnapshot: HudSnapshot,
  semanticFocusPath: SemanticFocusPathView | null,
): CentralHudVariant {
  if (semanticFocusPath?.source === 'failure') return 'failure'
  if (semanticFocusPath?.source === 'approval') return 'approval'
  if (semanticFocusPath?.source === 'validation') return 'validation'
  if (hudSnapshot.signals[0]?.kind === 'node_failure') return 'failure'
  if (hudSnapshot.signals[0]?.kind === 'review_required') return 'approval'
  if (hudSnapshot.priority === 'critical') return 'danger'
  return 'watch'
}

function findExecutionGraphStep(
  executionGraph: ExecutionGraph | null,
  stepId: string | undefined,
) {
  if (!executionGraph || !stepId) {
    return null
  }
  return executionGraph.steps.find((step) => step.id === stepId) ?? null
}

function findTraceStep(
  runTrace: RunTrace | null,
  status: RunStep['status'],
): RunStep | null {
  if (!runTrace) {
    return null
  }

  const exact = runTrace.steps.find((step) => step.status === status)
  if (exact) {
    return exact
  }

  if (status !== 'failed') {
    return null
  }

  return (
    runTrace.steps.find((step) =>
      step.evidence.some((evidence) => evidence.severity === 'error'),
    ) ?? null
  )
}

function pickStepEvidenceSummary(step: RunStep): string | null {
  const evidence =
    step.evidence.find((entry) => entry.severity === 'error') ??
    step.evidence.find((entry) => entry.severity === 'warn') ??
    step.evidence[0]

  return evidence?.summary ?? null
}

function pickRouteConnectionIds(
  workflow: Workflow,
  nodeId: string,
  preferredKinds: readonly ConnectionKind[],
): string[] {
  const preferred = workflow.connections.filter(
    (connection) =>
      (connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId) &&
      preferredKinds.includes(connection.kind),
  )
  const fallback = workflow.connections.filter(
    (connection) => connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId,
  )
  return [...preferred, ...fallback]
    .map((connection) => connection.id)
    .filter(uniqueString)
    .slice(0, SEMANTIC_FOCUS_MAX_CONNECTIONS)
}

function resolveHudSignalNodeId(
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
  hudSnapshot: HudSnapshot,
): string | null {
  if (hudSnapshot.focusTargetType === 'node') {
    return workflow.nodes.some((node) => node.id === hudSnapshot.focusTargetId)
      ? hudSnapshot.focusTargetId
      : null
  }

  if (hudSnapshot.focusTargetType === 'step' && executionGraph) {
    const step = executionGraph.steps.find((item) => item.id === hudSnapshot.focusTargetId)
    return step?.nodeId ?? null
  }

  return null
}

function createSemanticFocusPath(options: {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  source: SemanticFocusSource
  priority: HudPriority
  alertLevel: HudAlertLevel
  title: string
  summary: string
  nextAction: string
  primaryNodeIds: string[]
  seedConnectionIds: string[]
  evidenceCount: number
}): SemanticFocusPathView {
  const {
    workflow,
    executionGraph,
    source,
    priority,
    alertLevel,
    title,
    summary,
    nextAction,
    primaryNodeIds,
    seedConnectionIds,
    evidenceCount,
  } = options
  const workflowNodeIds = new Set(workflow.nodes.map((node) => node.id))
  const nodeIds = new Set(primaryNodeIds.filter((id) => workflowNodeIds.has(id)))
  const connectionIds = new Set<string>()

  const addConnection = (connection: WorkflowConnection) => {
    connectionIds.add(connection.id)
    if (workflowNodeIds.has(connection.sourceNodeId)) nodeIds.add(connection.sourceNodeId)
    if (workflowNodeIds.has(connection.targetNodeId)) nodeIds.add(connection.targetNodeId)
  }

  for (const connectionId of seedConnectionIds) {
    const connection = workflow.connections.find((item) => item.id === connectionId)
    if (connection) {
      addConnection(connection)
    }
  }

  for (const primaryNodeId of primaryNodeIds) {
    const incoming = workflow.connections.filter((connection) => connection.targetNodeId === primaryNodeId)
    const outgoing = workflow.connections.filter((connection) => connection.sourceNodeId === primaryNodeId)
    const importantOutgoing = outgoing.filter((connection) =>
      ['error', 'retry', 'approval', 'decision', 'evidence', 'result'].includes(connection.kind),
    )

    for (const connection of incoming.slice(0, 3)) {
      addConnection(connection)
    }
    for (const connection of (importantOutgoing.length > 0 ? importantOutgoing : outgoing).slice(0, 3)) {
      addConnection(connection)
    }
  }

  if (executionGraph) {
    for (const route of executionGraph.routes) {
      if (!nodeIds.has(route.fromNodeId) && (!route.toNodeId || !nodeIds.has(route.toNodeId))) {
        continue
      }
      if (workflowNodeIds.has(route.fromNodeId)) nodeIds.add(route.fromNodeId)
      if (route.toNodeId && workflowNodeIds.has(route.toNodeId)) nodeIds.add(route.toNodeId)
      const routeConnection = workflow.connections.find(
        (connection) =>
          connection.sourceNodeId === route.fromNodeId &&
          (!route.toNodeId || connection.targetNodeId === route.toNodeId),
      )
      if (routeConnection) {
        addConnection(routeConnection)
      }
    }
  }

  const orderedPrimaryNodeId = primaryNodeIds.find((id) => workflowNodeIds.has(id)) ?? null
  const orderedNodeIds = [
    ...primaryNodeIds.filter((id) => workflowNodeIds.has(id)),
    ...Array.from(nodeIds),
  ].filter(uniqueString).slice(0, SEMANTIC_FOCUS_MAX_NODES)

  return {
    id: `${source}:${orderedPrimaryNodeId ?? 'workflow'}`,
    source,
    priority,
    alertLevel,
    title,
    summary: truncateText(summary, PREVIEW_MAX_LENGTH),
    nextAction,
    primaryNodeId: orderedPrimaryNodeId,
    nodeIds: orderedNodeIds,
    connectionIds: Array.from(connectionIds).slice(0, SEMANTIC_FOCUS_MAX_CONNECTIONS),
    dimUnfocused: orderedNodeIds.length > 0,
    evidenceCount,
  }
}

function uniqueHudNotifications(items: HudNotificationItem[]): HudNotificationItem[] {
  const seen = new Set<string>()
  const result: HudNotificationItem[] = []

  for (const item of items) {
    const signature = `${item.title}:${item.targetType}:${item.targetId ?? 'none'}`
    if (seen.has(signature)) {
      continue
    }
    seen.add(signature)
    result.push(item)
  }

  return result
}

function buildHudHistoryEntry(record: WorkflowRunRecord): HudHistoryEntry {
  const evidenceCount = record.traceAudit?.events.length ?? 0
  const issueCount = record.errorCount + record.warningCount
  const statusLabel = formatRunStatusLabel(record.status)
  const modeLabel = formatRunModeLabel(record.mode)

  return {
    id: `history:${record.runId}`,
    runId: record.runId,
    title: sanitizeHudText(record.workflowTitle || record.workflowId),
    status: record.status,
    statusLabel,
    modeLabel,
    summary: [
      `${record.nodeCount} nodes`,
      `${record.connectionCount} edges`,
      `${record.logCount} logs`,
      issueCount > 0 ? `${issueCount} issues` : 'no issues',
    ].join(' / '),
    startedAtLabel: formatTimestampCompact(record.startedAt),
    durationLabel: formatDuration(record.durationMs),
    evidenceCount,
    issueCount,
  }
}

function formatRunStatusLabel(status: WorkflowRunStatus): string {
  switch (status) {
    case 'queued':
      return '待機列'
    case 'running':
      return '実行中'
    case 'success':
      return '成功'
    case 'failed':
      return '失敗'
    case 'cancelled':
      return 'キャンセル'
    case 'review_required':
      return '確認待ち'
  }
}

function formatRunModeLabel(mode: WorkflowRunRecord['mode']): string {
  switch (mode) {
    case 'validate':
      return 'Validate'
    case 'mock':
      return 'Mock'
    case 'dryRun':
      return 'Dry run'
    case 'partial':
      return 'Partial'
    case 'full':
      return 'Full'
    case 'replay':
      return 'Replay'
  }
}

function formatDuration(durationMs: number | undefined): string {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return 'duration n/a'
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`
  }
  return `${(durationMs / 1000).toFixed(1)} s`
}

function formatTimestampCompact(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return 'time n/a'
  }
  const date = new Date(timestamp)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

function uniqueString(value: string, index: number, array: string[]): boolean {
  return array.indexOf(value) === index
}

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

const SENSITIVE_HUD_TEXT_PATTERN =
  /\b(api[_ -]?key|bearer|credential|password|secret|token)\b|sk-[a-z0-9_-]+/gi

function sanitizeHudText(value: string, maxLength = PREVIEW_MAX_LENGTH): string {
  return truncateText(value, maxLength).replace(SENSITIVE_HUD_TEXT_PATTERN, '[redacted]')
}

function sanitizeOptionalHudText(value: string | null): string | null {
  return value ? sanitizeHudText(value) : null
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
