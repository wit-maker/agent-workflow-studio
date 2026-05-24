export type ConnectorJobStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'review_required'

export type ConnectorJob = {
  id: string
  runId: string
  nodeId: string
  nodeTitle: string
  connectorId: string
  connectorLabel: string
  status: ConnectorJobStatus
  inputSummary: string
  outputSummary?: string
  error?: string
  retryCount: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

export const connectorJobStatusLabels: Record<ConnectorJobStatus, string> = {
  queued: '待機中',
  running: '実行中',
  success: '成功',
  failed: '失敗',
  skipped: 'スキップ',
  cancelled: 'キャンセル',
  review_required: '確認待ち',
}
