export type ConnectorRequest = {
  jobId: string
  nodeId: string
  connectorId: string
  input: unknown
  contextSummary: string
  timeoutMs: number
  maxRetries?: number
  metadata?: Record<string, unknown>
}

export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_MAX_RETRIES = 3

export function makeConnectorRequest(
  params: Omit<ConnectorRequest, 'timeoutMs'> & { timeoutMs?: number },
): ConnectorRequest {
  return {
    ...params,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: params.maxRetries ?? DEFAULT_MAX_RETRIES,
  }
}
