import type { Workflow, WorkflowTemplateMetadata } from '../domain/workflow'
import { loadAppSettings, saveAppSettings, clearAppSettings, type AppSettings } from './localAppSettings'
import {
  listWorkflowTemplates,
  saveWorkflowTemplate,
  deleteWorkflowTemplate,
  type SavedWorkflowTemplate,
  type SaveWorkflowTemplateInput,
} from './localTemplates'
import { loadCurrentWorkflow, saveCurrentWorkflow, clearCurrentWorkflow } from './localWorkflowState'
import { clearReactFlowPositions } from './localCanvasState'

/**
 * Storage adapter interface.
 *
 * Abstracts the persistence layer so the app can run against localStorage today
 * and switch to a Tauri file-system backend without changing call sites.
 *
 * All methods are synchronous to match localStorage.
 * A future Tauri adapter may return Promise<T> — callers should be prepared for that
 * when the interface is upgraded.
 */
export interface IStorageAdapter {
  loadWorkflow(): Workflow | null
  saveWorkflow(workflow: Workflow): void
  loadTemplates(): SavedWorkflowTemplate[]
  saveTemplate(input: SaveWorkflowTemplateInput & { metadata: WorkflowTemplateMetadata }): SavedWorkflowTemplate
  deleteTemplate(id: string): SavedWorkflowTemplate[]
  loadSettings(): AppSettings
  saveSettings(settings: Partial<AppSettings>): void
  clearAll(): void
}

/**
 * localStorage implementation of IStorageAdapter.
 *
 * This is the only adapter shipped for now.
 * A Tauri adapter would implement the same interface using Tauri's fs plugin.
 */
const localStorageAdapter: IStorageAdapter = {
  loadWorkflow() {
    return loadCurrentWorkflow()
  },

  saveWorkflow(workflow) {
    saveCurrentWorkflow(workflow)
  },

  loadTemplates() {
    return listWorkflowTemplates()
  },

  saveTemplate(input) {
    return saveWorkflowTemplate(input)
  },

  deleteTemplate(id) {
    return deleteWorkflowTemplate(id)
  },

  loadSettings() {
    return loadAppSettings()
  },

  saveSettings(settings) {
    saveAppSettings(settings)
  },

  clearAll() {
    clearCurrentWorkflow()
    clearAppSettings()
    clearReactFlowPositions()
  },
}

/**
 * The active storage adapter.
 * Swap this export to switch storage implementations without changing call sites.
 */
export const storageAdapter: IStorageAdapter = localStorageAdapter
