import type { ConnectorJob } from './connectorQueue'
import type { HumanReviewState } from './evaluation'
import { canRetry } from './retryPolicy'
import type { Workflow } from './workflow'

export type ConnectorPolicyKind =
  | 'trigger'
  | 'action'
  | 'adapter'
  | 'retry'
  | 'error_route'
  | 'human_review'
  | 'rate_limit'

export type ConnectorPolicyRailState = 'idle' | 'ready' | 'active' | 'gated' | 'attention'

export type ConnectorPolicyRailEntry = {
  kind: ConnectorPolicyKind
  identifier: string
  label: string
  fixedPolicy: string
  state: ConnectorPolicyRailState
  stateLabel: string
  count: number
  writeGateRequired: boolean
  safeSummary: string
}

export type ConnectorReviewGateState = 'idle' | 'waiting' | 'decided'

export type ConnectorPolicyRailProjection = {
  label: string
  priority: 'normal' | 'watch' | 'alert' | 'critical'
  alertLevel: 0 | 1 | 2 | 3 | 4 | 5
  entries: ConnectorPolicyRailEntry[]
  writeLikeNodeCount: number
  gatedWriteLikeJobCount: number
  reviewGateState: ConnectorReviewGateState
  reviewGateLabel: string
  reviewGateHint: string
  railSummary: string
  nextAction: string
  templateHistoryHint: string
  safeCopySummary: string
}

const TRIGGER_NODE_TYPES = new Set(['manual-trigger'])
const ADAPTER_NODE_TYPES = new Set(['external-connector'])
const WRITE_LIKE_NODE_TYPES = new Set(['output', 'template-save', 'run-log'])
const ACTION_NODE_TYPES = new Set(['ai-execute', ...WRITE_LIKE_NODE_TYPES])

export const connectorPolicyRailStateLabels: Record<ConnectorPolicyRailState, string> = {
  idle: '待機',
  ready: '準備完了',
  active: 'mock実行中',
  gated: 'Review gate',
  attention: '要注意',
}

export const connectorReviewGateStateLabels: Record<ConnectorReviewGateState, string> = {
  idle: 'gate 待機',
  waiting: 'gate 判断待ち',
  decided: 'gate 判断済み',
}

const FIXED_POLICIES: Record<ConnectorPolicyKind, { identifier: string; label: string; fixedPolicy: string }> = {
  trigger: {
    identifier: 'trigger',
    label: 'Trigger',
    fixedPolicy: 'Trigger は手動 Run のみ許可する固定 mock policy です。外部イベント受信は行いません。',
  },
  action: {
    identifier: 'action',
    label: 'Action',
    fixedPolicy: 'Action は read 系のみ自動実行し、write 系 mock action は Human Review Gate を必須とします。',
  },
  adapter: {
    identifier: 'adapter',
    label: 'Adapter',
    fixedPolicy: 'Adapter は mock 接続のみで、実 API 呼び出しと外部送信は行いません。',
  },
  retry: {
    identifier: 'retry',
    label: 'Retry',
    fixedPolicy: 'Retry は固定上限つきの手動再試行のみ許可します。自動の無限再試行は行いません。',
  },
  error_route: {
    identifier: 'error-route',
    label: 'Error Route',
    fixedPolicy: 'Error Route は失敗を safe metadata として迂回表示するだけで、raw payload は保持しません。',
  },
  human_review: {
    identifier: 'human-review',
    label: 'Human Review',
    fixedPolicy: 'Human Review は write 系 mock action の通過条件です。決定はセッション内のみで保持します。',
  },
  rate_limit: {
    identifier: 'rate-limit',
    label: 'Rate Limit',
    fixedPolicy: 'Rate Limit は placeholder のみで、外部 telemetry を使わず safe metadata から推定します。',
  },
}

function buildEntry(options: {
  kind: ConnectorPolicyKind
  state: ConnectorPolicyRailState
  count: number
  writeGateRequired: boolean
  detail: string
}): ConnectorPolicyRailEntry {
  const fixed = FIXED_POLICIES[options.kind]
  return {
    kind: options.kind,
    identifier: fixed.identifier,
    label: fixed.label,
    fixedPolicy: fixed.fixedPolicy,
    state: options.state,
    stateLabel: connectorPolicyRailStateLabels[options.state],
    count: options.count,
    writeGateRequired: options.writeGateRequired,
    safeSummary: `${fixed.label}: ${connectorPolicyRailStateLabels[options.state]} (${options.count}) ${options.detail}`,
  }
}

