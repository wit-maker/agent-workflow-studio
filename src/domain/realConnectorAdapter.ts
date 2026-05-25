import type { ConnectorRequest } from './connectorRequest'
import type { ConnectorResponse } from './connectorResponse'
import type { ConnectorReadiness } from './connectorReadiness'

/**
 * Interface that every real connector adapter must implement.
 *
 * The mock adapter (agentConnectors.ts) is not required to implement this interface yet,
 * but real adapters must conform to it before any live API call is made.
 *
 * Design constraints:
 * - No credential storage in the browser — credentials come from the OS environment or local CLI.
 * - All adapters must report readiness before execution is attempted.
 * - Adapters must not make any network calls unless canRunReal is true in readiness.
 */
export interface IRealConnectorAdapter {
  readonly connectorId: string

  /**
   * Returns the current readiness of this connector.
   * Called before every execution to decide mock vs. real path.
   */
  getReadiness(): ConnectorReadiness

  /**
   * Executes the connector with the given request.
   * Must not be called when canRunReal is false — callers are responsible for checking readiness.
   */
  execute(request: ConnectorRequest): Promise<ConnectorResponse>

  /**
   * Cancels an in-flight request by jobId, if supported.
   * Returns true if cancellation was initiated, false if not supported or already finished.
   */
  cancel?(jobId: string): boolean
}

/**
 * Base class helper for real connector adapters.
 * Provides a safe execute guard that checks readiness before delegating.
 */
export abstract class BaseRealConnectorAdapter implements IRealConnectorAdapter {
  abstract readonly connectorId: string
  abstract getReadiness(): ConnectorReadiness
  protected abstract executeInternal(request: ConnectorRequest): Promise<ConnectorResponse>

  async execute(request: ConnectorRequest): Promise<ConnectorResponse> {
    const readiness = this.getReadiness()
    if (!readiness.canRunReal) {
      throw new Error(
        `Connector "${this.connectorId}" is not ready for real execution. Missing: ${readiness.missingRequirements.join(', ')}`,
      )
    }
    return this.executeInternal(request)
  }
}
