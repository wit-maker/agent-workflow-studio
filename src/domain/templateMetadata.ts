import type { EvaluationStatus } from './evaluation'
import {
  getInputPorts,
  getUnconnectedRequiredInputPorts,
} from './portRules'
import type { Workflow, WorkflowTemplateMetadata } from './workflow'

type TemplateMetadataInput = {
  workflow: Workflow
  tags?: string[]
  category?: string
  lastEvaluationStatus?: EvaluationStatus | string
  lastEvaluationScore?: number
  artifactVersionCount?: number
  createdFromRunId?: string
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return []
  }

  const unique = new Set<string>()

  tags.forEach((tag) => {
    const normalized = tag.trim()
    if (normalized) {
      unique.add(normalized)
    }
  })

  return [...unique]
}

function normalizeCategory(category: string | undefined): string | undefined {
  const normalized = category?.trim()
  return normalized ? normalized : undefined
}

function normalizeOptionalNumber(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined
  }
  return value
}

function calculatePortSummary(workflow: Workflow) {
  return workflow.nodes.reduce(
    (summary, node) => {
      const inputPorts = getInputPorts(node)
      return {
        requiredPortCount:
          summary.requiredPortCount + inputPorts.filter((port) => port.required).length,
        unconnectedRequiredPortCount:
          summary.unconnectedRequiredPortCount +
          getUnconnectedRequiredInputPorts(node, workflow.connections).length,
      }
    },
    {
      requiredPortCount: 0,
      unconnectedRequiredPortCount: 0,
    },
  )
}

export function createTemplateMetadata(
  input: TemplateMetadataInput,
): WorkflowTemplateMetadata {
  const portSummary = calculatePortSummary(input.workflow)

  return {
    tags: normalizeTags(input.tags),
    category: normalizeCategory(input.category),
    nodeCount: input.workflow.nodes.length,
    connectionCount: input.workflow.connections.length,
    requiredPortCount: portSummary.requiredPortCount,
    unconnectedRequiredPortCount: portSummary.unconnectedRequiredPortCount,
    lastEvaluationStatus: input.lastEvaluationStatus?.trim() || undefined,
    lastEvaluationScore: normalizeOptionalNumber(input.lastEvaluationScore),
    artifactVersionCount: normalizeOptionalNumber(input.artifactVersionCount),
    createdFromRunId: input.createdFromRunId?.trim() || undefined,
  }
}

export function normalizeTemplateMetadata(
  workflow: Workflow,
  metadata?: Partial<WorkflowTemplateMetadata>,
): WorkflowTemplateMetadata {
  return createTemplateMetadata({
    workflow,
    tags: metadata?.tags,
    category: metadata?.category,
    lastEvaluationStatus: metadata?.lastEvaluationStatus,
    lastEvaluationScore: metadata?.lastEvaluationScore,
    artifactVersionCount: metadata?.artifactVersionCount,
    createdFromRunId: metadata?.createdFromRunId,
  })
}
