import type { Workflow, WorkflowNode } from './workflow'

export type RunMode = 'all' | 'selected' | 'fromSelected' | 'dryRun' | 'validate'

export type ExecutionQueueItem = {
  nodeId: string
  nodeTitle: string
  status: WorkflowNode['status']
}

export type PlannedRun = {
  mode: RunMode
  validateOnly: boolean
  nodes: WorkflowNode[]
  queue: ExecutionQueueItem[]
  warnings: string[]
}

function findSelectedIndex(workflow: Workflow, selectedNodeId: string): number {
  const index = workflow.nodes.findIndex((node) => node.id === selectedNodeId)
  return index >= 0 ? index : 0
}

export function planWorkflowRun(
  workflow: Workflow,
  mode: RunMode,
  selectedNodeId: string,
): PlannedRun {
  const selectedIndex = findSelectedIndex(workflow, selectedNodeId)
  const selectedNode = workflow.nodes[selectedIndex]
  const warnings: string[] = []

  let nodes: WorkflowNode[]

  if (mode === 'selected') {
    nodes = selectedNode ? [selectedNode] : []
  } else if (mode === 'fromSelected') {
    nodes = workflow.nodes.slice(selectedIndex)
  } else {
    nodes = workflow.nodes
  }

  if (nodes.length === 0) {
    warnings.push('No nodes are available for this run mode.')
  }

  return {
    mode,
    validateOnly: mode === 'dryRun' || mode === 'validate',
    nodes,
    queue: nodes.map((node) => ({
      nodeId: node.id,
      nodeTitle: node.title,
      status: mode === 'dryRun' || mode === 'validate' ? 'skipped' : 'queued',
    })),
    warnings,
  }
}
