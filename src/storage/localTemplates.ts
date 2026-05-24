import { createTemplateMetadata, normalizeTemplateMetadata } from '../domain/templateMetadata'
import type { Workflow, WorkflowTemplateMetadata } from '../domain/workflow'

const TEMPLATE_STORAGE_KEY = 'agent-workflow-studio.templates.v1'

const createTemplateId = () =>
  `template-${Date.now()}-${Math.random().toString(16).slice(2)}`

export type SavedWorkflowTemplate = {
  id: string
  name: string
  description?: string
  workflowId: string
  sourceWorkflowId: string
  snapshot: Workflow
  metadata: WorkflowTemplateMetadata
  createdAt: string
  updatedAt: string
}

export type SaveWorkflowTemplateInput = {
  workflow: Workflow
  name?: string
  description?: string
  tags?: string[]
  category?: string
  lastEvaluationStatus?: string
  lastEvaluationScore?: number
  artifactVersionCount?: number
  createdFromRunId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTemplate(value: unknown): SavedWorkflowTemplate | null {
  if (!isRecord(value) || !isRecord(value.snapshot)) {
    return null
  }

  const snapshot = cloneWorkflow(value.snapshot as Workflow)
  const name =
    typeof value.name === 'string' && value.name.trim().length > 0
      ? value.name.trim()
      : snapshot.name || 'テンプレート'
  const description =
    typeof value.description === 'string' ? value.description.trim() || undefined : snapshot.description
  const createdAt =
    typeof value.createdAt === 'string' && value.createdAt
      ? value.createdAt
      : new Date().toISOString()
  const updatedAt =
    typeof value.updatedAt === 'string' && value.updatedAt
      ? value.updatedAt
      : createdAt
  const metadata = normalizeTemplateMetadata(
    snapshot,
    isRecord(value.metadata) ? (value.metadata as Partial<WorkflowTemplateMetadata>) : undefined,
  )

  return {
    id:
      typeof value.id === 'string' && value.id
        ? value.id
        : createTemplateId(),
    name,
    description,
    workflowId:
      typeof value.workflowId === 'string' && value.workflowId
        ? value.workflowId
        : snapshot.id,
    sourceWorkflowId:
      typeof value.sourceWorkflowId === 'string' && value.sourceWorkflowId
        ? value.sourceWorkflowId
        : snapshot.id,
    snapshot,
    metadata,
    createdAt,
    updatedAt,
  }
}

function instantiateTemplateWorkflow(template: SavedWorkflowTemplate): Workflow {
  const now = new Date().toISOString()
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const snapshot = cloneWorkflow(template.snapshot)
  const nodeIdByOldId = new Map(
    snapshot.nodes.map((node, index) => [node.id, `tpl-${suffix}-node-${index + 1}`]),
  )

  return {
    ...snapshot,
    id: `workflow-from-${template.id}-${suffix}`,
    name: `${template.name} workflow`,
    status: 'draft',
    metrics: {
      ...snapshot.metrics,
      bottleneckNodeId:
        snapshot.metrics.bottleneckNodeId !== null
          ? (nodeIdByOldId.get(snapshot.metrics.bottleneckNodeId) ?? null)
          : null,
    },
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      id: nodeIdByOldId.get(node.id) ?? node.id,
      status: 'idle',
      lastRun: undefined,
    })),
    connections: snapshot.connections
      .filter(
        (connection) =>
          nodeIdByOldId.has(connection.sourceNodeId) &&
          nodeIdByOldId.has(connection.targetNodeId),
      )
      .map((connection, index) => ({
        ...connection,
        id: `tpl-${suffix}-edge-${index + 1}`,
        sourceNodeId: nodeIdByOldId.get(connection.sourceNodeId) ?? connection.sourceNodeId,
        targetNodeId: nodeIdByOldId.get(connection.targetNodeId) ?? connection.targetNodeId,
        status: 'inactive',
      })),
    logs: [],
    createdAt: now,
    updatedAt: now,
  }
}

function readTemplates(): SavedWorkflowTemplate[] {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed
          .map((template) => normalizeTemplate(template))
          .filter((template): template is SavedWorkflowTemplate => template !== null)
      : []
  } catch {
    return []
  }
}

function writeTemplates(templates: SavedWorkflowTemplate[]) {
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

function cloneWorkflow(workflow: Workflow): Workflow {
  return JSON.parse(JSON.stringify(workflow)) as Workflow
}

export function saveWorkflowTemplate(
  input: SaveWorkflowTemplateInput,
): SavedWorkflowTemplate {
  const now = new Date().toISOString()
  const snapshot = cloneWorkflow(input.workflow)
  const name = input.name?.trim() || input.workflow.name
  const description = input.description?.trim() || input.workflow.description || undefined

  snapshot.name = name
  snapshot.description = description ?? ''
  snapshot.updatedAt = now

  const template: SavedWorkflowTemplate = {
    id: createTemplateId(),
    name,
    description,
    workflowId: input.workflow.id,
    sourceWorkflowId: input.workflow.id,
    snapshot,
    metadata: createTemplateMetadata({
      workflow: snapshot,
      tags: input.tags,
      category: input.category,
      lastEvaluationStatus: input.lastEvaluationStatus,
      lastEvaluationScore: input.lastEvaluationScore,
      artifactVersionCount: input.artifactVersionCount,
      createdFromRunId: input.createdFromRunId,
    }),
    createdAt: now,
    updatedAt: now,
  }
  const templates = [template, ...readTemplates()].slice(0, 20)
  writeTemplates(templates)
  return template
}

export function listWorkflowTemplates(): SavedWorkflowTemplate[] {
  return readTemplates()
}

export function loadWorkflowTemplate(id: string): Workflow | null {
  const template = readTemplates().find((item) => item.id === id)
  return template ? instantiateTemplateWorkflow(template) : null
}

export function duplicateWorkflowTemplate(id: string): SavedWorkflowTemplate | null {
  const templates = readTemplates()
  const original = templates.find((template) => template.id === id)

  if (!original) {
    return null
  }

  const now = new Date().toISOString()
  const duplicatedSnapshot = cloneWorkflow(original.snapshot)
  const duplicateName = `${original.name} のコピー`

  duplicatedSnapshot.name = duplicateName
  duplicatedSnapshot.updatedAt = now

  const duplicate: SavedWorkflowTemplate = {
    id: createTemplateId(),
    name: duplicateName,
    description: original.description,
    workflowId: original.workflowId,
    sourceWorkflowId: original.sourceWorkflowId,
    snapshot: duplicatedSnapshot,
    metadata: normalizeTemplateMetadata(duplicatedSnapshot, original.metadata),
    createdAt: now,
    updatedAt: now,
  }

  writeTemplates([duplicate, ...templates].slice(0, 20))
  return duplicate
}

export function deleteWorkflowTemplate(id: string): SavedWorkflowTemplate[] {
  const templates = readTemplates().filter((template) => template.id !== id)
  writeTemplates(templates)
  return templates
}
