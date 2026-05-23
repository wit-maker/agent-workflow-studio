import type { WorkflowDataType, WorkflowNode } from './workflow'

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

const mvpAllowedPairs = new Set([
  'Manual Trigger->Text Input',
  'Text Input->Normalize',
  'File Input->Normalize',
  'Normalize->Route',
  'Route->AI Execute',
  'AI Execute->Check',
  'External Connector->Check',
  'Check->Aggregate',
  'Aggregate->Output',
  'Output->Run Log',
  'Run Log->Template Save',
])

export function canConnect(source: WorkflowNode, target: WorkflowNode): boolean {
  return getConnectionError(source, target) === null
}

export function getConnectionError(
  source: WorkflowNode,
  target: WorkflowNode,
): string | null {
  if (source.id === target.id) {
    return 'A node cannot connect to itself.'
  }

  if (mvpAllowedPairs.has(`${source.title}->${target.title}`)) {
    return null
  }

  const hasTypeMatch = source.outputTypes.some((outputType) => {
    const allowedTargets = compatibleTypes[outputType] ?? [outputType]
    return target.inputTypes.some((inputType) => allowedTargets.includes(inputType))
  })

  if (!hasTypeMatch) {
    return `Type mismatch: ${source.outputTypes.join(', ')} cannot feed ${target.inputTypes.join(', ')}.`
  }

  if (target.title === 'Output' && source.title !== 'Aggregate') {
    return 'Output should receive artifacts after the Check and Aggregate path.'
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
