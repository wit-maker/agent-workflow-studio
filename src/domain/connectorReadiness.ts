export type ConnectorMode = 'mock' | 'real-ready' | 'not-configured'

export type ConnectorReadiness = {
  connectorId: string
  mode: ConnectorMode
  canRunMock: boolean
  canRunReal: boolean
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
  supportsStreaming: boolean
  maxContextTokens?: number
}

export function buildMockReadiness(connectorId: string): ConnectorReadiness {
  return {
    connectorId,
    mode: 'mock',
    canRunMock: true,
    canRunReal: false,
    missingRequirements: ['実API接続が設定されていません。'],
    warnings: ['ローカルモック実行のみ利用可能です。'],
  }
}

export function buildNotConfiguredReadiness(
  connectorId: string,
  missingRequirements: string[],
): ConnectorReadiness {
  return {
    connectorId,
    mode: 'not-configured',
    canRunMock: true,
    canRunReal: false,
    missingRequirements,
    warnings: [],
  }
}

export function buildRealReadyReadiness(
  connectorId: string,
  warnings: string[] = [],
): ConnectorReadiness {
  return {
    connectorId,
    mode: 'real-ready',
    canRunMock: true,
    canRunReal: true,
    missingRequirements: [],
    warnings,
  }
}

// All known connector profiles — real connections not yet implemented.
export const KNOWN_CONNECTOR_PROFILES: ConnectorProfile[] = [
  {
    connectorId: 'human-review',
    displayName: 'Human Review',
    description: '人間のレビュアーによる確認・承認フロー',
    capabilities: ['human-review'],
    requiresApiKey: false,
    requiresLocalCli: false,
    requiresBrowserAutomation: false,
    supportsStreaming: false,
  },
  {
    connectorId: 'local-mock',
    displayName: 'Local Mock',
    description: '実API呼び出しなしのローカルモック実行',
    capabilities: ['text-generation', 'code-generation'],
    requiresApiKey: false,
    requiresLocalCli: false,
    requiresBrowserAutomation: false,
    supportsStreaming: false,
  },
  {
    connectorId: 'claude-cli',
    displayName: 'Claude (CLI)',
    description: 'Claude Code CLIを経由したローカル接続',
    capabilities: ['text-generation', 'code-generation', 'file-read'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    supportsStreaming: true,
    maxContextTokens: 200_000,
  },
  {
    connectorId: 'codex-cli',
    displayName: 'Codex (CLI)',
    description: 'OpenAI Codex CLIを経由したローカル接続',
    capabilities: ['code-generation', 'text-generation'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    supportsStreaming: true,
  },
  {
    connectorId: 'gemini-cli',
    displayName: 'Gemini (CLI)',
    description: 'Gemini CLIを経由したローカル接続',
    capabilities: ['text-generation', 'code-generation', 'web-search'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    supportsStreaming: true,
    maxContextTokens: 1_000_000,
  },
  {
    connectorId: 'hermes-gateway',
    displayName: 'Hermes Gateway',
    description: 'ローカルHermesゲートウェイ経由のルーティング',
    capabilities: ['text-generation', 'web-search'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    supportsStreaming: false,
  },
  {
    connectorId: 'grok-search',
    displayName: 'Grok / X Search',
    description: 'Hermesゲートウェイ経由のGrok/X Search接続',
    capabilities: ['web-search', 'text-generation'],
    requiresApiKey: false,
    requiresLocalCli: true,
    requiresBrowserAutomation: false,
    supportsStreaming: false,
  },
]

// Returns mock readiness for all connectors (real connections not yet implemented).
export function getAllConnectorReadiness(): ConnectorReadiness[] {
  return KNOWN_CONNECTOR_PROFILES.map((profile) =>
    !profile.requiresApiKey && !profile.requiresLocalCli && !profile.requiresBrowserAutomation
      ? buildMockReadiness(profile.connectorId)
      : buildNotConfiguredReadiness(profile.connectorId, [
          profile.requiresApiKey ? 'APIキーが設定されていません。' : '',
          profile.requiresLocalCli ? 'ローカルCLIがインストールされていません。' : '',
          profile.requiresBrowserAutomation ? 'ブラウザ自動化の接続準備が必要です。' : '',
        ].filter(Boolean)),
  )
}
