import { createTemplateMetadata, normalizeTemplateMetadata } from '../domain/templateMetadata'
import type { Workflow, WorkflowTemplateMetadata } from '../domain/workflow'

const TEMPLATE_STORAGE_KEY = 'agent-workflow-studio.templates.v1'

export type SavedWorkflowTemplate = {
  id: string
  name: string
  description?: string
  workflowId: string
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
        : `template-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    description,
    workflowId:
      typeof value.workflowId === 'string' && value.workflowId
        ? value.workflowId
        : snapshot.id,
    snapshot,
    metadata,
    createdAt,
    updatedAt,
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
    id: `template-${Date.now()}`,
    name,
    description,
    workflowId: input.workflow.id,
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
  return readTemplates().find((template) => template.id === id)?.snapshot ?? null
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
    id: `template-${Date.now()}`,
    name: duplicateName,
    description: original.description,
    workflowId: original.workflowId,
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
