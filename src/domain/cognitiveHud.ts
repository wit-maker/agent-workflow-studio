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
import type { ExecutionGraph } from './executionGraph'
import { canRetry } from './retryPolicy'
import type {
  HudState,
  RiskState,
  Workflow,
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

// ---- Tunables ----

const ELEVATED_RETRY_THRESHOLD = 2

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
