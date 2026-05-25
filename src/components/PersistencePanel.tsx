import { useState } from 'react'
import { STORAGE_KEYS } from '../storage/storageKeys'

type PersistencePanelProps = {
  onResetStorage: () => void
}

function getStorageSize(key: string): string {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return '—'
    const bytes = new TextEncoder().encode(raw).length
    return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`
  } catch {
    return '—'
  }
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

export function PersistencePanel({ onResetStorage }: PersistencePanelProps) {
  const [confirmReset, setConfirmReset] = useState(false)

  const entries = Object.values(STORAGE_KEYS).map((key) => ({
    key,
    label: KEY_LABELS[key] ?? key,
    size: getStorageSize(key),
    present: (() => {
      try {
        return window.localStorage.getItem(key) !== null
      } catch {
        return false
      }
    })(),
  }))

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    onResetStorage()
    setConfirmReset(false)
  }

  return (
    <div className="persistence-panel">
      <h4>ローカル永続化ストレージ</h4>
      <p className="muted persistence-note">
        アプリのデータは localStorage に保存されます。リロード後もワークフローとテンプレートが復元されます。
      </p>

      <table className="persistence-table">
        <thead>
          <tr>
            <th>項目</th>
            <th>サイズ</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.key}>
              <td>{entry.label}</td>
              <td>{entry.size}</td>
              <td>
                <span className={entry.present ? 'persist-saved' : 'persist-empty'}>
                  {entry.present ? '保存済み' : '未保存'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="persistence-actions">
        {confirmReset ? (
          <>
            <span className="reset-confirm-label">全データを削除します。本当によいですか？</span>
            <button type="button" className="danger-button" onClick={handleReset}>
              はい、リセット
            </button>
            <button type="button" className="icon-button" onClick={() => setConfirmReset(false)}>
              キャンセル
            </button>
          </>
        ) : (
          <button type="button" className="icon-button" onClick={handleReset}>
            ストレージをリセット
          </button>
        )}
      </div>
    </div>
  )
}
