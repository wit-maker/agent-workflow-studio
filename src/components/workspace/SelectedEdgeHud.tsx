import { useState } from 'react'
import type { SelectedEdgeHudView } from '../../domain/cognitiveHud'

type SelectedEdgeHudProps = {
  view: SelectedEdgeHudView | null
  onSelectSource: (nodeId: string) => void
  onSelectTarget: (nodeId: string) => void
  onDeleteEdge: (connectionId: string) => void
}

export function SelectedEdgeHud({
  view,
  onSelectSource,
  onSelectTarget,
  onDeleteEdge,
}: SelectedEdgeHudProps) {
  const [copied, setCopied] = useState(false)

  if (!view) {
    return null
  }

  const safeView = view

  function copySummary() {
    if (!navigator.clipboard) {
      return
    }
    void navigator.clipboard.writeText(safeView.safeCopySummary).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  function deleteEdge() {
    if (!window.confirm(`接続を削除しますか？\n${safeView.sourceTitle} -> ${safeView.targetTitle}`)) {
      return
    }
    onDeleteEdge(safeView.connectionId)
  }

  return (
    <aside
      className={`selected-edge-hud selected-edge-hud-${view.health}`}
      aria-label="選択エッジHUD"
    >
      <header className="selected-edge-hud-header">
        <span className="eyebrow">L2 Flow HUD</span>
        <strong>{view.label}</strong>
        <span className={`status-pill status-${view.status}`}>{view.statusLabel}</span>
      </header>

      <div className="selected-edge-hud-grid" aria-label="選択接続概要">
        <span>Flow</span>
        <strong>{view.flowTypeLabel}</strong>
        <span>Carries</span>
        <strong>{view.carriesSummary}</strong>
        <span>Condition</span>
        <strong>{view.conditionSummary}</strong>
        <span>Delay</span>
        <strong>{view.delaySummary}</strong>
        <span>Retry</span>
        <strong>{view.retrySummary}</strong>
        <span>Error route</span>
        <strong>{view.errorRouteSummary}</strong>
        <span>Health</span>
        <strong>{view.healthLabel}</strong>
      </div>

      <section className="selected-edge-hud-action" aria-label="選択接続の次アクション">
        <span className="eyebrow">Next</span>
        <p>{view.recommendedAction}</p>
      </section>

      <div className="selected-edge-hud-actions" aria-label="エッジクイックアクション">
        <button type="button" className="icon-button" onClick={() => onSelectSource(view.sourceNodeId)}>
          Select source
        </button>
        <button type="button" className="icon-button" onClick={() => onSelectTarget(view.targetNodeId)}>
          Select target
        </button>
        <button type="button" className="icon-button" onClick={copySummary}>
          {copied ? 'Copied' : 'Copy edge summary'}
        </button>
        <button type="button" className="icon-button danger-action" onClick={deleteEdge}>
          Delete edge
        </button>
      </div>
    </aside>
  )
}
