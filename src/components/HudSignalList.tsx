import type {
  HudPriority,
  HudSignal,
  HudSnapshot,
} from '../domain/cognitiveHud'
import {
  hudPriorityLabels,
  hudSignalKindLabels,
} from '../domain/cognitiveHud'

type HudSignalListProps = {
  snapshot: HudSnapshot
}

const focusTargetLabels: Record<HudSnapshot['focusTargetType'], string> = {
  node: 'ノード',
  step: 'ステップ',
  workflow: 'ワークフロー',
  connector: 'コネクター',
  storage: 'ストレージ',
  none: 'なし',
}

function priorityClass(priority: HudPriority): string {
  return `hud-priority-${priority}`
}

const TOP_SIGNAL_LIMIT = 6

export function HudSignalList({ snapshot }: HudSignalListProps) {
  const topSignals = snapshot.signals.slice(0, TOP_SIGNAL_LIMIT)
  const remainingSignalCount = Math.max(snapshot.signals.length - topSignals.length, 0)

  return (
    <section className="hud-signal-list-panel" aria-label="注意信号一覧">
      <header className={`hud-signal-list-header ${priorityClass(snapshot.priority)}`}>
        <div className="hud-signal-list-headline">
          <span className="hud-signal-list-eyebrow">注意信号</span>
          <strong>{snapshot.summary}</strong>
        </div>
        <div className="hud-signal-list-meta">
          <div>
            <span className="eyebrow">アラート</span>
            <strong>L{snapshot.alertLevel}</strong>
          </div>
          <div>
            <span className="eyebrow">優先度</span>
            <strong>{hudPriorityLabels[snapshot.priority]}</strong>
          </div>
          <div>
            <span className="eyebrow">フォーカス</span>
            <strong>
              {snapshot.focusTargetLabel ?? 'なし'}
              <span className="hud-signal-list-focus-type">
                {' '}
                ({focusTargetLabels[snapshot.focusTargetType]})
              </span>
            </strong>
          </div>
          <div>
            <span className="eyebrow">シグナル</span>
            <strong>{snapshot.signals.length} 件</strong>
          </div>
        </div>
      </header>

      <p className="hud-signal-list-action" aria-label="推奨アクション">
        次の一手: {snapshot.recommendedAction}
      </p>

      <section className="hud-signal-list-counts" aria-label="状態カウント">
        <CountTile label="ノード合計" value={snapshot.counts.totalNodes} />
        <CountTile label="実行中" value={snapshot.counts.runningNodes} />
        <CountTile label="待機列" value={snapshot.counts.queuedNodes} />
        <CountTile
          label="確認待ち"
          value={snapshot.counts.reviewRequiredNodes}
          tone={snapshot.counts.reviewRequiredNodes > 0 ? 'review' : 'normal'}
        />
        <CountTile
          label="失敗"
          value={snapshot.counts.failedNodes}
          tone={snapshot.counts.failedNodes > 0 ? 'failed' : 'normal'}
        />
        <CountTile
          label="停止"
          value={snapshot.counts.blockedNodes}
          tone={snapshot.counts.blockedNodes > 0 ? 'failed' : 'normal'}
        />
        <CountTile
          label="再試行可"
          value={snapshot.counts.retryReadyNodes}
          tone={snapshot.counts.retryReadyNodes > 0 ? 'retry' : 'normal'}
        />
        <CountTile
          label="コネクター失敗"
          value={snapshot.counts.connectorJobsFailed}
          tone={snapshot.counts.connectorJobsFailed > 0 ? 'failed' : 'normal'}
        />
        <CountTile
          label="コネクター確認"
          value={snapshot.counts.connectorJobsReviewRequired}
          tone={snapshot.counts.connectorJobsReviewRequired > 0 ? 'review' : 'normal'}
        />
        <CountTile label="実行履歴" value={snapshot.counts.runHistoryCount} />
      </section>

      <section className="hud-signal-list-signals" aria-label="主要シグナル">
        <h4>主要シグナル</h4>
        {topSignals.length === 0 ? (
          <p className="muted">注視すべきシグナルはありません。</p>
        ) : (
          <ul className="hud-signal-list-items">
            {topSignals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
          </ul>
        )}
        {remainingSignalCount > 0 ? (
          <p className="muted">他 {remainingSignalCount} 件のシグナルがあります。</p>
        ) : null}
      </section>
    </section>
  )
}

type CountTileProps = {
  label: string
  value: number
  tone?: 'normal' | 'failed' | 'review' | 'retry'
}

function CountTile({ label, value, tone = 'normal' }: CountTileProps) {
  return (
    <div className={`hud-signal-list-count hud-signal-list-count-${tone}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SignalRow({ signal }: { signal: HudSignal }) {
  return (
    <li className={`hud-signal-list-item ${priorityClass(signal.priority)}`}>
      <div className="hud-signal-list-item-head">
        <span className="hud-signal-list-level">L{signal.alertLevel}</span>
        <span className="hud-signal-list-kind">
          {hudSignalKindLabels[signal.kind]}
        </span>
        <strong>{signal.title}</strong>
      </div>
      <p>{signal.detail}</p>
      {signal.targetLabel ? (
        <p className="muted">
          対象: {signal.targetLabel}（{focusTargetLabels[signal.targetType]}）
        </p>
      ) : null}
    </li>
  )
}
