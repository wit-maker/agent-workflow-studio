// Run History の localStorage 暫定保存層 (Phase 1b)。
//
// - 保存対象は集計値、メタデータ、credential-safe trace/audit summary のみ。
// - logs 本文 / prompt 全文 / raw payload / artifact 本文 / credential / API key は保存しない。
// - 件数は MAX_RUN_HISTORY_ENTRIES (最新50件) を上限とする。
// - 不正 JSON / 旧形式は安全に破棄して empty 扱いにする。
//
// 将来 Tauri filesystem / SQLite に置き換える際は IStorageAdapter 経由へ移す。

import {
  createEmptyRunHistory,
  normalizeRunHistory,
  type WorkflowRunHistory,
  type WorkflowRunRecord,
} from '../domain/runHistory'
import { STORAGE_KEYS } from './storageKeys'

export const MAX_RUN_HISTORY_ENTRIES = 50

function safeNow(): string {
  return new Date().toISOString()
}

function readRawHistory(): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.RUN_HISTORY)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeHistory(history: WorkflowRunHistory): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.RUN_HISTORY, JSON.stringify(history))
  } catch (e) {
    console.warn('[runHistoryStorage] Failed to save run history (localStorage unavailable or quota exceeded):', e)
  }
}

/**
 * Run History をロードする。存在しない / 壊れている場合は空履歴。
 * 不正データは静かに破棄し、empty を返す。
 */
export function loadRunHistory(): WorkflowRunHistory {
  const raw = readRawHistory()
  if (raw === null) return createEmptyRunHistory(safeNow())
  return normalizeRunHistory(raw, safeNow())
}

/**
 * Run History を保存する。50件超は最新側を残して切り詰める。
 */
export function saveRunHistory(history: WorkflowRunHistory): WorkflowRunHistory {
  const trimmed: WorkflowRunHistory = {
    schemaVersion: history.schemaVersion,
    records: history.records.slice(-MAX_RUN_HISTORY_ENTRIES),
    updatedAt: history.updatedAt,
  }
  writeHistory(trimmed)
  return trimmed
}

/**
 * 1件の Run Record を Run History に追加する。
 * - 同じ runId が既に存在する場合は新しい record で置き換える。
 * - 件数上限を超えると古い側から切り捨てる。
 * - 戻り値は更新後の history。
 */
export function appendRunRecord(record: WorkflowRunRecord): WorkflowRunHistory {
  const current = loadRunHistory()
  const filtered = current.records.filter((r) => r.runId !== record.runId)
  const nextRecords = [...filtered, record].slice(-MAX_RUN_HISTORY_ENTRIES)
  const next: WorkflowRunHistory = {
    schemaVersion: current.schemaVersion,
    records: nextRecords,
    updatedAt: safeNow(),
  }
  writeHistory(next)
  return next
}

/**
 * Run History を削除する。
 */
export function clearRunHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.RUN_HISTORY)
  } catch {
    // ignore
  }
}
