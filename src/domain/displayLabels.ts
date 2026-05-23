import type {
  AgentRole,
  ConnectionKind,
  ConnectionStatus,
  WorkflowArtifact,
  WorkflowDataType,
  WorkflowNodeStatus,
  WorkflowRunLog,
  WorkflowStatus,
} from './workflow'

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  draft: '下書き',
  ready: '準備完了',
  invalid: '不正',
  running: '実行中',
  paused: '一時停止',
  success: '成功',
  failed: '失敗',
  review_required: '確認待ち',
  archived: '保管済み',
}

export const statusLabels: Record<WorkflowNodeStatus, string> = {
  idle: '待機中',
  queued: '待機列',
  running: '実行中',
  success: '成功',
  failed: '失敗',
  skipped: 'スキップ',
  review_required: '確認待ち',
  blocked: '停止中',
}

export const agentRoleLabels: Record<AgentRole, string> = {
  human: '人間',
  dev_leader_ai: '開発リーダーAI',
  sub_leader_ai: 'サブリーダーAI',
  programmer_ai: '実装AI',
  designer_ai: 'デザインAI',
  research_ai: '調査AI',
  qa_ai: 'QA AI',
  security_ai: 'セキュリティAI',
  recorder_ai: '記録AI',
  lightwork_ai: '軽作業AI',
}

export const dataTypeLabels: Record<WorkflowDataType, string> = {
  Trigger: 'トリガー',
  Text: 'テキスト',
  URL: 'URL',
  File: 'ファイル',
  Markdown: 'Markdown',
  PDF: 'PDF',
  Image: '画像',
  Audio: '音声',
  Issue: 'Issue',
  PR: 'PR',
  Diff: '差分',
  Post: '投稿',
  Email: 'メール',
  Prompt: 'プロンプト',
  Context: 'コンテキスト',
  Result: '結果',
  Evidence: '証跡',
  Decision: '判断',
  Artifact: '成果物',
  Log: 'ログ',
  Template: 'テンプレート',
  Metric: 'メトリクス',
  Error: 'エラー',
  JSON: 'JSON',
  Boolean: '真偽値',
  Number: '数値',
  DateTime: '日時',
  Command: 'コマンド',
  Review: 'レビュー',
}

export const connectionKindLabels: Record<ConnectionKind, string> = {
  data: 'データ',
  instruction: '指示',
  result: '結果',
  decision: '判断',
  evidence: '証跡',
  log: 'ログ',
  error: 'エラー',
  retry: '再試行',
  approval: '承認',
  resource: 'リソース',
  template: 'テンプレート',
  improvement: '改善',
}

export const connectionStatusLabels: Record<ConnectionStatus, string> = {
  inactive: '未使用',
  active: '有効',
  success: '成功',
  failed: '失敗',
  invalid: '不正',
  throttled: '制限中',
}

export const artifactStatusLabels: Record<WorkflowArtifact['status'], string> = {
  draft: '下書き',
  checked: '確認済み',
  review_required: '確認待ち',
  approved: '承認済み',
  failed: '失敗',
}

export const checkOutcomeLabels = {
  PASS: 'PASS',
  REVIEW: '要確認',
  FAIL: 'FAIL',
} as const

export const metricLabels = {
  tokens: 'トークン',
  cost: 'コスト',
  latencyMs: 'レイテンシ',
  successRate: '成功率',
  retryCount: '再試行回数',
  bottleneck: 'ボトルネック',
  queueCount: 'キュー数',
} as const

export const logLevelLabels: Record<WorkflowRunLog['level'], string> = {
  info: '情報',
  warn: '警告',
  error: 'エラー',
  security: 'セキュリティ',
  approval: '承認',
  metric: 'メトリクス',
}

export function formatDataTypeLabel(type: string): string {
  return dataTypeLabels[type as WorkflowDataType] ?? type
}
