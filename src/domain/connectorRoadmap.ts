export type ConnectorRoadmapStatus =
  | 'ready-next'
  | 'recommended'
  | 'blocked'
  | 'later'
  | 'research-needed'

export type ConnectorRoadmapCategory =
  | 'human'
  | 'mock'
  | 'local-cli'
  | 'local-gateway'
  | 'cloud-api'

export type ConnectorRoadmapItem = {
  id: string
  label: string
  category: ConnectorRoadmapCategory
  recommendedOrder: number
  status: ConnectorRoadmapStatus
  value: number
  implementationDifficulty: number
  credentialRisk: number
  localFirstCompatibility: number
  rateLimitRisk: number
  userControl: number
  debuggability: number
  recommendedPhase: string
  reason: string
  nextRequirement: string
}

export const CONNECTOR_ROADMAP: ConnectorRoadmapItem[] = [
  {
    id: 'human-review',
    label: 'Human Review',
    category: 'human',
    recommendedOrder: 1,
    status: 'ready-next',
    value: 5,
    implementationDifficulty: 1,
    credentialRisk: 1,
    localFirstCompatibility: 5,
    rateLimitRisk: 1,
    userControl: 5,
    debuggability: 5,
    recommendedPhase: 'M21 candidate',
    reason: 'Already fits the local-first workflow and keeps the user in full control without API calls or credential handling.',
    nextRequirement: 'Wrap the existing human review flow with the real connector adapter interface.',
  },
  {
    id: 'manual-local-mock',
    label: 'Manual Connector / Local Mock',
    category: 'mock',
    recommendedOrder: 2,
    status: 'ready-next',
    value: 4,
    implementationDifficulty: 1,
    credentialRisk: 1,
    localFirstCompatibility: 5,
    rateLimitRisk: 1,
    userControl: 5,
    debuggability: 5,
    recommendedPhase: 'M21 candidate',
    reason: 'It is the safest connector for proving request, response, error, queue, and import/export behavior end to end.',
    nextRequirement: 'Promote the mock execution path to an adapter-conformant manual connector.',
  },
  {
    id: 'claude-cli-style-local-adapter',
    label: 'Claude CLI style local adapter',
    category: 'local-cli',
    recommendedOrder: 3,
    status: 'recommended',
    value: 5,
    implementationDifficulty: 2,
    credentialRisk: 2,
    localFirstCompatibility: 4,
    rateLimitRisk: 3,
    userControl: 4,
    debuggability: 4,
    recommendedPhase: 'After Human Review / Manual Connector',
    reason: 'High workflow value with credentials delegated to an already installed local CLI rather than stored in the app.',
    nextRequirement: 'Define the local command boundary and readiness check without invoking real commands from the browser runtime.',
  },
  {
    id: 'codex-cli-style-local-adapter',
    label: 'Codex CLI style local adapter',
    category: 'local-cli',
    recommendedOrder: 4,
    status: 'recommended',
    value: 4,
    implementationDifficulty: 2,
    credentialRisk: 2,
    localFirstCompatibility: 4,
    rateLimitRisk: 3,
    userControl: 4,
    debuggability: 4,
    recommendedPhase: 'After Claude CLI style adapter or in parallel design',
    reason: 'Shares most of the local CLI boundary shape and can reuse readiness, logging, and cancellation rules.',
    nextRequirement: 'Reuse the CLI adapter contract after the first local CLI connector proves the lifecycle.',
  },
  {
    id: 'gemini-cli-style-local-adapter',
    label: 'Gemini CLI style local adapter',
    category: 'local-cli',
    recommendedOrder: 5,
    status: 'later',
    value: 4,
    implementationDifficulty: 3,
    credentialRisk: 2,
    localFirstCompatibility: 4,
    rateLimitRisk: 3,
    userControl: 4,
    debuggability: 3,
    recommendedPhase: 'After the first CLI adapter is stable',
    reason: 'Useful for large-context and search-assisted work, but should follow a proven CLI adapter lifecycle.',
    nextRequirement: 'Confirm CLI availability checks, streaming shape, and rate-limit reporting.',
  },
  {
    id: 'hermes-local-gateway',
    label: 'Hermes local gateway',
    category: 'local-gateway',
    recommendedOrder: 6,
    status: 'research-needed',
    value: 3,
    implementationDifficulty: 3,
    credentialRisk: 2,
    localFirstCompatibility: 4,
    rateLimitRisk: 2,
    userControl: 3,
    debuggability: 3,
    recommendedPhase: 'After CLI adapters',
    reason: 'A gateway can simplify multi-provider routing, but adds another local service boundary to diagnose.',
    nextRequirement: 'Document Hermes process discovery, health checks, and request routing before implementation.',
  },
  {
    id: 'grok-x-search-via-hermes',
    label: 'Grok/X Search via Hermes',
    category: 'local-gateway',
    recommendedOrder: 7,
    status: 'blocked',
    value: 3,
    implementationDifficulty: 4,
    credentialRisk: 3,
    localFirstCompatibility: 2,
    rateLimitRisk: 4,
    userControl: 3,
    debuggability: 2,
    recommendedPhase: 'After Hermes gateway is proven',
    reason: 'Search integration depends on Hermes readiness and provider-specific usage limits.',
    nextRequirement: 'Wait for Hermes gateway implementation and explicit search credential policy.',
  },
  {
    id: 'direct-cloud-apis',
    label: 'Direct Cloud APIs',
    category: 'cloud-api',
    recommendedOrder: 8,
    status: 'blocked',
    value: 4,
    implementationDifficulty: 5,
    credentialRisk: 5,
    localFirstCompatibility: 1,
    rateLimitRisk: 5,
    userControl: 2,
    debuggability: 2,
    recommendedPhase: 'Deferred',
    reason: 'Direct APIs require credential storage, request signing, provider error handling, and rate-limit controls outside the current scope.',
    nextRequirement: 'Introduce an approved secure credential boundary before any direct cloud API implementation.',
  },
]

export function getConnectorRoadmap(): ConnectorRoadmapItem[] {
  return [...CONNECTOR_ROADMAP].sort(
    (a, b) => a.recommendedOrder - b.recommendedOrder,
  )
}

export function getNextConnectorCandidates(): ConnectorRoadmapItem[] {
  return getConnectorRoadmap().filter((item) => item.status === 'ready-next')
}

export function getNextConnector(): ConnectorRoadmapItem | undefined {
  return getConnectorRoadmap().find((item) => item.status === 'ready-next')
}
