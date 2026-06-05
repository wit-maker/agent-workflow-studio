import { useState } from 'react'
import type { HudNotificationBundleView, HudNotificationItem } from '../../domain/cognitiveHud'

type HudNotificationBundleProps = {
  view: HudNotificationBundleView
  open: boolean
  onClose: () => void
  onSelectNode: (nodeId: string) => void
  onSelectRun: (runId: string) => void
  onMarkNotificationRead: (notificationId: string) => void
  onAcknowledgeNotification: (notificationId: string) => void
  onToggleNotificationPinned: (notificationId: string) => void
  onCycleHudDensity: () => void
}

type HudNotificationTab = 'signals' | 'history' | 'settings'

const tabLabels: Record<HudNotificationTab, string> = {
  signals: '通知',
  history: '履歴',
  settings: '密度',
}

export function HudNotificationBundle({
  view,
  open,
  onClose,
  onSelectNode,
  onSelectRun,
  onMarkNotificationRead,
  onAcknowledgeNotification,
  onToggleNotificationPinned,
  onCycleHudDensity,
}: HudNotificationBundleProps) {
  const [tab, setTab] = useState<HudNotificationTab>('signals')
  const [copied, setCopied] = useState(false)

  if (!open) {
    return null
  }

  function copySummary() {
    if (!navigator.clipboard) {
      return
    }
    void navigator.clipboard.writeText(view.safeCopySummary).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <aside
      className={`hud-notification-bundle open ${view.density.className}`}
      aria-label="HUD通知と履歴"
    >
      <header className="hud-notification-header">
        <div>
          <span className="eyebrow">HUD Feed</span>
          <strong>{view.headline}</strong>
          <span className="hud-notification-status">{view.statusLine}</span>
          <span className="hud-notification-status">
            unread {view.unreadNotificationCount} / ack {view.acknowledgedNotificationCount} / pinned {view.pinnedNotificationCount} / session-only
          </span>
        </div>
        <button type="button" className="hud-icon-button" onClick={onClose} title="通知HUDを閉じる">
          Close
        </button>
      </header>

      <nav className="hud-notification-tabs" aria-label="HUD通知タブ">
        {(['signals', 'history', 'settings'] as const).map((item) => (
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

      {tab === 'signals' ? (
        <section className="hud-notification-panel" aria-label="HUD通知">
          {view.notificationItems.length > 0 ? (
            <ul className="hud-notification-list">
              {view.notificationItems.map((item) => (
                <HudNotificationRow
                  key={item.id}
                  item={item}
                  onSelectNode={onSelectNode}
                  onMarkRead={onMarkNotificationRead}
                  onAcknowledge={onAcknowledgeNotification}
                  onTogglePinned={onToggleNotificationPinned}
                />
              ))}
            </ul>
          ) : (
            <p className="hud-notification-empty">現在表示すべき通知はありません。</p>
          )}
          {view.hiddenNotificationCount > 0 ? (
            <p className="hud-notification-overflow">
              +{view.hiddenNotificationCount} signals collapsed by {view.density.label}
            </p>
          ) : null}
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="hud-notification-panel" aria-label="HUD履歴">
          <p className="hud-notification-summary">{view.latestRunSummary}</p>
          <p className="hud-notification-summary">
            Flow: {view.flowPressure.summary}
          </p>
          <p className="hud-notification-summary">
            Template/history hint: {view.flowPressure.templateHistoryHint}
          </p>
          <p className="hud-notification-summary">
            Scratch/connector: {view.scratchConnectorFeedback.railSummary}
          </p>
          <p className="hud-notification-summary">
            Review gate: {view.scratchConnectorFeedback.reviewGateHint}
          </p>
          <p className="hud-notification-summary">
            Rate limit placeholder: {view.scratchConnectorFeedback.rateLimitHint}
          </p>
          {view.historyEntries.length > 0 ? (
            <ul className="hud-history-list">
              {view.historyEntries.map((entry) => (
                <li key={entry.id} className={`hud-history-entry run-status-${entry.status}`}>
                  <div>
                    <strong>{entry.statusLabel}</strong>
                    <span>{entry.modeLabel} / {entry.durationLabel}</span>
                  </div>
                  <p>{entry.summary}</p>
                  <span className="hud-history-meta">
                    {entry.startedAtLabel} / audit {entry.evidenceCount}
                  </span>
                  <button
                    type="button"
                    className="hud-icon-button"
                    onClick={() => onSelectRun(entry.runId)}
                    disabled={entry.evidenceCount === 0}
                    title="Run Detail で audit replay を開く"
                  >
                    Replay
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hud-notification-empty">Run history はまだありません。</p>
          )}
          {view.hiddenHistoryCount > 0 ? (
            <p className="hud-notification-overflow">
              +{view.hiddenHistoryCount} runs collapsed by {view.density.label}
            </p>
          ) : null}
        </section>
      ) : null}

      {tab === 'settings' ? (
        <section className="hud-notification-panel hud-density-panel" aria-label="HUD密度設定">
          <dl>
            <div>
              <dt>Density</dt>
              <dd>{view.density.label}</dd>
            </div>
            <div>
              <dt>Danger</dt>
              <dd>{view.density.dangerVisibilityLabel}</dd>
            </div>
            <div>
              <dt>Collapse</dt>
              <dd>{view.density.collapsePolicy}</dd>
            </div>
            <div>
              <dt>Limits</dt>
              <dd>
                signals {view.density.signalLimit} / history {view.density.historyLimit}
              </dd>
            </div>
          </dl>
          <button type="button" className="primary-button" onClick={onCycleHudDensity}>
            Cycle density
          </button>
        </section>
      ) : null}

      <footer className="hud-notification-footer">
        <span>{view.evidenceSummary}</span>
        <button type="button" className="icon-button" onClick={copySummary}>
          {copied ? 'Copied' : 'Copy HUD summary'}
        </button>
      </footer>
    </aside>
  )
}

function HudNotificationRow({
  item,
  onSelectNode,
  onMarkRead,
  onAcknowledge,
  onTogglePinned,
}: {
  item: HudNotificationItem
  onSelectNode: (nodeId: string) => void
  onMarkRead: (notificationId: string) => void
  onAcknowledge: (notificationId: string) => void
  onTogglePinned: (notificationId: string) => void
}) {
  const canFocusNode = item.targetType === 'node' && item.targetId

  return (
    <li
      className={[
        'hud-notification-item',
        `hud-notification-${item.tone}`,
        item.read ? 'hud-notification-read' : '',
        item.acknowledged ? 'hud-notification-acknowledged' : '',
        item.pinned ? 'hud-notification-pinned' : '',
      ].filter(Boolean).join(' ')}
    >
      <div>
        <span className="hud-notification-source">
          L{item.alertLevel} / {item.sourceLabel}
        </span>
        <span className="hud-notification-target">{item.statusLabel}</span>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
        {item.targetLabel ? <span className="hud-notification-target">{item.targetLabel}</span> : null}
      </div>
      <div className="hud-notification-actions">
        <button
          type="button"
          className="hud-icon-button"
          onClick={() => onTogglePinned(item.id)}
          aria-pressed={item.pinned}
          title={item.pinned ? 'Pin を外す' : 'Pin して表示を保持'}
        >
          Pin
        </button>
        <button
          type="button"
          className="hud-icon-button"
          onClick={() => onMarkRead(item.id)}
          disabled={item.read}
          title="既読にする"
        >
          Read
        </button>
        <button
          type="button"
          className="hud-icon-button"
          onClick={() => onAcknowledge(item.id)}
          disabled={item.acknowledged && !item.pinned}
          title="確認済みにして通常リストから外す"
        >
          Ack
        </button>
      </div>
      {canFocusNode ? (
        <button
          type="button"
          className="hud-icon-button"
          onClick={() => onSelectNode(item.targetId as string)}
          title="対象ノードへフォーカス"
        >
          Go
        </button>
      ) : null}
    </li>
  )
}
