// ---- Node category vocabulary (Source Spec 準拠の英語内部キー) ----

export type NodeCategory =
  | 'trigger'    // 起点
  | 'input'      // 入力取得
  | 'transform'  // 整形・前処理
  | 'branch'     // 分岐・ルーティング
  | 'execute'    // 実行
  | 'check'      // 検査
  | 'aggregate'  // 集約
  | 'output'     // 出力
  | 'record'     // 記録
  | 'observe'    // 観測
  | 'improve'    // 改善
  | 'template'   // テンプレート
  | 'safety'     // 安全・権限
  | 'hud'        // 認知HUD

const nodeCategoryKeys: readonly NodeCategory[] = [
  'trigger', 'input', 'transform', 'branch', 'execute',
  'check', 'aggregate', 'output', 'record', 'observe',
  'improve', 'template', 'safety', 'hud',
]

const legacyCategoryMap: Record<string, NodeCategory> = {
  '開始': 'trigger',
  '入力': 'input',
  '変換': 'transform',
  '制御': 'branch',
  '実行': 'execute',
  '接続': 'execute',
  '品質': 'check',
  '回収': 'aggregate',
  '出力': 'output',
  '記録': 'record',
  'テンプレート': 'template',
  'その他': 'execute',
}

export function normalizeNodeCategory(raw: unknown): NodeCategory {
  if (typeof raw !== 'string') return 'execute'
  if ((nodeCategoryKeys as readonly string[]).includes(raw)) return raw as NodeCategory
  return legacyCategoryMap[raw] ?? 'execute'
}

// ---- Workflow schema version ----

export type WorkflowSchemaVersion = '1.0' | '1.1' | '2.0'

// ---- Port types ----

export type WorkflowPortDirection = 'input' | 'output'

export type WorkflowPort = {
  id: string
  label: string
  direction: WorkflowPortDirection
  dataType: WorkflowDataType
  required: boolean
  description?: string
}

export type WorkflowDataType =
  | 'Trigger'
  | 'Text'
  | 'URL'
  | 'File'
  | 'Markdown'
  | 'PDF'
  | 'Image'
  | 'Audio'
  | 'Issue'
  | 'PR'
  | 'Diff'
  | 'Post'
  | 'Email'
  | 'Prompt'
  | 'Context'
  | 'Result'
  | 'Evidence'
  | 'Decision'
  | 'Artifact'
  | 'Log'
  | 'Template'
  | 'Metric'
  | 'Error'
  | 'JSON'
  | 'Boolean'
  | 'Number'
  | 'DateTime'
  | 'Command'
  | 'Review'

export type WorkflowNodeStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'retry_ready'
  | 'skipped'
  | 'review_required'
  | 'blocked'
  | 'cancelled'

export type WorkflowStatus =
  | 'draft'
  | 'ready'
  | 'invalid'
  | 'running'
  | 'paused'
  | 'success'
  | 'failed'
  | 'review_required'
  | 'archived'
  | 'cancelled'

export type ConnectionKind =
  | 'data'
  | 'instruction'
  | 'result'
  | 'decision'
  | 'evidence'
  | 'log'
  | 'error'
  | 'retry'
  | 'approval'
  | 'resource'
  | 'template'
  | 'improvement'

export const connectionKinds = [
  'data',
  'instruction',
  'result',
  'decision',
  'evidence',
  'log',
  'error',
  'retry',
  'approval',
  'resource',
  'template',
  'improvement',
] as const satisfies ConnectionKind[]

export type ConnectionStatus =
  | 'inactive'
  | 'active'
  | 'success'
  | 'failed'
  | 'invalid'
  | 'throttled'

export type WorkflowConnectionConditionMode =
  | 'always'
  | 'on_success'
  | 'on_failure'
  | 'on_failed'
  | 'on_review'
  | 'on_review_required'
  | 'on_high_cost'
  | 'on_bottleneck'
  | 'on_validation_warning'
  | 'expression'

export type WorkflowConnectionCondition = {
  mode: WorkflowConnectionConditionMode
  label?: string
  expression?: string
}

export type WorkflowConnectionRetryPolicy = {
  enabled: boolean
  maxAttempts: number
  backoffMs: number
}

export type WorkflowConnectionErrorRoute = {
  enabled: boolean
  targetNodeId?: string
  label?: string
}

export type WorkflowConnectionRuntimePolicy = {
  condition?: WorkflowConnectionCondition
  retry?: WorkflowConnectionRetryPolicy
  delayMs?: number
  errorRoute?: WorkflowConnectionErrorRoute
}

