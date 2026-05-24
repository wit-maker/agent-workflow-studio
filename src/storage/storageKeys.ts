// Central registry of all localStorage keys used by Agent Workflow Studio.

export const STORAGE_KEYS = {
  CANVAS_MODE: 'agent-workflow-studio:canvas-mode',
  REACT_FLOW_POSITIONS: 'agent-workflow-studio:react-flow-positions',
  SNAPSHOTS: 'agent-workflow-studio.snapshots.v1',
  TEMPLATES: 'agent-workflow-studio.templates.v1',
  CURRENT_WORKFLOW: 'agent-workflow-studio.workflow.current.v1',
  APP_SETTINGS: 'agent-workflow-studio.app-settings.v1',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
