import type { Workflow } from '../domain/workflow'

const SNAPSHOT_STORAGE_KEY = 'agent-workflow-studio.snapshots.v1'

export type SavedWorkflowSnapshot = {
  id: string
  workflowId: string
  name: string
  snapshot: Workflow
  createdAt: string
}

function readSnapshots(): SavedWorkflowSnapshot[] {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as SavedWorkflowSnapshot[]) : []
  } catch {
    return []
  }
}

function writeSnapshots(snapshots: SavedWorkflowSnapshot[]) {
  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots))
}

function cloneWorkflow(workflow: Workflow): Workflow {
  return JSON.parse(JSON.stringify(workflow)) as Workflow
}

export function saveWorkflowSnapshot(workflow: Workflow): SavedWorkflowSnapshot {
  const snapshot: SavedWorkflowSnapshot = {
    id: `snapshot-${Date.now()}`,
    workflowId: workflow.id,
    name: workflow.name,
    snapshot: cloneWorkflow(workflow),
    createdAt: new Date().toISOString(),
  }
  const snapshots = [snapshot, ...readSnapshots()].slice(0, 30)
  writeSnapshots(snapshots)
  return snapshot
}

export function listWorkflowSnapshots(): SavedWorkflowSnapshot[] {
  return readSnapshots()
}

export function loadWorkflowSnapshot(id: string): Workflow | null {
  return readSnapshots().find((snapshot) => snapshot.id === id)?.snapshot ?? null
}

export function deleteWorkflowSnapshot(id: string): SavedWorkflowSnapshot[] {
  const snapshots = readSnapshots().filter((snapshot) => snapshot.id !== id)
  writeSnapshots(snapshots)
  return snapshots
}
