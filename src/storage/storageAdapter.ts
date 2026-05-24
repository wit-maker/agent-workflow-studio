import type { Workflow, WorkflowTemplateMetadata } from '../domain/workflow'
import type { AppSettings } from './localAppSettings'
import type { SavedReactFlowPositions } from './localCanvasState'
import { localStorageAdapter } from './localStorageAdapter'
import type {
  SavedWorkflowTemplate,
  SaveWorkflowTemplateInput,
} from './localTemplates'
import type { StorageHealth } from './storageValidation'

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
  loadReactFlowPositions(): SavedReactFlowPositions
  saveReactFlowPositions(positions: SavedReactFlowPositions): void
  clearAll(): void
  getStorageHealth(): StorageHealth
}

/**
 * The active storage adapter.
 * Swap this export to switch storage implementations without changing call sites.
 */
export const storageAdapter: IStorageAdapter = localStorageAdapter