export function buildConnectorPolicyRailProjection(options: {
  workflow: Workflow
  connectorJobs?: readonly ConnectorJob[]
  humanReview?: HumanReviewState | null
}): ConnectorPolicyRailProjection {
  const { workflow, connectorJobs = [], humanReview = null } = options
  const nodeTypeById = new Map(workflow.nodes.map((node) => [node.id, node.type]))
  const jobNodeType = (job: ConnectorJob): string => nodeTypeById.get(job.nodeId) ?? 'unknown'

  const triggerNodeCount = workflow.nodes.filter((node) => TRIGGER_NODE_TYPES.has(node.type)).length
  const actionNodeCount = workflow.nodes.filter((node) => ACTION_NODE_TYPES.has(node.type)).length
  const adapterNodeCount = workflow.nodes.filter((node) => ADAPTER_NODE_TYPES.has(node.type)).length
  const writeLikeNodeCount = workflow.nodes.filter((node) => WRITE_LIKE_NODE_TYPES.has(node.type)).length

  const activeStatuses: ConnectorJob['status'][] = ['queued', 'running']
  const triggerActive = connectorJobs.some(
    (job) => TRIGGER_NODE_TYPES.has(jobNodeType(job)) && activeStatuses.includes(job.status),
  )
  const adapterActive = connectorJobs.some(
    (job) => ADAPTER_NODE_TYPES.has(jobNodeType(job)) && activeStatuses.includes(job.status),
  )
  const failedActionJobCount = connectorJobs.filter(
    (job) => ACTION_NODE_TYPES.has(jobNodeType(job)) && job.status === 'failed',
  ).length
  const gatedWriteLikeJobCount = connectorJobs.filter(
    (job) => WRITE_LIKE_NODE_TYPES.has(jobNodeType(job)) && job.status === 'review_required',
  ).length

  const failedJobCount = connectorJobs.filter((job) => job.status === 'failed').length
  const reviewRequiredJobCount = connectorJobs.filter((job) => job.status === 'review_required').length
  const retryReadyJobCount = connectorJobs.filter(
    (job) => job.status === 'failed' && canRetry(job.retryCount),
  ).length
  const rateLimitPlaceholderCount = connectorJobs.filter(
    (job) => job.status === 'running' && job.retryCount > 0,
  ).length
  const enabledErrorRouteCount = workflow.connections.filter(
    (connection) => connection.runtimePolicy?.errorRoute?.enabled === true,
  ).length

  const reviewGateState: ConnectorReviewGateState =
    reviewRequiredJobCount > 0 || (humanReview !== null && humanReview.decision === 'pending')
      ? 'waiting'
      : humanReview !== null && humanReview.decision !== 'pending'
        ? 'decided'
        : 'idle'

  const entries: ConnectorPolicyRailEntry[] = [
    buildEntry({
      kind: 'trigger',
      state: triggerActive ? 'active' : triggerNodeCount > 0 ? 'ready' : 'idle',
      count: triggerNodeCount,
      writeGateRequired: false,
      detail: '手動 Run のみ。',
    }),
    buildEntry({
      kind: 'action',
      state:
        failedActionJobCount > 0
          ? 'attention'
          : writeLikeNodeCount > 0
            ? 'gated'
            : actionNodeCount > 0
              ? 'ready'
              : 'idle',
      count: actionNodeCount,
      writeGateRequired: writeLikeNodeCount > 0,
      detail: `write 系 node ${writeLikeNodeCount} 件は gate 必須。`,
    }),
    buildEntry({
      kind: 'adapter',
      state: adapterActive ? 'active' : adapterNodeCount > 0 ? 'ready' : 'idle',
      count: adapterNodeCount,
      writeGateRequired: false,
      detail: 'mock 接続のみ。',
    }),
    buildEntry({
      kind: 'retry',
      state: retryReadyJobCount > 0 ? 'attention' : 'idle',
      count: retryReadyJobCount,
      writeGateRequired: false,
      detail: '固定上限つき手動再試行。',
    }),
    buildEntry({
      kind: 'error_route',
      state: failedJobCount > 0 ? 'attention' : enabledErrorRouteCount > 0 ? 'ready' : 'idle',
      count: failedJobCount > 0 ? failedJobCount : enabledErrorRouteCount,
      writeGateRequired: false,
      detail: 'safe metadata の迂回表示のみ。',
    }),
    buildEntry({
      kind: 'human_review',
      state:
        reviewGateState === 'waiting' ? 'gated' : reviewGateState === 'decided' ? 'ready' : 'idle',
      count: reviewRequiredJobCount,
      writeGateRequired: true,
      detail: connectorReviewGateStateLabels[reviewGateState],
    }),
    buildEntry({
      kind: 'rate_limit',
      state: rateLimitPlaceholderCount > 0 ? 'attention' : 'idle',
      count: rateLimitPlaceholderCount,
      writeGateRequired: false,
      detail: 'placeholder のみ。',
    }),
  ]

  const alertLevel: ConnectorPolicyRailProjection['alertLevel'] =
    failedJobCount > 0 || reviewGateState === 'waiting'
      ? 3
      : retryReadyJobCount > 0 || rateLimitPlaceholderCount > 0
        ? 2
        : triggerActive || adapterActive
          ? 1
          : 0
  const priority: ConnectorPolicyRailProjection['priority'] =
    alertLevel >= 3 ? 'alert' : alertLevel === 2 ? 'watch' : 'normal'
  const label =
    failedJobCount > 0
      ? 'Policy rail: error route'
      : reviewGateState === 'waiting'
        ? 'Policy rail: review gate'
        : triggerActive || adapterActive
          ? 'Policy rail: mock running'
          : 'Policy rail: fixed mock'

  const reviewGateLabel = connectorReviewGateStateLabels[reviewGateState]
  const reviewGateHint =
    reviewGateState === 'waiting'
      ? `Human Review Gate が確認待ち mock job を ${reviewRequiredJobCount} 件止めています(うち write 系 ${gatedWriteLikeJobCount} 件)。承認 / 差し戻し / スキップを判断してください。`
      : reviewGateState === 'decided'
        ? 'Human Review Gate の判断はセッション内のみで保持され、write 系 mock action の通過条件として扱います。'
        : 'write 系 mock action は Human Review Gate を通過してからのみ成功扱いになります。実行前でも gate は固定 policy です。'

  const railSummary = `mock connector policy rail: trigger ${triggerNodeCount} / action ${actionNodeCount} (write-gate ${writeLikeNodeCount}) / adapter ${adapterNodeCount} / retry-ready ${retryReadyJobCount} / error-route ${failedJobCount > 0 ? failedJobCount : enabledErrorRouteCount} / review ${reviewRequiredJobCount} / rate-limit ${rateLimitPlaceholderCount}`

  const nextAction =
    failedJobCount > 0
      ? 'Error Route の対象 job を確認し、Retry か Human Review への切り替えを判断してください。'
      : reviewGateState === 'waiting'
        ? 'Human Review Gate で承認、差し戻し、スキップを判断してください。'
        : rateLimitPlaceholderCount > 0
          ? 'Rate Limit placeholder の対象 job を確認し、詰まり候補として Run Detail と照合してください。'
          : 'Run を実行すると、固定 mock policy が Trigger から Human Review Gate まで順に安全確認できます。'

  const templateHistoryHint =
    failedJobCount > 0 || reviewGateState === 'waiting'
      ? 'policy rail の failure / review pattern は既存 history 境界に safe summary としてだけ残す候補です。'
      : '固定 policy を通過した成功 path は既存 template/history 境界で再利用候補にできます。'

  return {
    label,
    priority,
    alertLevel,
    entries,
    writeLikeNodeCount,
    gatedWriteLikeJobCount,
    reviewGateState,
    reviewGateLabel,
    reviewGateHint,
    railSummary,
    nextAction,
    templateHistoryHint,
    safeCopySummary: [
      `connector policy rail: ${label}`,
      railSummary,
      `review gate: ${reviewGateLabel}`,
      ...entries.map((entry) => entry.safeSummary),
      `next: ${nextAction}`,
    ].join('\n'),
  }
}

export function createEmptyConnectorPolicyRailProjection(): ConnectorPolicyRailProjection {
  return buildConnectorPolicyRailProjection({
    workflow: {
      id: 'empty',
      schemaVersion: '2.0',
      name: '',
      description: '',
      version: 1,
      status: 'draft',
      nodes: [],
      connections: [],
      metrics: {
        tokens: 0,
        cost: 0,
        latencyMs: 0,
        successRate: 0,
        queueCount: 0,
        retryCount: 0,
        bottleneckNodeId: null,
      },
      logs: [],
      artifact: {
        title: '',
        format: 'Markdown',
        content: '',
        status: 'draft',
      },
      createdAt: '',
      updatedAt: '',
    },
  })
}
