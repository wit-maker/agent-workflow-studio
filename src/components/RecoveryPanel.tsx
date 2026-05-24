import type { ConnectorJob } from '../domain/connectorQueue'
import { connectorJobStatusLabels } from '../domain/connectorQueue'
import { DEFAULT_RETRY_POLICY, canRetry } from '../domain/retryPolicy'

type RecoveryPanelProps = {
  job: ConnectorJob
  onRetry: (jobId: string) => void
  onMarkReviewed: (jobId: string) => void
  onSkip: (jobId: string) => void
  onCancel: (jobId: string) => void
}

export function RecoveryPanel({ job, onRetry, onMarkReviewed, onSkip, onCancel }: RecoveryPanelProps) {
  const canRetryJob = job.status === 'failed' && canRetry(job.retryCount, DEFAULT_RETRY_POLICY)
  const maxRetries = DEFAULT_RETRY_POLICY.maxRetries

  return (
    <div className="recovery-panel">
      <div className="recovery-job-header">
        <span className="recovery-connector">{job.connectorLabel}</span>
        <span className={`connector-badge status-${job.status}`}>
          {connectorJobStatusLabels[job.status]}
        </span>
        <span className="recovery-retry-count">
          再試行: {job.retryCount} / {maxRetries}
        </span>
      </div>

      {job.error ? (
        <p className="recovery-error">{job.error}</p>
      ) : null}

      {job.retryCount >= maxRetries && job.status === 'failed' ? (
        <p className="recovery-max-retry">最大再試行回数に達しました。スキップまたはキャンセルしてください。</p>
      ) : null}

      <div className="recovery-actions">
        {job.status === 'failed' ? (
          <button
            type="button"
            className="primary-button"
            disabled={!canRetryJob}
            onClick={() => onRetry(job.id)}
          >
            再試行
          </button>
        ) : null}

        {job.status === 'review_required' ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => onMarkReviewed(job.id)}
          >
            確認済みにする
          </button>
        ) : null}

        {(job.status === 'failed' || job.status === 'review_required') ? (
          <button
            type="button"
            className="icon-button"
            onClick={() => onSkip(job.id)}
          >
            スキップ
          </button>
        ) : null}

        {job.status === 'queued' ? (
          <button
            type="button"
            className="icon-button"
            onClick={() => onCancel(job.id)}
          >
            キャンセル
          </button>
        ) : null}
      </div>
    </div>
  )
}
