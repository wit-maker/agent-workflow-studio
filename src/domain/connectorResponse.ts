import type { ConnectorError } from './connectorError'

export type ConnectorResponseStatus = 'success' | 'failed' | 'review_required'

export type ConnectorUsage = {
  tokens?: number
  promptTokens?: number
  completionTokens?: number
  cost?: number
  latencyMs?: number
}

export type ConnectorResponse = {
  jobId: string
  status: ConnectorResponseStatus
  output?: unknown
  error?: ConnectorError
  usage?: ConnectorUsage
  respondedAt: string
}

export function makeSuccessResponse(
  jobId: string,
  output: unknown,
  usage?: ConnectorUsage,
): ConnectorResponse {
  return {
    jobId,
    status: 'success',
    output,
    usage,
    respondedAt: new Date().toISOString(),
  }
}

export function makeFailedResponse(
  jobId: string,
  error: ConnectorError,
  usage?: ConnectorUsage,
): ConnectorResponse {
  return {
    jobId,
    status: 'failed',
    error,
    usage,
    respondedAt: new Date().toISOString(),
  }
}

export function makeReviewRequiredResponse(
  jobId: string,
  output: unknown,
  usage?: ConnectorUsage,
): ConnectorResponse {
  return {
    jobId,
    status: 'review_required',
    output,
    usage,
    respondedAt: new Date().toISOString(),
  }
}
