import { useState } from 'react'
import { rebuildStatusLabels } from '../domain/displayLabels'
import type { RebuildRequest } from '../domain/evaluation'

type RebuildPanelProps = {
  rebuildRequests: RebuildRequest[]
  onStartRebuild: (requestId: string) => void
  onCancelRebuild: (requestId: string) => void
}

export function RebuildPanel({
  rebuildRequests,
  onStartRebuild,
  onCancelRebuild,
}: RebuildPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pending = rebuildRequests.filter((r) => r.status === 'requested')
  const completed = rebuildRequests.filter(
    (r) => r.status === 'completed' || r.status === 'cancelled',
  )

  return (
    <div className="rebuild-panel">
      <div className="panel-section-heading">
        <span>再作成リクエスト</span>
        <span className="muted">
          {rebuildRequests.length} 件 / 完了 {completed.length} 件
        </span>
      </div>

      {rebuildRequests.length === 0 ? (
        <p className="muted">再作成リクエストはありません。修正依頼から作成されます。</p>
      ) : (
        <ul className="rebuild-list">
          {rebuildRequests.map((req) => (
            <li key={req.id} className={`rebuild-item rebuild-${req.status}`}>
              <div
                className="rebuild-item-header"
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setExpandedId(expandedId === req.id ? null : req.id)
                  }
                }}
              >
                <span className={`rebuild-status-badge rebuild-badge-${req.status}`}>
                  {rebuildStatusLabels[req.status]}
                </span>
                <span className="rebuild-reason">{req.reason}</span>
                <span className="muted rebuild-time">
                  {new Date(req.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>

              {expandedId === req.id && (
                <div className="rebuild-item-detail">
                  <p>
                    <strong>指示:</strong> {req.instruction}
                  </p>
                  <div className="rebuild-item-actions">
                    {req.status === 'requested' && (
                      <>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => onStartRebuild(req.id)}
                        >
                          再作成を実行
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => onCancelRebuild(req.id)}
                        >
                          キャンセル
                        </button>
                      </>
                    )}
                    {req.status === 'running' && (
                      <span className="muted">再作成中...</span>
                    )}
                    {req.status === 'completed' && (
                      <span className="eval-passed">完了済み</span>
                    )}
                    {req.status === 'cancelled' && (
                      <span className="muted">キャンセル済み</span>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <p className="muted rebuild-hint">
          「再作成を実行」ボタンでモック再作成が行われ、成果物バージョンが追加されます。
        </p>
      )}
    </div>
  )
}
