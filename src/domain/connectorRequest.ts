import type { CredentialRef } from './credentialRef'
import {
  sanitizeConnectorSafeRecord,
  sanitizeConnectorText,
  type ConnectorSafeRecord,
} from './connectorSafety'

export type ConnectorRequestInputKind = 'text' | 'json' | 'manual-review' | 'local-mock'

export type ConnectorRequestInput = {
  kind: ConnectorRequestInputKind
  summary: string
  content?: string
}

export type ConnectorRequest = {
  jobId: string
  nodeId: string
  connectorId: string
  input: ConnectorRequestInput
  contextSummary: string
  credentialRef?: CredentialRef
  timeoutMs: number
  maxRetries?: number
  metadata?: ConnectorSafeRecord
}

export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_MAX_RETRIES = 3

export function makeConnectorRequest(
  params: Omit<ConnectorRequest, 'timeoutMs'> & { timeoutMs?: number },
): ConnectorRequest {
  return {
    ...params,
    input: {
      kind: params.input.kind,
      summary: sanitizeConnectorText(params.input.summary) ?? 'No safe input summary available.',
      content: params.input.content ? sanitizeConnectorText(params.input.content) ?? undefined : undefined,
    },
    contextSummary:
      sanitizeConnectorText(params.contextSummary) ?? 'No safe context summary available.',
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: params.maxRetries ?? DEFAULT_MAX_RETRIES,
    metadata: sanitizeConnectorSafeRecord(params.metadata),
  }
}
