import type { Workflow } from './workflow'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'
import type { AppSettings } from '../storage/localAppSettings'

export const BUNDLE_SCHEMA_VERSION = '1.0' as const
export const BUNDLE_APP_NAME = 'Agent Workflow Studio' as const

export type AgentWorkflowStudioBundle = {
  schemaVersion: typeof BUNDLE_SCHEMA_VERSION
  exportedAt: string
  appName: typeof BUNDLE_APP_NAME
  workflow: Workflow
  templates: SavedWorkflowTemplate[]
  settings?: AppSettings
  notes?: string
}

export function createWorkflowBundle(
  workflow: Workflow,
  notes?: string,
): AgentWorkflowStudioBundle {
  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: BUNDLE_APP_NAME,
    workflow,
    templates: [],
    notes,
  }
}

export function createFullBundle(
  workflow: Workflow,
  templates: SavedWorkflowTemplate[],
  settings?: AppSettings,
  notes?: string,
): AgentWorkflowStudioBundle {
  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: BUNDLE_APP_NAME,
    workflow,
    templates,
    settings,
    notes,
  }
}

export function downloadBundle(bundle: AgentWorkflowStudioBundle, filename: string): void {
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function buildExportFilename(prefix: string): string {
  const date = new Date().toLocaleDateString('sv-SE')
  return `${prefix}_${date}.aws-bundle.json`
}
