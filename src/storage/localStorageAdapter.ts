import {
  clearAppSettings,
  loadAppSettings,
  saveAppSettings,
} from './localAppSettings'
import {
  clearReactFlowPositions,
  readReactFlowPositions,
  writeReactFlowPositions,
} from './localCanvasState'
import {
  deleteWorkflowTemplate,
  listWorkflowTemplates,
  replaceWorkflowTemplates,
  saveWorkflowTemplate,
} from './localTemplates'
import { clearCurrentWorkflow, loadCurrentWorkflow, saveCurrentWorkflow } from './localWorkflowState'
import { clearRunHistory } from './runHistoryStorage'
import { getStorageHealth } from './storageValidation'
import type { IStorageAdapter } from './storageAdapter'

/**
 * localStorage implementation of IStorageAdapter.
 *
 * This is the only adapter shipped for now.
 * A future Tauri adapter should implement the same boundary without changing call sites.
 */
export const localStorageAdapter: IStorageAdapter = {
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

  replaceTemplates(templates) {
    return replaceWorkflowTemplates(templates)
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

  loadReactFlowPositions() {
    return readReactFlowPositions()
  },

  saveReactFlowPositions(positions) {
    writeReactFlowPositions(positions)
  },

  clearAll() {
    clearCurrentWorkflow()
    clearAppSettings()
    clearReactFlowPositions()
    clearRunHistory()
  },

  getStorageHealth() {
    return getStorageHealth()
  },
}
