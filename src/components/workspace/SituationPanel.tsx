import type { HudSnapshot } from '../../domain/cognitiveHud'
import { hudPriorityLabels, hudSignalKindLabels } from '../../domain/cognitiveHud'

/*
 * SituationPanel
 *
 * Right panel mode — issue #34 redesign.
 *
 * Surfaces "what is the situation right now" derived from HudSnapshot:
 *   - 今の問題 (the current top signal)
 *   - 原因候補 / 影響範囲 (signal detail + targetLabel)
 *   - 次アクション (recommendedAction)
 *
 * Read-only derived view. This panel does NOT own state and does not
 * generate text on its own. The Issue #31 concept layer constraint is
 * preserved: the situation-explanation generation layer (and the
 * Situation Assistant role on top of it) lives in AssistantPanel; this
 * panel is the operational "what to look at right now" entry point.
 */

type SituationPanelProps = {
  hudSnapshot: HudSnapshot
}

const SIGNAL_LIMIT = 5

export function SituationPanel({ hudSnapshot }: SituationPanelProps) {
  const signals = hudSnapshot.signals.slice(0, SIGNAL_LIMIT)
  const remaining = Math.max(hudSnapshot.signals.length - signals.length, 0)
  const topSignal = signals[0]

  return (
    <section className="situation-panel" aria-label="状況パネル">
      <header className={`situation-header situation-priority-${hudSnapshot.priority}`}>
        <span className="eyebrow">状況</span>
        <h3>{hudSnapshot.summary}</h3>
        <span className="situation-meta">
          優先度: {hudPriorityLabels[hudSnapshot.priority]} ・ L{hudSnapshot.alertLevel}
        </span>
      </header>

      <section className="situation-section">
        <h4>次アクション</h4>
        <p>{hudSnapshot.recommendedAction}</p>
      </section>

      <section className="situation-section">
        <h4>今の問題 / 原因候補</h4>
        {topSignal ? (
          <div className="situation-top-signal">
            <span className="eyebrow">
              {hudSignalKindLabels[topSignal.kind]} ・ L{topSignal.alertLevel}
            </span>
            <strong>{topSignal.title}</strong>
            <p>{topSignal.detail}</p>
            {topSignal.targetLabel ? (
              <p className="muted">影響対象: {topSignal.targetLabel}</p>
            ) : null}
          </div>
        ) : (
          <p className="muted">注視すべきシグナルはありません。</p>
        )}
      </section>

      <section className="situation-section">
        <h4>関連シグナル</h4>
        {signals.length <= 1 ? (
          <p className="muted">他に注視すべきシグナルはありません。</p>
        ) : (
          <ul className="situation-signal-list">
            {signals.slice(1).map((signal) => (
              <li
                key={signal.id}
                className={`situation-signal situation-priority-${signal.priority}`}
              >
                <span className="eyebrow">
                  {hudSignalKindLabels[signal.kind]} ・ L{signal.alertLevel}
                </span>
                <strong>{signal.title}</strong>
                <span className="muted">{signal.detail}</span>
              </li>
            ))}
          </ul>
        )}
        {remaining > 0 ? (
          <p className="muted">他 {remaining} 件のシグナルがあります。Console HUD の注意信号一覧で確認できます。</p>
        ) : null}
      </section>

      <p className="muted situation-footnote">
        ※ この表示は読み取り専用。状況説明レイヤー本体は「アシスタント」モードで扱います。
      </p>
    </section>
  )
}
