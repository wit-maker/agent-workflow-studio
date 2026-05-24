import type { ConnectorJob } from './connectorQueue'
import { canRetry, DEFAULT_RETRY_POLICY, type RetryPolicy } from './retryPolicy'

export function retryConnectorJob(
  job: ConnectorJob,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): ConnectorJob | null {
  if (job.status !== 'failed') return null
  if (!canRetry(job.retryCount, policy)) return null
  return {
    ...job,
    status: 'success',
    retryCount: job.retryCount + 1,
    outputSummary: `再試行 ${job.retryCount + 1} 回目で成功しました。(mock)`,
    finishedAt: new Date().toISOString(),
    error: undefined,
  }
}

export function markJobReviewed(job: ConnectorJob): ConnectorJob {
  return {
    ...job,
    status: 'success',
    outputSummary: '人間確認を通過しました。(mock)',
    finishedAt: new Date().toISOString(),
  }
}

export function skipConnectorJob(job: ConnectorJob): ConnectorJob {
  return {
    ...job,
    status: 'skipped',
    finishedAt: new Date().toISOString(),
  }
}

export function cancelConnectorJob(job: ConnectorJob): ConnectorJob | null {
  if (job.status !== 'queued') return null
  return {
    ...job,
    status: 'cancelled',
    finishedAt: new Date().toISOString(),
  }
}
