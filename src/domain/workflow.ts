export type WorkflowPortDirection = 'input' | 'output'

export type WorkflowPort = {
  id: string
  label: string
  direction: WorkflowPortDirection
  dataType: WorkflowDataType
  required: boolean
  description?: string
}

export type WorkflowDataType =
  | 'Trigger'
  | 'Text'
  | 'URL'
  | 'File'
  | 'Markdown'
  | 'PDF'
  | 'Image'
  | 'Audio'
  | 'Issue'
  | 'PR'
  | 'Diff'
  | 'Post'
  | 'Email'
  | 'Prompt'
  | 'Context'
  | 'Result'
  | 'Evidence'
  | 'Decision'
  | 'Artifact'
  | 'Log'
  | 'Template'
  | 'Metric'
  | 'Error'
  | 'JSON'
  | 'Boolean'
  | 'Number'
  | 'DateTime'
  | 'Command'
  | 'Review'

export type WorkflowNodeStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'retry_ready'
  | 'skipped'
  | 'review_required'
  | 'blocked'

export type WorkflowStatus =
  | 'draft'
  | 'ready'
  | 'invalid'
  | 'running'
  | 'paused'
  | 'success'
  | 'failed'
  | 'review_required'
  | 'archived'

export type ConnectionKind =
  | 'data'
  | 'instruction'
  | 'result'
  | 'decision'
  | 'evidence'
  | 'log'
  | 'error'
  | 'retry'
  | 'approval'
  | 'resource'
  | 'template'
  | 'improvement'

export const connectionKinds = [
  'data',
  'instruction',
  'result',
  'decision',
  'evidence',
  'log',
  'error',
  'retry',
  'approval',
  'resource',
  'template',
  'improvement',
] as const satisfies ConnectionKind[]

export type ConnectionStatus =
  | 'inactive'
  | 'active'
  | 'success'
  | 'failed'
  | 'invalid'
  | 'throttled'

export type AgentRole =
  | 'human'
  | 'dev_leader_ai'
  | 'sub_leader_ai'
  | 'programmer_ai'
  | 'designer_ai'
  | 'research_ai'
  | 'qa_ai'
  | 'security_ai'
  | 'recorder_ai'
  | 'lightwork_ai'

export type WorkflowNode = {
  id: string
  type: string
  title: string
  category: string
  description: string
  status: WorkflowNodeStatus
  agentRole?: AgentRole
  inputTypes: WorkflowDataType[]
  outputTypes: WorkflowDataType[]
  inputPorts?: WorkflowPort[]
  outputPorts?: WorkflowPort[]
  config: Record<string, unknown>
  position: { x: number; y: number }
  metrics?: {
    estimatedTokens?: number
    estimatedCost?: number
    estimatedLatencyMs?: number
    bottleneckScore?: number
    retryCount?: number
    errorCount?: number
  }
  lastRun?: {
    startedAt?: string
    finishedAt?: string
    result?: unknown
    error?: string
  }
}

export type WorkflowConnection = {
  id: string
  sourceNodeId: string
  sourcePort?: string
  sourcePortId?: string
  targetNodeId: string
  targetPort?: string
  targetPortId?: string
  kind: ConnectionKind
  carries: WorkflowDataType[]
  status: ConnectionStatus
  metrics?: {
    flowRate?: number
    tokens?: number
    latencyMs?: number
  }
}

export type WorkflowRunLog = {
  id: string
  runId: string
  timestamp: string
  nodeId?: string
  level: 'info' | 'warn' | 'error' | 'security' | 'approval' | 'metric'
  message: string
  payload?: unknown
}

export type WorkflowMetric = {
  tokens: number
  cost: number
  latencyMs: number
  successRate: number
  queueCount: number
  retryCount: number
  bottleneckNodeId: string | null
}

export type WorkflowArtifact = {
  title: string
  format: 'Markdown' | 'JSON' | 'Diff' | 'Preview'
  content: string
  status: 'draft' | 'checked' | 'review_required' | 'approved' | 'failed'
}

export type WorkflowTemplateMetadata = {
  tags: string[]
  category?: string
  nodeCount: number
  connectionCount: number
  requiredPortCount: number
  unconnectedRequiredPortCount: number
  lastEvaluationStatus?: string
  lastEvaluationScore?: number
  artifactVersionCount?: number
  createdFromRunId?: string
}

export type Workflow = {
  id: string
  schemaVersion?: '1.0' | '1.1'
  name: string
  description: string
  version: number
  status: WorkflowStatus
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  metrics: WorkflowMetric
  logs: WorkflowRunLog[]
  artifact: WorkflowArtifact
  createdAt: string
  updatedAt: string
}

export { agentRoleLabels, statusLabels } from './displayLabels'
