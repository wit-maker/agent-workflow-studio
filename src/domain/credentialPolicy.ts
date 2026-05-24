export type CredentialMode = 'mock' | 'real-ready' | 'not-configured'

export type ConnectorCredentialPolicy = {
  connectorId: string
  connectorLabel: string
  requiresCredential: boolean
  credentialStorageStatus: 'not-implemented'
  connectionStatus: CredentialMode
  safeNextStep: string
}

export function buildCredentialPolicy(
  connectorId: string,
  connectorLabel: string,
  requiresCredential: boolean,
): ConnectorCredentialPolicy {
  return {
    connectorId,
    connectorLabel,
    requiresCredential,
    credentialStorageStatus: 'not-implemented',
    connectionStatus: 'mock',
    safeNextStep: 'アダプター境界を定義してから実API接続を行ってください。',
  }
}
