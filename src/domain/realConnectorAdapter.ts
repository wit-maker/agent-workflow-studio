import type { ConnectorRequest } from './connectorRequest'
import { makeConnectorError } from './connectorError'
import type { ConnectorResponse } from './connectorResponse'
import { makeFailedResponse } from './connectorResponse'
import type { ConnectorReadiness } from './connectorReadiness'

/**
 * Interface that every real connector adapter must implement before live execution.
 *
 * Design constraints:
 * - Browser state never receives credential values.
 * - Real adapters receive safe request input plus CredentialRef metadata only.
 * - Every execution path checks readiness before provider or CLI invocation.
 * - Not-ready paths return sanitized ConnectorResponse errors.
 */
export interface IRealConnectorAdapter {
  readonly connectorId: string

  getReadiness(): ConnectorReadiness

  execute(request: ConnectorRequest): Promise<ConnectorResponse>

  cancel?(jobId: string): boolean
}

export abstract class BaseRealConnectorAdapter implements IRealConnectorAdapter {
  abstract readonly connectorId: string
  abstract getReadiness(): ConnectorReadiness
  protected abstract executeInternal(request: ConnectorRequest): Promise<ConnectorResponse>

  async execute(request: ConnectorRequest): Promise<ConnectorResponse> {
    const readiness = this.getReadiness()

    if (request.connectorId !== this.connectorId) {
      return makeFailedResponse(
        request.jobId,
        makeConnectorError('invalid_response', 'Connector request was routed to the wrong adapter.', {
          details: {
            expectedConnectorId: this.connectorId,
            requestConnectorId: request.connectorId,
          },
        }),
      )
    }

    if (!readiness.canRunReal) {
      return makeFailedResponse(
        request.jobId,
        makeConnectorError('not_configured', 'Connector is not ready for real execution.', {
          details: {
            connectorId: this.connectorId,
            mode: readiness.mode,
            missingRequirements: readiness.missingRequirements.join('; '),
          },
        }),
      )
    }

    if (readiness.credential.required && !request.credentialRef) {
      return makeFailedResponse(
        request.jobId,
        makeConnectorError('not_configured', 'Connector requires a safe reference before real execution.', {
          details: {
            connectorId: this.connectorId,
            source: readiness.credential.source,
          },
        }),
      )
    }

    return this.executeInternal(request)
  }
}
