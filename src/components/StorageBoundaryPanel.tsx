import { useState } from 'react'
import { storageAdapter } from '../storage/storageAdapter'
import { discardCorruptedEntries } from '../storage/storageValidation'

export function StorageBoundaryPanel() {
  const [health, setHealth] = useState(() => storageAdapter.getStorageHealth())

  function refresh() {
    setHealth(storageAdapter.getStorageHealth())
  }

  function handleDiscardCorrupted() {
    const removed = discardCorruptedEntries()
    refresh()
    if (removed.length > 0) {
      alert(`破損データを削除しました: ${removed.length} 件`)
    }
  }

  const totalKb = (health.totalBytes / 1024).toFixed(1)
  const hasCorrupted = health.corruptedKeys.length > 0

  return (
    <div className="storage-boundary-panel">
      <div className="storage-health-header">
        <h4>ストレージ境界ヘルス</h4>
        <span className={health.available ? 'health-ok' : 'health-error'}>
          {health.available ? '✓ 利用可能' : '✗ 利用不可'}
        </span>
        <button type="button" className="icon-button" onClick={refresh}>
          更新
        </button>
      </div>

      <p className="muted">
        合計使用量: <strong>{totalKb} KB</strong>
        {hasCorrupted ? (
          <span className="health-warn"> ／ 破損データあり: {health.corruptedKeys.length} 件</span>
        ) : null}
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
          {health.entries.map((entry) => (
            <tr key={entry.key}>
              <td>{entry.label}</td>
              <td>
                {entry.present
                  ? entry.sizeBytes >= 1024
                    ? `${(entry.sizeBytes / 1024).toFixed(1)} KB`
                    : `${entry.sizeBytes} B`
                  : '—'}
              </td>
              <td>
                {!entry.present ? (
                  <span className="persist-empty">未保存</span>
                ) : entry.valid ? (
                  <span className="persist-saved">保存済み</span>
                ) : (
                  <span className="health-error" title={entry.error}>
                    破損
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasCorrupted ? (
        <div className="persistence-actions">
          <button type="button" className="danger-button" onClick={handleDiscardCorrupted}>
            破損データを削除
          </button>
        </div>
      ) : null}
    </div>
  )
}
