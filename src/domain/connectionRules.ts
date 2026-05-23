import type { ConnectionKind, WorkflowDataType, WorkflowNode } from './workflow'
import { connectionKinds } from './workflow'

export type ConnectionValidationSeverity = 'info' | 'warn' | 'error'

const compatibleTypes: Partial<Record<WorkflowDataType, WorkflowDataType[]>> = {
  Trigger: ['Trigger'],
  Text: ['Text', 'Prompt', 'Context', 'Markdown'],
  File: ['File', 'Text', 'Context'],
  Prompt: ['Prompt', 'Context'],
  Context: ['Context', 'Prompt'],
  Decision: ['Decision', 'Context'],
  Result: ['Result', 'Artifact'],
  Evidence: ['Evidence', 'Context'],
  Error: ['Error', 'Decision'],
  Artifact: ['Artifact', 'Markdown', 'JSON'],
  Log: ['Log'],
  Metric: ['Metric'],
}

export function isKnownConnectionKind(kind: string): kind is ConnectionKind {
  return connectionKinds.includes(kind as ConnectionKind)
}

export function getCompatibleTargetTypes(
  outputType: WorkflowDataType,
): WorkflowDataType[] {
  return compatibleTypes[outputType] ?? [outputType]
}

export function canCarryToInput(
  outputType: WorkflowDataType,
  inputType: WorkflowDataType,
): boolean {
  return getCompatibleTargetTypes(outputType).includes(inputType)
}

const mvpAllowedPairs = new Set([
  '手動開始->テキスト入力',
  'テキスト入力->正規化',
  'ファイル入力->正規化',
  '正規化->ルーティング',
  'ルーティング->AI実行',
  'AI実行->チェック',
  '外部コネクタ->チェック',
  'チェック->集約',
  '集約->出力',
  '出力->実行ログ',
  '実行ログ->テンプレート保存',
])

export function canConnect(source: WorkflowNode, target: WorkflowNode): boolean {
  return getConnectionError(source, target) === null
}

export function getConnectionError(
  source: WorkflowNode,
  target: WorkflowNode,
): string | null {
  if (source.id === target.id) {
    return 'ノードは自分自身へ接続できません。'
  }

  if (mvpAllowedPairs.has(`${source.title}->${target.title}`)) {
    return null
  }

  const hasTypeMatch = source.outputTypes.some((outputType) => {
    const allowedTargets = compatibleTypes[outputType] ?? [outputType]
    return target.inputTypes.some((inputType) => allowedTargets.includes(inputType))
  })

  if (!hasTypeMatch) {
    return `型が一致しません: ${source.outputTypes.join(', ')} を ${target.inputTypes.join(', ')} へ渡せません。`
  }

  if (target.title === '出力' && source.title !== '集約') {
    return '出力ノードはチェックと集約の後に成果物を受け取る想定です。'
  }

  return null
}

export function calculateBottleneck(nodes: WorkflowNode[]): WorkflowNode | null {
  return nodes.reduce<WorkflowNode | null>((current, node) => {
    const score =
      node.metrics?.bottleneckScore ??
      (node.metrics?.estimatedLatencyMs ?? 0) +
        (node.metrics?.retryCount ?? 0) * 1000 +
        (node.metrics?.errorCount ?? 0) * 3000

    const currentScore =
      current?.metrics?.bottleneckScore ??
      (current?.metrics?.estimatedLatencyMs ?? 0) +
        (current?.metrics?.retryCount ?? 0) * 1000 +
        (current?.metrics?.errorCount ?? 0) * 3000

    return !current || score > currentScore ? node : current
  }, null)
}
