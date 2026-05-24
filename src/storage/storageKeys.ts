// Central registry of all localStorage keys used by Agent Workflow Studio.
// Existing keys kept for reference alongside new keys.

export const STORAGE_KEYS = {
  // Existing keys (defined in their respective modules, listed here for reference)
  CANVAS_MODE: 'agent-workflow-studio:canvas-mode',
  REACT_FLOW_POSITIONS: 'agent-workflow-studio:react-flow-positions',
  SNAPSHOTS: 'agent-workflow-studio.snapshots.v1',
  TEMPLATES: 'agent-workflow-studio.templates.v1',

  // New keys added in M10
  CURRENT_WORKFLOW: 'agent-workflow-studio.workflow.current.v1',
  APP_SETTINGS: 'agent-workflow-studio.app-settings.v1',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
