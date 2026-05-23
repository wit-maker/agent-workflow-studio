import { useState } from 'react'
import { rebuildStatusLabels } from '../domain/displayLabels'
import type { RebuildRequest } from '../domain/evaluation'

type RebuildPanelProps = {
  rebuildRequests: RebuildRequest[]
  onStartRebuild: (requestId: string) => void
  onCancelRebuild: (requestId: string) => void
}

export function RebuildPanel({ rebuildRequests, onStartRebuild, onCancelRebuild }: RebuildPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (rebuildRequests.length === 0) {
    return (
      <div className="rebuild-panel">
        <h3>再作成リクエスト</h3>
        <p className="muted">再作成リクエストはありません。</p>
      </div>
    )
  }

  return (
    <div className="rebuild-panel">
      <h3>再作成リクエスト</h3>
      <ul className="rebuild-list">
        {rebuildRequests.map((req) => (
          <li key={req.id} className={`rebuild-item rebuild-item-${req.status}`}>
            <div
              className="rebuild-item-header"
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setExpandedId(expandedId === req.id ? null : req.id)
                }
              }}
            >
              <span className={`rebuild-status-badge rebuild-status-${req.status}`}>
                {rebuildStatusLabels[req.status]}
              </span>
              <span className="rebuild-reason">{req.reason}</span>
              <time className="rebuild-created-at">
                {new Date(req.createdAt).toLocaleString('ja-JP')}
              </time>
              <span className="rebuild-expand-icon">{expandedId === req.id ? '▲' : '▼'}</span>
            </div>

            {expandedId === req.id ? (
              <div className="rebuild-item-body">
                <p className="rebuild-instruction-label">指示:</p>
                <p className="rebuild-instruction">{req.instruction}</p>
                <div className="rebuild-item-actions">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="primary-button btn-sm"
                        onClick={() => onStartRebuild(req.id)}
                      >
                        実行
                      </button>
                      <button
                        type="button"
                        className="icon-button btn-sm"
                        onClick={() => onCancelRebuild(req.id)}
                      >
                        キャンセル
                      </button>
                    </>
                  ) : null}
                  {req.status === 'running' ? (
                    <button
                      type="button"
                      className="icon-button btn-sm"
                      onClick={() => onCancelRebuild(req.id)}
                    >
                      中断
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
