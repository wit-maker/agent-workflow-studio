export type RetryPolicy = {
  maxRetries: number
  backoffLabel: string
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffLabel: '即時再試行 (mock)',
}

export function canRetry(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): boolean {
  return retryCount < policy.maxRetries
}
