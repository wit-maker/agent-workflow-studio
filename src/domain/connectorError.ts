export type ConnectorErrorCode =
  | 'timeout'
  | 'rate_limit'
  | 'auth_failed'
  | 'not_configured'
  | 'network_error'
  | 'invalid_response'
  | 'quota_exceeded'
  | 'model_unavailable'
  | 'input_too_large'
  | 'unknown'

export type ConnectorError = {
  code: ConnectorErrorCode
  message: string
  retryable: boolean
  retryAfterMs?: number
  details?: unknown
}

export function makeConnectorError(
  code: ConnectorErrorCode,
  message: string,
  options?: { retryable?: boolean; retryAfterMs?: number; details?: unknown },
): ConnectorError {
  const retryable = options?.retryable ?? isRetryableByDefault(code)
  return {
    code,
    message,
    retryable,
    retryAfterMs: options?.retryAfterMs,
    details: options?.details,
  }
}

function isRetryableByDefault(code: ConnectorErrorCode): boolean {
  switch (code) {
    case 'timeout':
    case 'rate_limit':
    case 'network_error':
    case 'model_unavailable':
      return true
    case 'auth_failed':
    case 'not_configured':
    case 'quota_exceeded':
    case 'invalid_response':
    case 'input_too_large':
    case 'unknown':
      return false
  }
}
