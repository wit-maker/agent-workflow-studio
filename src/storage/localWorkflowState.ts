import type { Workflow } from '../domain/workflow'
import { normalizeNodeCategory } from '../domain/workflow'
import { STORAGE_KEYS } from './storageKeys'

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeWorkflow(value: unknown): value is Workflow {
  if (!isRecord(value)) return false
  return (
    isString(value['id']) &&
    isString(value['name']) &&
    Array.isArray(value['nodes']) &&
    Array.isArray(value['connections'])
  )
}

/**
 * Saves the current workflow to localStorage.
 * Silently fails if storage is unavailable or if serialization fails.
 */
export function saveCurrentWorkflow(workflow: Workflow): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_WORKFLOW, JSON.stringify(workflow))
  } catch {
    // localStorage unavailable or quota exceeded
  }
}

/**
 * Loads the current workflow from localStorage.
 * Returns null if storage is unavailable, empty, or contains broken data.
 * Broken data is silently discarded — the caller should fall back to a default.
 */
export function loadCurrentWorkflow(): Workflow | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CURRENT_WORKFLOW)
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (!looksLikeWorkflow(parsed)) {
      // Discard corrupted data
      window.localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKFLOW)
      return null
    }

    // Normalize node categories from legacy Japanese strings to canonical English keys
    const normalized: Workflow = {
      ...parsed,
      nodes: parsed.nodes.map((node) => ({
        ...node,
        category: normalizeNodeCategory(node.category),
      })),
    }

    return normalized
  } catch {
    return null
  }
}

/**
 * Removes the saved current workflow from localStorage.
 */
export function clearCurrentWorkflow(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKFLOW)
  } catch {
    // ignore
  }
}
