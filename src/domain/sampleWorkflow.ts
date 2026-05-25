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
    title: '手動開始',
    category: 'trigger',
    description: '人間の明示的な操作でワークフローを開始します。',
    agentRole: 'human',
    inputTypes: [],
    outputTypes: ['Trigger'],
  },
  {
    type: 'text-input',
    title: 'テキスト入力',
    category: 'input',
    description: '人が入力したテキストを受け取り、次へ渡します。',
    agentRole: 'human',
    inputTypes: ['Trigger'],
    outputTypes: ['Text'],
  },
  {
    type: 'file-input',
    title: 'ファイル入力',
    category: 'input',
    description: '外部アップロードなしのローカルファイル入力を表します。',
    agentRole: 'human',
    inputTypes: ['Trigger'],
    outputTypes: ['File'],
  },
  {
    type: 'normalize',
    title: '正規化',
    category: 'transform',
    description: 'テキストとファイル入力を再利用可能なコンテキストへ整えます。',
    agentRole: 'lightwork_ai',
    inputTypes: ['Text', 'File'],
    outputTypes: ['Context'],
  },
  {
    type: 'route',
    title: 'ルーティング',
    category: 'branch',
    description: 'コンテキストとリスクに応じてモック実行経路を選びます。',
    agentRole: 'sub_leader_ai',
    inputTypes: ['Context'],
    outputTypes: ['Decision', 'Context'],
  },
  {
    type: 'ai-execute',
    title: 'AI実行',
    category: 'execute',
    description: '将来的な Codex、Hermes、Grok、Claude、Gemini 実行をモックします。',
    agentRole: 'programmer_ai',
    inputTypes: ['Prompt', 'Context', 'Decision'],
    outputTypes: ['Result'],
  },
  {
    type: 'external-connector',
    title: '外部コネクタ',
    category: 'execute',
    description: 'APIを呼ばずに外部接続状態だけを表示します。',
    agentRole: 'research_ai',
    inputTypes: ['Context'],
    outputTypes: ['Evidence'],
  },
  {
    type: 'check',
    title: 'チェック',
    category: 'check',
    description: '品質、セキュリティ、出典、仕様照合をモックします。',
    agentRole: 'qa_ai',
    inputTypes: ['Result', 'Evidence'],
    outputTypes: ['Decision', 'Error'],
  },
  {
    type: 'aggregate',
    title: '集約',
    category: 'aggregate',
    description: 'チェック済みの結果を1つの成果物候補へまとめます。',
    agentRole: 'dev_leader_ai',
    inputTypes: ['Decision', 'Error', 'Result', 'Evidence'],
    outputTypes: ['Artifact'],
  },
  {
    type: 'output',
    title: '出力',
    category: 'output',
    description: 'Markdown、JSON、Diff、プレビューをローカル表示します。',
    agentRole: 'human',
    inputTypes: ['Artifact'],
    outputTypes: ['Artifact', 'Log'],
  },
  {
    type: 'run-log',
    title: '実行ログ',
    category: 'record',
    description: '各実行ステップ、メトリクスイベント、安全判断を記録します。',
    agentRole: 'recorder_ai',
    inputTypes: ['Log'],
    outputTypes: ['Log'],
  },
  {
    type: 'template-save',
    title: 'テンプレート保存',
    category: 'template',
    description: '成功したワークフローを再利用テンプレートとして保存する挙動をモックします。',
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
      mode: definition.type === 'ai-execute' ? 'mock' : 'local',
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
    description: '実APIを呼ばずに、型付きAI作業を可視化するローカル専用サンプルです。',
    version: 1,
    status: 'ready',
    nodes,
    connections,
    metrics,
    logs: [],
    artifact: {
      title: 'まだ成果物はありません',
      format: 'Preview',
      content: 'ローカルモックワークフローを実行して最初の成果物を生成してください。',
      status: 'draft',
    },
    createdAt: '2026-05-23T00:00:00.000Z',
    updatedAt: '2026-05-23T00:00:00.000Z',
  }
}
