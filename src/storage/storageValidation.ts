import { STORAGE_KEYS } from './storageKeys'

export type StorageEntryHealth = {
  key: string
  label: string
  present: boolean
  sizeBytes: number
  valid: boolean
  error?: string
}

export type StorageHealth = {
  available: boolean
  totalBytes: number
  entries: StorageEntryHealth[]
  corruptedKeys: string[]
}

const KEY_LABELS: Record<string, string> = {
  [STORAGE_KEYS.CURRENT_WORKFLOW]: '現在のワークフロー',
  [STORAGE_KEYS.TEMPLATES]: 'テンプレート',
  [STORAGE_KEYS.SNAPSHOTS]: '履歴スナップショット',
  [STORAGE_KEYS.CANVAS_MODE]: 'キャンバスモード',
  [STORAGE_KEYS.REACT_FLOW_POSITIONS]: 'React Flow 位置情報',
  [STORAGE_KEYS.APP_SETTINGS]: 'アプリ設定',
  [STORAGE_KEYS.RUN_HISTORY]: '実行履歴',
}

const KEY_FORMATS: Record<string, 'json' | 'plain-string'> = {
  [STORAGE_KEYS.CURRENT_WORKFLOW]: 'json',
  [STORAGE_KEYS.TEMPLATES]: 'json',
  [STORAGE_KEYS.SNAPSHOTS]: 'json',
  [STORAGE_KEYS.CANVAS_MODE]: 'plain-string',
  [STORAGE_KEYS.REACT_FLOW_POSITIONS]: 'json',
  [STORAGE_KEYS.APP_SETTINGS]: 'json',
  [STORAGE_KEYS.RUN_HISTORY]: 'json',
}

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__aws_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

function checkEntry(key: string): StorageEntryHealth {
  const label = KEY_LABELS[key] ?? key
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return { key, label, present: false, sizeBytes: 0, valid: true }
    }
    const sizeBytes = new TextEncoder().encode(raw).length
    if ((KEY_FORMATS[key] ?? 'json') === 'json') {
      JSON.parse(raw)
    }
    return { key, label, present: true, sizeBytes, valid: true }
  } catch (e) {
    return {
      key,
      label,
      present: true,
      sizeBytes: new TextEncoder().encode(window.localStorage.getItem(key) ?? '').length,
      valid: false,
      error: e instanceof Error ? e.message : '解析エラー',
    }
  }
}

export function getStorageHealth(): StorageHealth {
  const available = isLocalStorageAvailable()
  if (!available) {
    return {
      available: false,
      totalBytes: 0,
      entries: Object.values(STORAGE_KEYS).map((key) => ({
        key,
        label: KEY_LABELS[key] ?? key,
        present: false,
        sizeBytes: 0,
        valid: false,
        error: 'localStorage 利用不可',
      })),
      corruptedKeys: [],
    }
  }

  const entries = Object.values(STORAGE_KEYS).map(checkEntry)
  const corruptedKeys = entries.filter((e) => e.present && !e.valid).map((e) => e.key)
  const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0)

  return { available, totalBytes, entries, corruptedKeys }
}

export function discardCorruptedEntries(): string[] {
  const health = getStorageHealth()
  const removed: string[] = []
  for (const entry of health.entries) {
    if (entry.present && !entry.valid) {
      try {
        window.localStorage.removeItem(entry.key)
        removed.push(entry.key)
      } catch {
        // ignore
      }
    }
  }
  return removed
}
