import { STORAGE_KEYS } from './storageKeys'

export type AppSettings = {
  canvasMode: 'standard' | 'react-flow'
  activeTab: string
}

const DEFAULT_SETTINGS: AppSettings = {
  canvasMode: 'standard',
  activeTab: 'Logs',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Loads app-level UI settings from localStorage.
 * Returns defaults if storage is unavailable or data is corrupted.
 */
export function loadAppSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)
    if (!raw) return { ...DEFAULT_SETTINGS }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS }

    const canvasMode =
      parsed['canvasMode'] === 'react-flow' ? 'react-flow' : 'standard'

    const activeTab =
      typeof parsed['activeTab'] === 'string' ? parsed['activeTab'] : DEFAULT_SETTINGS.activeTab

    return { canvasMode, activeTab }
  } catch {
    return { ...DEFAULT_SETTINGS }
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
