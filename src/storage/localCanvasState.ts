import { STORAGE_KEYS } from './storageKeys'

const CANVAS_MODE_STORAGE_KEY = STORAGE_KEYS.CANVAS_MODE
const REACT_FLOW_POSITIONS_STORAGE_KEY = STORAGE_KEYS.REACT_FLOW_POSITIONS

export type SavedCanvasMode = 'standard' | 'react-flow'

export type SavedReactFlowPositions = Record<string, { x: number; y: number }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function readCanvasModePreference(): SavedCanvasMode | null {
  try {
    const raw = window.localStorage.getItem(CANVAS_MODE_STORAGE_KEY)
    return raw === 'standard' || raw === 'react-flow' ? raw : null
  } catch {
    return null
  }
}

export function writeCanvasModePreference(mode: SavedCanvasMode) {
  try {
    window.localStorage.setItem(CANVAS_MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage が使えない環境では保存を諦める
  }
}

export function readReactFlowPositions(): SavedReactFlowPositions {
  try {
    const raw = window.localStorage.getItem(REACT_FLOW_POSITIONS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return {}
    }

    const normalized: SavedReactFlowPositions = {}
    for (const [nodeId, position] of Object.entries(parsed)) {
      if (
        isRecord(position) &&
        isFiniteNumber(position.x) &&
        isFiniteNumber(position.y)
      ) {
        normalized[nodeId] = {
          x: position.x,
          y: position.y,
        }
      }
    }

    return normalized
  } catch {
    return {}
  }
}

export function writeReactFlowPositions(positions: SavedReactFlowPositions) {
  try {
    window.localStorage.setItem(
      REACT_FLOW_POSITIONS_STORAGE_KEY,
      JSON.stringify(positions),
    )
  } catch {
    // localStorage が使えない環境では保存を諦める
  }
}

export function clearReactFlowPositions() {
  try {
    window.localStorage.removeItem(REACT_FLOW_POSITIONS_STORAGE_KEY)
  } catch {
    // localStorage が使えない環境では削除を諦める
  }
}
