import type { AgentRole } from './workflow'

export type ConnectorStatus = 'mock' | 'disconnected' | 'connected'

export type AgentConnector = {
  id: string
  label: string
  provider: string
  role: AgentRole | 'human_review'
  capabilities: string[]
  status: ConnectorStatus
  isMock: true
  requiresCredential: boolean
  description: string
}
