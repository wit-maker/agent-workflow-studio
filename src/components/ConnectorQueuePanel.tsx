import type { ConnectorJob } from '../domain/connectorQueue'
import { connectorJobStatusLabels } from '../domain/connectorQueue'
import { RecoveryPanel } from './RecoveryPanel'

type ConnectorQueuePanelProps = {
  jobs: ConnectorJob[]
  onRetryJob: (jobId: string) => void
  onMarkJobReviewed: (jobId: string) => void
  onSkipJob: (jobId: string) => void
  onCancelJob: (jobId: string) => void
}

const statusOrder: ConnectorJob['status'][] = [
  'running',
  'queued',
  'failed',
  'review_required',
  'success',
  'skipped',
  'cancelled',
]

export function ConnectorQueuePanel({
  jobs,
  onRetryJob,
  onMarkJobReviewed,
  onSkipJob,
  onCancelJob,
}: ConnectorQueuePanelProps) {
  if (jobs.length === 0) {
    return (
      <div className="connector-queue-panel">
        <p className="muted">実行後にコネクタージョブがここへ表示されます。</p>
      </div>
    )
  }

  const queued = jobs.filter((j) => j.status === 'queued')
  const running = jobs.filter((j) => j.status === 'running')
  const failed = jobs.filter((j) => j.status === 'failed')
  const reviewRequired = jobs.filter((j) => j.status === 'review_required')
  const completed = jobs.filter((j) =>
    ['success', 'skipped', 'cancelled'].includes(j.status),
  )

  const sorted = [...jobs].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  )

  return (
    <div className="connector-queue-panel">
      <div className="cq-summary">
        {queued.length > 0 ? <span className="cq-badge queued">待機 {queued.length}</span> : null}
        {running.length > 0 ? <span className="cq-badge running">実行中 {running.length}</span> : null}
        {failed.length > 0 ? <span className="cq-badge failed">失敗 {failed.length}</span> : null}
        {reviewRequired.length > 0 ? (
          <span className="cq-badge review_required">確認待ち {reviewRequired.length}</span>
        ) : null}
        {completed.length > 0 ? (
          <span className="cq-badge success">完了 {completed.length}</span>
        ) : null}
      </div>

      <div className="cq-job-list">
        {sorted.map((job) => (
          <div key={job.id} className={`cq-job-row status-${job.status}`}>
            <div className="cq-job-info">
              <strong className="cq-node-title">{job.nodeTitle}</strong>
              <span className="cq-connector-label">{job.connectorLabel}</span>
              <span className={`connector-badge status-${job.status}`}>
                {connectorJobStatusLabels[job.status]}
              </span>
              {job.retryCount > 0 ? (
                <span className="cq-retry-badge">再試行 {job.retryCount}回</span>
              ) : null}
            </div>
            <div className="cq-job-meta">
              <span className="cq-job-id" title={job.id}>{job.id.slice(0, 24)}…</span>
              {job.outputSummary ? (
                <span className="cq-output">{job.outputSummary}</span>
              ) : null}
            </div>

            {(job.status === 'failed' ||
              job.status === 'review_required' ||
              job.status === 'queued') ? (
              <RecoveryPanel
                job={job}
                onRetry={onRetryJob}
                onMarkReviewed={onMarkJobReviewed}
                onSkip={onSkipJob}
                onCancel={onCancelJob}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
