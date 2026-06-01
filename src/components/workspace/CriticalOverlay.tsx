import type { CentralHudView, HudSnapshot } from '../../domain/cognitiveHud'

type CriticalOverlayProps = {
  hudSnapshot: HudSnapshot
  centralHudView: CentralHudView | null
}

export function CriticalOverlay({ hudSnapshot, centralHudView }: CriticalOverlayProps) {
  const effectivePriority = centralHudView?.priority ?? hudSnapshot.priority

  if (effectivePriority !== 'critical') {
    return null
  }

  const topSignal = hudSnapshot.signals[0]
  const headline = centralHudView?.headline ?? hudSnapshot.summary
  const detail = centralHudView?.detail ?? topSignal?.detail
  const nextAction = centralHudView?.nextAction ?? hudSnapshot.recommendedAction

  return (
    <div
      className={`critical-overlay ${centralHudView ? `critical-overlay-${centralHudView.variant}` : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="critical-overlay-card">
        <span className="critical-overlay-eyebrow">
          CRITICAL / {centralHudView?.sourceLabel ?? 'HUD signal'}
        </span>
        <strong>{headline}</strong>
        {detail ? <p>{detail}</p> : null}
        <p className="critical-overlay-action">Next: {nextAction}</p>
        <p className="muted">
          Critical short-tone audio remains a future expression channel and is not played.
        </p>
      </div>
    </div>
  )
}
