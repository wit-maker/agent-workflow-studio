import type { HudSnapshot } from '../../domain/cognitiveHud'
import { hudPriorityLabels, hudSignalKindLabels } from '../../domain/cognitiveHud'

/*
 * CognitiveHudOverlay
 *
 * Overlay layer — issue #34 redesign.
 *
 * Issue #31 / Issue #34: the cognitive HUD is the attention-allocation
 * editing layer, NOT a tab. This overlay sits on top of the canvas and
 * is meant to grow into:
 *   - important node badge
 *   - human gate marker
 *   - failure / warning marker
 *   - focus target / dim irrelevant paths
 *   - central HUD card
 *
 * In this foundation phase, only the central HUD card and a focus-target
 * label are rendered as placeholders so subsequent phases can attach real
 * node-level highlight and dim logic to the same overlay layer.
 *
 * Normal-state policy: when priority === 'normal', the overlay renders
 * nothing so it does not steal attention from the canvas.
 */

type CognitiveHudOverlayProps = {
  hudSnapshot: HudSnapshot
}

export function CognitiveHudOverlay({ hudSnapshot }: CognitiveHudOverlayProps) {
  if (hudSnapshot.priority === 'normal') {
    return null
  }

  const topSignal = hudSnapshot.signals[0]

  return (
    <div
      className={`cognitive-hud-overlay cognitive-hud-overlay-${hudSnapshot.priority}`}
      aria-label="認知HUDオーバーレイ"
      role="presentation"
    >
      <div className="cognitive-hud-overlay-card">
        <span className="eyebrow">認知HUD / 注意配分</span>
        <strong>{hudSnapshot.summary}</strong>
        <span className="cognitive-hud-overlay-meta">
          L{hudSnapshot.alertLevel} ・ {hudPriorityLabels[hudSnapshot.priority]}
          {hudSnapshot.focusTargetLabel
            ? ` ・ フォーカス: ${hudSnapshot.focusTargetLabel}`
            : null}
        </span>
        {topSignal ? (
          <span className="cognitive-hud-overlay-signal">
            {hudSignalKindLabels[topSignal.kind]}: {topSignal.title}
          </span>
        ) : null}
        <span className="cognitive-hud-overlay-action muted">
          次の一手: {hudSnapshot.recommendedAction}
        </span>
      </div>
    </div>
  )
}
