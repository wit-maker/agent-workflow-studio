import {
  createCredentialRequirement,
  type ConnectorCredentialRequirement,
  type CredentialSourceKind,
} from './credentialRef'

export type ConnectorMode = 'mock' | 'real-ready' | 'not-configured'

export type ConnectorReadiness = {
  connectorId: string
  mode: ConnectorMode
  canRunMock: boolean
  canRunReal: boolean
  credential: ConnectorCredentialRequirement
  missingRequirements: string[]
  warnings: string[]
}

export type ConnectorCapability =
  | 'text-generation'
  | 'code-generation'
  | 'web-search'
  | 'file-read'
  | 'human-review'
  | 'local-cli'

export type ConnectorProfile = {
  connectorId: string
  displayName: string
  description: string
  capabilities: ConnectorCapability[]
  requiresApiKey: boolean
  requiresLocalCli: boolean
  requiresBrowserAutomation: boolean
  credentialSource: CredentialSourceKind
  supportsStreaming: boolean
  maxContextTokens?: number
}

export function buildMockReadiness(connectorId: string): ConnectorReadiness {
  return {
    connectorId,
    mode: 'mock',
    canRunMock: true,
    canRunReal: false,
    credential: createCredentialRequirement(),
    missingRequirements: ['Real connector execution is not configured.'],
    warnings: ['Only local mock execution is available.'],
  }
}

export function buildNotConfiguredReadiness(
  connectorId: string,
  missingRequirements: string[],
  credential: ConnectorCredentialRequirement = createCredentialRequirement({
    required: true,
    source: 'none',
    availability: 'not-implemented',
  }),
): ConnectorReadiness {
  return {
    connectorId,
    mode: 'not-configured',
    canRunMock: true,
    canRunReal: false,
    credential,
    missingRequirements,
    warnings: [],
  }
}

export function buildRealReadyReadiness(
  connectorId: string,
  warnings: string[] = [],
  credential: ConnectorCredentialRequirement = createCredentialRequirement(),
): ConnectorReadiness {
  return {
    connectorId,
    mode: 'real-ready',
    canRunMock: true,
    canRunReal: true,
    credential,
    missingRequirements: [],
    warnings,
  }
}

// All known connector profiles. Real connections remain disabled in this phase.
export const KNOWN_CONNECTOR_PROFILES: ConnectorProfile[] = [
  {
    connectorId: 'human-review',
    displayName: 'Human Review',
    description: 'Manual review and approval flow.',
    capabilities: ['human-review'],
    requiresApiKey: false,
    requiresLocalCli: false,
    requiresBrowserAutomation: false,
    credentialSource: 'none',
    supportsStreaming: false,
  },
  {
    connectorId: 'local-mock',
    displayName: 'Local Mock',
    description: 'Local mock execution without external API calls.',
    capabilities: ['text-generation', 'code-generation'],
    requiresApiKey: false,
    requiresLocalCli: false,
    requiresBrowserAutomation: false,
    credentialSource: 'none',
    supportsStreaming: false,
  },
  {
    connectorId: 'claude-cli',
    displayName: 'Claude (CLI)',
    description: 'Future local CLI integration through the user-managed Claude CLI.',
    capabilities: ['text-generation', 'code-generation', 'file-read'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    credentialSource: 'cli-managed',
    supportsStreaming: true,
    maxContextTokens: 200_000,
  },
  {
    connectorId: 'codex-cli',
    displayName: 'Codex (CLI)',
    description: 'Future local CLI integration through the user-managed Codex CLI.',
    capabilities: ['code-generation', 'text-generation'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    credentialSource: 'cli-managed',
    supportsStreaming: true,
  },
  {
    connectorId: 'gemini-cli',
    displayName: 'Gemini (CLI)',
    description: 'Future local CLI integration through the user-managed Gemini CLI.',
    capabilities: ['text-generation', 'code-generation', 'web-search'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    credentialSource: 'cli-managed',
    supportsStreaming: true,
    maxContextTokens: 1_000_000,
  },
  {
    connectorId: 'hermes-gateway',
    displayName: 'Hermes Gateway',
    description: 'Future local gateway integration for model routing.',
    capabilities: ['text-generation', 'web-search'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    credentialSource: 'cli-managed',
    supportsStreaming: false,
  },
  {
    connectorId: 'grok-search',
    displayName: 'Grok / X Search',
    description: 'Future search integration through a local gateway.',
    capabilities: ['web-search', 'text-generation'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    credentialSource: 'cli-managed',
    supportsStreaming: false,
  },
]

export function getAllConnectorReadiness(): ConnectorReadiness[] {
  return KNOWN_CONNECTOR_PROFILES.map((profile) => {
    if (!profile.requiresApiKey && !profile.requiresLocalCli && !profile.requiresBrowserAutomation) {
      return buildMockReadiness(profile.connectorId)
    }

    return buildNotConfiguredReadiness(
      profile.connectorId,
      [
        profile.requiresApiKey ? 'API credential resolution is not implemented.' : '',
        profile.requiresLocalCli ? 'Local CLI discovery is not implemented.' : '',
        profile.requiresBrowserAutomation ? 'Browser automation readiness is not implemented.' : '',
      ].filter(Boolean),
      createCredentialRequirement({
        required: profile.credentialSource !== 'none',
        source: profile.credentialSource,
        availability: 'not-implemented',
      }),
    )
  })
}
