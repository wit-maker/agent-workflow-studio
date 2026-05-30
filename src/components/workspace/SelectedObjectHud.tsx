import { useState } from 'react'
import type { SelectedNodeHudView } from '../../domain/cognitiveHud'
import { hudPriorityLabels } from '../../domain/cognitiveHud'

type SelectedObjectHudProps = {
  view: SelectedNodeHudView | null
  onRunSelected: () => void
  onOpenDetail: () => void
  onMoveRight: () => void
  onDeleteSelected: () => void
}

type HudTab = 'overview' | 'config' | 'io' | 'history'

const tabLabels: Record<HudTab, string> = {
  overview: '概要',
  config: '設定',
  io: '入出力',
  history: '履歴',
}

export function SelectedObjectHud({
  view,
  onRunSelected,
  onOpenDetail,
  onMoveRight,
  onDeleteSelected,
}: SelectedObjectHudProps) {
  const [tab, setTab] = useState<HudTab>('overview')
  const [copied, setCopied] = useState(false)

  if (!view) {
    return null
  }

  const safeCopySummary = view.safeCopySummary

  function copySummary() {
    if (!navigator.clipboard) {
      return
    }
    void navigator.clipboard.writeText(safeCopySummary).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <aside
      className={`selected-object-hud selected-object-hud-${view.priority} ${
        view.focusMatched ? 'selected-object-hud-focused' : ''
      }`}
      aria-label="選択オブジェクトHUD"
    >
      <header className="selected-object-hud-header">
        <span className="eyebrow">L1 Object HUD</span>
        <strong>{view.title}</strong>
        <span className={`status-pill status-${view.status}`}>
          {view.statusLabel}
        </span>
        <span className="selected-object-hud-subtitle">
          {view.categoryLabel} / {view.type}
        </span>
      </header>

      <nav className="selected-object-hud-tabs" aria-label="選択ノードHUDタブ">
        {(['overview', 'config', 'io', 'history'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {tabLabels[item]}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <>
          <div className="selected-object-hud-grid" aria-label="選択ノード概要">
            <span>優先度</span>
            <strong>
              {hudPriorityLabels[view.priority]} / L{view.alertLevel}
            </strong>
            <span>ポート</span>
            <strong>
              IN {view.inputCount} / OUT {view.outputCount}
            </strong>
            <span>接続</span>
            <strong>
              IN {view.incomingConnectionCount} / OUT {view.outgoingConnectionCount}
            </strong>
            <span>見積</span>
            <strong>
              {view.estimatedTokens} tokens / {view.estimatedLatencyMs} ms
            </strong>
          </div>
          <section className="selected-object-hud-preview" aria-label="インラインプレビュー">
            <span className="eyebrow">{view.inlinePreview.title}</span>
            <p>{view.inlinePreview.text}</p>
          </section>
        </>
      ) : null}

      {tab === 'config' ? (
        <section className="selected-object-hud-panel" aria-label="設定要約">
          <dl>
            <div>
              <dt>種別</dt>
              <dd>{view.type}</dd>
            </div>
            <div>
              <dt>分類</dt>
              <dd>{view.categoryLabel}</dd>
            </div>
            <div>
              <dt>安全境界</dt>
              <dd>raw config 非表示 / Detail HUD で編集</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {tab === 'io' ? (
        <section className="selected-object-hud-panel" aria-label="入出力要約">
          <dl>
            <div>
              <dt>入力</dt>
              <dd>{view.inputSummary}</dd>
            </div>
            <div>
              <dt>出力</dt>
              <dd>{view.outputSummary}</dd>
            </div>
            <div>
              <dt>依存</dt>
              <dd>{view.dependencySummary}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="selected-object-hud-panel" aria-label="履歴要約">
          <dl>
            <div>
              <dt>状態</dt>
              <dd>{view.statusLabel}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{view.focusReason ?? '通常選択'}</dd>
            </div>
            <div>
              <dt>Next</dt>
              <dd>{view.recommendedAction}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {view.warningSummaries.length > 0 ? (
        <section className="selected-object-hud-warnings" aria-label="警告">
          {view.warningSummaries.slice(0, 3).map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </section>
      ) : null}

      <section className="selected-object-hud-action" aria-label="選択ノードの次アクション">
        <span className="eyebrow">
          {view.focusMatched ? 'HUD focus' : 'Selection'}
        </span>
        {view.focusReason ? <strong>{view.focusReason}</strong> : null}
        <p>{view.recommendedAction}</p>
      </section>

      <div className="selected-object-hud-actions" aria-label="クイックアクション">
        <button type="button" className="primary-button" onClick={onRunSelected}>
          Run selected
        </button>
        <button type="button" className="icon-button" onClick={onOpenDetail}>
          Open detail
        </button>
        <button type="button" className="icon-button" onClick={onMoveRight}>
          Move right
        </button>
        <button type="button" className="icon-button" onClick={copySummary}>
          {copied ? 'Copied' : 'Copy summary'}
        </button>
        <button type="button" className="icon-button danger-action" onClick={onDeleteSelected}>
          Delete selected
        </button>
      </div>
    </aside>
  )
}
