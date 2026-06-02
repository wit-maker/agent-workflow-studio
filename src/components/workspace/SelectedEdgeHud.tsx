import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type {
  CanvasHudAnchor,
  CanvasHudSize,
  SelectedEdgeHudView,
} from '../../domain/cognitiveHud'

type SelectedEdgeHudProps = {
  view: SelectedEdgeHudView | null
  onSelectSource: (nodeId: string) => void
  onSelectTarget: (nodeId: string) => void
  onDeleteEdge: (connectionId: string) => void
  onOpenRunDetail: (connectionId: string) => void
  anchor?: CanvasHudAnchor | null
  onMeasuredSizeChange?: (size: CanvasHudSize | null) => void
}

export function SelectedEdgeHud({
  view,
  onSelectSource,
  onSelectTarget,
  onDeleteEdge,
  onOpenRunDetail,
  anchor,
  onMeasuredSizeChange,
}: SelectedEdgeHudProps) {
  const [copied, setCopied] = useState(false)
  const hudRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!onMeasuredSizeChange) {
      return
    }

    if (!view) {
      onMeasuredSizeChange(null)
      return
    }

    const element = hudRef.current
    if (!element) {
      return
    }

    const reportSize = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        return
      }
      onMeasuredSizeChange({
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      })
    }

    reportSize()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(reportSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onMeasuredSizeChange, view])

  if (!view) {
    return null
  }

  const safeView = view
  const anchorStyle: CSSProperties | undefined = anchor
    ? {
        left: anchor.x,
        top: anchor.y,
      }
    : undefined

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
      ref={hudRef}
      className={`selected-edge-hud selected-edge-hud-${view.health} ${anchor ? 'is-anchored' : ''}`}
      style={anchorStyle}
      data-hud-placement={anchor?.placement ?? 'fallback'}
      data-hud-collisions={anchor?.collisionIds.join(' ') ?? ''}
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
        <span>Runtime</span>
        <strong>{view.runtimeLabel}</strong>
        <span>Observed</span>
        <strong>{view.observedRouteSummary}</strong>
      </div>

      <section className="selected-edge-hud-runtime" aria-label="選択接続の実行観測">
        <span className={`runtime-pill runtime-${view.runtimeState}`}>{view.runtimeLabel}</span>
        <dl>
          <div>
            <dt>Source step</dt>
            <dd>{view.sourceRuntimeStatus}</dd>
          </div>
          <div>
            <dt>Target step</dt>
            <dd>{view.targetRuntimeStatus}</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>{view.runtimeEvidenceCount}</dd>
          </div>
          <div>
            <dt>Trace</dt>
            <dd>{view.traceRunId ? `${view.traceRunId} / ${view.traceSource}` : view.traceSource}</dd>
          </div>
        </dl>
      </section>

      <section className="selected-edge-hud-action" aria-label="選択接続の次アクション">
        <span className="eyebrow">Next</span>
        <p>{view.recommendedAction}</p>
      </section>

      <section className="selected-edge-hud-action" aria-label="Run Detail deep link">
        <span className="eyebrow">Deep link</span>
        <p>
          <strong>{view.runDetailFocusLabel}</strong>
          <br />
          {view.runDetailFocusSummary}
        </p>
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
        <button type="button" className="icon-button" onClick={() => onOpenRunDetail(view.connectionId)}>
          Open Run Detail focus
        </button>
        <button type="button" className="icon-button danger-action" onClick={deleteEdge}>
          Delete edge
        </button>
      </div>
    </aside>
  )
}
