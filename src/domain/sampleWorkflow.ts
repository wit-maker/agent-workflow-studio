import type {
  Workflow,
  WorkflowConnection,
  WorkflowDataType,
  WorkflowMetric,
  WorkflowNode,
} from './workflow'
import { calculateBottleneck } from './connectionRules'

type PartDefinition = Pick<
  WorkflowNode,
  | 'type'
  | 'title'
  | 'category'
  | 'description'
  | 'agentRole'
  | 'inputTypes'
  | 'outputTypes'
>

export const mvpPartDefinitions: PartDefinition[] = [
  {
    type: 'manual-trigger',
    title: 'Manual Trigger',
    category: 'Trigger',
    description: 'Starts the workflow from an explicit human action.',
    agentRole: 'human',
    inputTypes: [],
    outputTypes: ['Trigger'],
  },
  {
    type: 'text-input',
    title: 'Text Input',
    category: 'Input',
    description: 'Captures human-entered text and passes it forward.',
    agentRole: 'human',
    inputTypes: ['Trigger'],
    outputTypes: ['Text'],
  },
  {
    type: 'file-input',
    title: 'File Input',
    category: 'Input',
    description: 'Represents a local file source without external upload.',
    agentRole: 'human',
    inputTypes: ['Trigger'],
    outputTypes: ['File'],
  },
  {
    type: 'normalize',
    title: 'Normalize',
    category: 'Transform',
    description: 'Normalizes text and file inputs into reusable context.',
    agentRole: 'lightwork_ai',
    inputTypes: ['Text', 'File'],
    outputTypes: ['Context'],
  },
  {
    type: 'route',
    title: 'Route',
    category: 'Flow',
    description: 'Chooses a mock execution path based on context and risk.',
    agentRole: 'sub_leader_ai',
    inputTypes: ['Context'],
    outputTypes: ['Decision', 'Context'],
  },
  {
    type: 'ai-execute',
    title: 'AI Execute',
    category: 'Run',
    description: 'Mocks future Codex, Hermes, Grok, Claude, or Gemini execution.',
    agentRole: 'programmer_ai',
    inputTypes: ['Prompt', 'Context', 'Decision'],
    outputTypes: ['Result'],
  },
  {
    type: 'external-connector',
    title: 'External Connector',
    category: 'Connector',
    description: 'Shows external connection status without calling any API.',
    agentRole: 'research_ai',
    inputTypes: ['Context'],
    outputTypes: ['Evidence'],
  },
  {
    type: 'check',
    title: 'Check',
    category: 'Quality',
    description: 'Mocks quality, security, source, and specification checks.',
    agentRole: 'qa_ai',
    inputTypes: ['Result', 'Evidence'],
    outputTypes: ['Decision', 'Error'],
  },
  {
    type: 'aggregate',
    title: 'Aggregate',
    category: 'Collect',
    description: 'Combines checked results into a single artifact candidate.',
    agentRole: 'dev_leader_ai',
    inputTypes: ['Decision', 'Error', 'Result', 'Evidence'],
    outputTypes: ['Artifact'],
  },
  {
    type: 'output',
    title: 'Output',
    category: 'Output',
    description: 'Displays Markdown, JSON, Diff, or preview output locally.',
    agentRole: 'human',
    inputTypes: ['Artifact'],
    outputTypes: ['Artifact', 'Log'],
  },
  {
    type: 'run-log',
    title: 'Run Log',
    category: 'Record',
    description: 'Records each run step, metrics event, and safety decision.',
    agentRole: 'recorder_ai',
    inputTypes: ['Log'],
    outputTypes: ['Log'],
  },
  {
    type: 'template-save',
    title: 'Template Save',
    category: 'Template',
    description: 'Mocks saving the successful workflow as a reusable template.',
    agentRole: 'recorder_ai',
    inputTypes: ['Artifact', 'Log', 'Metric'],
    outputTypes: ['Template'],
  },
]

const positions = [
  { x: 48, y: 88 },
  { x: 278, y: 40 },
  { x: 278, y: 158 },
  { x: 508, y: 98 },
  { x: 738, y: 98 },
  { x: 968, y: 40 },
  { x: 968, y: 158 },
  { x: 1198, y: 98 },
  { x: 1428, y: 98 },
  { x: 1658, y: 98 },
  { x: 1888, y: 48 },
  { x: 1888, y: 168 },
]

export function createSampleWorkflow(): Workflow {
  const nodes: WorkflowNode[] = mvpPartDefinitions.map((definition, index) => ({
    id: `node-${index + 1}`,
    ...definition,
    status: 'idle',
    config: {
      mode: definition.title === 'AI Execute' ? 'mock' : 'local',
      externalApi: false,
    },
    position: positions[index],
    metrics: {
      estimatedTokens: 120 + index * 55,
      estimatedCost: Number((0.01 + index * 0.006).toFixed(3)),
      estimatedLatencyMs: 420 + index * 140,
      retryCount: index === 7 ? 1 : 0,
      errorCount: 0,
    },
  }))

  const connectionTuples: Array<[number, number, WorkflowDataType[], WorkflowConnection['kind']]> = [
    [1, 2, ['Trigger'], 'instruction'],
    [1, 3, ['Trigger'], 'instruction'],
    [2, 4, ['Text'], 'data'],
    [3, 4, ['File'], 'data'],
    [4, 5, ['Context'], 'data'],
    [5, 6, ['Decision', 'Context'], 'decision'],
    [5, 7, ['Context'], 'decision'],
    [6, 8, ['Result'], 'result'],
    [7, 8, ['Evidence'], 'evidence'],
    [8, 9, ['Decision'], 'decision'],
    [9, 10, ['Artifact'], 'result'],
    [10, 11, ['Log'], 'log'],
    [11, 12, ['Log'], 'template'],
  ]

  const connections: WorkflowConnection[] = connectionTuples.map(
    ([source, target, carries, kind], index) => ({
      id: `edge-${index + 1}`,
      sourceNodeId: `node-${source}`,
      targetNodeId: `node-${target}`,
      kind,
      carries,
      status: 'inactive',
      metrics: {
        flowRate: 1,
        tokens: 24 + index * 8,
        latencyMs: 80 + index * 20,
      },
    }),
  )

  const bottleneck = calculateBottleneck(nodes)
  const metrics: WorkflowMetric = {
    tokens: 0,
    cost: 0,
    latencyMs: 0,
    successRate: 0,
    queueCount: 0,
    retryCount: 0,
    bottleneckNodeId: bottleneck?.id ?? null,
  }

  return {
    id: 'workflow-bootstrap-mvp',
    name: 'Agent Workflow Studio Bootstrap MVP',
    description:
      'A local-only sample workflow that visualizes typed AI work without real API calls.',
    version: 1,
    status: 'ready',
    nodes,
    connections,
    metrics,
    logs: [],
    artifact: {
      title: 'No artifact yet',
      format: 'Preview',
      content: 'Run the local mock workflow to generate the first artifact.',
      status: 'draft',
    },
    createdAt: '2026-05-23T00:00:00.000Z',
    updatedAt: '2026-05-23T00:00:00.000Z',
  }
}
