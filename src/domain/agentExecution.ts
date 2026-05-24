import type { AgentConnector } from './agentConnectors'
import { MOCK_CONNECTORS, getConnectorByRole } from './agentConnectorRegistry'
import type { WorkflowNode } from './workflow'

export type AgentExecutionEntry = {
  nodeId: string
  nodeTitle: string
  connectorId: string
  connectorLabel: string
  provider: string
  isMock: true
  note: string
}

export function resolveConnectorForNode(node: WorkflowNode): AgentConnector {
  if (node.agentRole === 'human') {
    return MOCK_CONNECTORS.find((c) => c.id === 'human-review')!
  }

  if (node.agentRole) {
    const found = getConnectorByRole(node.agentRole)
    if (found) return found
  }

  // fallback: Claude Mock covers general-purpose nodes
  return MOCK_CONNECTORS.find((c) => c.id === 'claude-mock')!
}

export function buildAgentExecutionEntry(node: WorkflowNode): AgentExecutionEntry {
  const connector = resolveConnectorForNode(node)
  return {
    nodeId: node.id,
    nodeTitle: node.title,
    connectorId: connector.id,
    connectorLabel: connector.label,
    provider: connector.provider,
    isMock: true,
    note: `[mock] ${connector.label} によって処理されました。実API未接続。`,
  }
}

export function buildConnectorLogMessage(node: WorkflowNode): string {
  const connector = resolveConnectorForNode(node)
  return `[${connector.label} / mock] ${node.title} を処理しました。（${connector.provider} — 実API未接続）`
}
