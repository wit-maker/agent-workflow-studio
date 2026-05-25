import { STORAGE_KEYS } from './storageKeys'

export type AppSettings = {
  canvasMode: 'standard' | 'react-flow'
  activeTab: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  canvasMode: 'standard',
  activeTab: 'Logs',
}

const VALID_MONITOR_TABS = new Set([
  'HUD',
  'Logs',
  'Metrics',
  'Queue',
  'Output',
  'Execution',
  'Evaluation',
  'Agent',
  'Storage',
  'Roadmap',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeAppSettings(value: unknown): AppSettings | null {
  if (!isRecord(value)) {
    return null
  }

  const canvasMode =
    value['canvasMode'] === 'react-flow' ? 'react-flow' : DEFAULT_APP_SETTINGS.canvasMode

  const activeTab =
    typeof value['activeTab'] === 'string' && VALID_MONITOR_TABS.has(value['activeTab'])
      ? value['activeTab']
      : DEFAULT_APP_SETTINGS.activeTab

  return { canvasMode, activeTab }
}

/**
 * Loads app-level UI settings from localStorage.
 * Returns defaults if storage is unavailable or data is corrupted.
 */
export function loadAppSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)
    if (!raw) return { ...DEFAULT_APP_SETTINGS }

    const parsed = JSON.parse(raw) as unknown
    return normalizeAppSettings(parsed) ?? { ...DEFAULT_APP_SETTINGS }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

/**
 * Saves app-level UI settings to localStorage.
 * Silently fails if storage is unavailable.
 */
export function saveAppSettings(settings: Partial<AppSettings>): void {
  try {
    const current = loadAppSettings()
    const next: AppSettings = { ...current, ...settings }
    window.localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(next))
  } catch {
    // ignore
  }
}

/**
 * Removes saved app settings from localStorage.
 */
export function clearAppSettings(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.APP_SETTINGS)
  } catch {
    // ignore
  }
}
