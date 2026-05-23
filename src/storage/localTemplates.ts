import type { Workflow } from '../domain/workflow'

const TEMPLATE_STORAGE_KEY = 'agent-workflow-studio.templates.v1'

export type SavedWorkflowTemplate = {
  id: string
  name: string
  description?: string
  workflowId: string
  snapshot: Workflow
  createdAt: string
  updatedAt: string
}

function readTemplates(): SavedWorkflowTemplate[] {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as SavedWorkflowTemplate[]) : []
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

export function saveWorkflowTemplate(workflow: Workflow): SavedWorkflowTemplate {
  const now = new Date().toISOString()
  const template: SavedWorkflowTemplate = {
    id: `template-${Date.now()}`,
    name: `${workflow.name} Template`,
    description: workflow.description,
    workflowId: workflow.id,
    snapshot: cloneWorkflow(workflow),
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

export function deleteWorkflowTemplate(id: string): SavedWorkflowTemplate[] {
  const templates = readTemplates().filter((template) => template.id !== id)
  writeTemplates(templates)
  return templates
}
