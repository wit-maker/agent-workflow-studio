import { resolveConnectorForNode } from './agentExecution'
import type { ConnectorJob } from './connectorQueue'
import type { WorkflowNode } from './workflow'

export function buildConnectorJob(runId: string, node: WorkflowNode): ConnectorJob {
  const connector = resolveConnectorForNode(node)
  return {
    id: `cjob-${runId}-${node.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    runId,
    nodeId: node.id,
    nodeTitle: node.title,
    connectorId: connector.id,
    connectorLabel: connector.label,
    status: 'queued',
    inputSummary: `${node.title} → ${connector.label} (mock)`,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  }
}

export function buildConnectorJobs(runId: string, nodes: WorkflowNode[]): ConnectorJob[] {
  return nodes.map((node) => buildConnectorJob(runId, node))
}
