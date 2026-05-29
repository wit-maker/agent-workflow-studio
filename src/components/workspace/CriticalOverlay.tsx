import type { HudSnapshot } from '../../domain/cognitiveHud'

/*
 * CriticalOverlay
 *
 * Overlay layer — issue #34 redesign.
 *
 * Foreground banner that takes attention only when the cognitive HUD
 * reports a critical-priority signal. Designed as the structural home
 * for the future critical-modal flow (e.g. dangerous stop confirmation,
 * irrecoverable failure interception) and the placeholder for the
 * future critical-tone short audio channel (do not implement yet).
 */

type CriticalOverlayProps = {
  hudSnapshot: HudSnapshot
}

export function CriticalOverlay({ hudSnapshot }: CriticalOverlayProps) {
  if (hudSnapshot.priority !== 'critical') {
    return null
  }

  const topSignal = hudSnapshot.signals[0]

  return (
    <div className="critical-overlay" role="alert" aria-live="assertive">
      <div className="critical-overlay-card">
        <span className="critical-overlay-eyebrow">CRITICAL / 注意配分介入</span>
        <strong>{hudSnapshot.summary}</strong>
        {topSignal ? <p>{topSignal.detail}</p> : null}
        <p className="critical-overlay-action">
          次の一手: {hudSnapshot.recommendedAction}
        </p>
        <p className="muted">
          ※ critical 短音通知は将来の expression channel として未実装。
        </p>
      </div>
    </div>
  )
}