export type AgentRole =
  | 'human'
  | 'dev_leader_ai'
  | 'sub_leader_ai'
  | 'programmer_ai'
  | 'designer_ai'
  | 'research_ai'
  | 'qa_ai'
  | 'security_ai'
  | 'recorder_ai'
  | 'lightwork_ai'

export type WorkflowNode = {
  id: string
  type: string
  title: string
  category: string
  description: string
  status: WorkflowNodeStatus
  agentRole?: AgentRole
  inputTypes: WorkflowDataType[]
  outputTypes: WorkflowDataType[]
  inputPorts?: WorkflowPort[]
  outputPorts?: WorkflowPort[]
  config: Record<string, unknown>
  position: { x: number; y: number }
  metrics?: {
    estimatedTokens?: number
    estimatedCost?: number
    estimatedLatencyMs?: number
    bottleneckScore?: number
    retryCount?: number
    errorCount?: number
  }
  lastRun?: {
    startedAt?: string
    finishedAt?: string
    result?: unknown
    error?: string
  }
}

export type WorkflowConnection = {
  id: string
  sourceNodeId: string
  sourcePort?: string
  sourcePortId?: string
  targetNodeId: string
  targetPort?: string
  targetPortId?: string
  kind: ConnectionKind
  carries: WorkflowDataType[]
  status: ConnectionStatus
  runtimePolicy?: WorkflowConnectionRuntimePolicy
  metrics?: {
    flowRate?: number
    tokens?: number
    latencyMs?: number
  }
}

export type WorkflowRunLog = {
  id: string
  runId: string
  timestamp: string
  nodeId?: string
  level: 'info' | 'warn' | 'error' | 'security' | 'approval' | 'metric'
  message: string
  payload?: unknown
}

export type WorkflowMetric = {
  tokens: number
  cost: number
  latencyMs: number
  successRate: number
  queueCount: number
  retryCount: number
  bottleneckNodeId: string | null
}

export type WorkflowArtifact = {
  title: string
  format: 'Markdown' | 'JSON' | 'Diff' | 'Preview'
  content: string
  status: 'draft' | 'checked' | 'review_required' | 'approved' | 'failed'
}

export type WorkflowTemplateMetadata = {
  tags: string[]
  category?: string
  nodeCount: number
  connectionCount: number
  sourceWorkflowId?: string
  sourceRunId?: string
  requiredPortCount: number
  unconnectedRequiredPortCount: number
  lastEvaluationStatus?: string
  lastEvaluationScore?: number
  artifactVersionCount?: number
  createdFromRunId?: string
  metricsSummary?: {
    tokens: number
    cost: number
    latencyMs: number
    successRate: number
    retryCount: number
    bottleneckNodeId: string | null
  }
  artifactSummary?: {
    title: string
    format: WorkflowArtifact['format']
    status: WorkflowArtifact['status']
    contentPreview: string
  }
}

export type Workflow = {
  id: string
  schemaVersion?: WorkflowSchemaVersion
  name: string
  description: string
  version: number
  status: WorkflowStatus
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  metrics: WorkflowMetric
  logs: WorkflowRunLog[]
  artifact: WorkflowArtifact
  createdAt: string
  updatedAt: string
}

// ---- Foundation state vocabulary ----
// These types are not yet used in the full UI but provide the shared vocabulary
// for durable run history, Cognitive HUD, Situation Assistant, and approval gates.

export type RunState = {
  runId: string
  status: WorkflowNodeStatus | WorkflowStatus
  startedAt?: string
  finishedAt?: string
  triggeredBy?: string
  mode?: 'all' | 'selected' | 'fromSelected' | 'dryRun' | 'validate'
}

export type RiskState = {
  level: 0 | 1 | 2 | 3 | 4 | 5
  reason?: string
  flaggedAt?: string
  resolvedAt?: string
}

export type HudState = {
  priority: 'normal' | 'watch' | 'alert' | 'critical'
  visible: boolean
  focused: boolean
  depth: 0 | 1 | 2 | 3
  alertLevel: RiskState['level']
}

export type ReviewState = {
  required: boolean
  reviewedBy?: string
  reviewedAt?: string
  decision?: 'approved' | 'rejected' | 'escalated' | 'skipped'
  reason?: string
}

export type ApprovalState = {
  gateId: string
  status: 'pending' | 'approved' | 'rejected' | 'bypassed'
  approvedBy?: string
  approvedAt?: string
  reason?: string
}

export { agentRoleLabels, statusLabels } from './displayLabels'
