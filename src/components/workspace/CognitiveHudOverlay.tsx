import type {
  CentralHudView,
  HudSnapshot,
  SemanticFocusPathView,
} from '../../domain/cognitiveHud'
import { hudPriorityLabels, hudSignalKindLabels } from '../../domain/cognitiveHud'

type CognitiveHudOverlayProps = {
  hudSnapshot: HudSnapshot
  centralHudView: CentralHudView | null
  semanticFocusPath: SemanticFocusPathView | null
}

export function CognitiveHudOverlay({
  hudSnapshot,
  centralHudView,
  semanticFocusPath,
}: CognitiveHudOverlayProps) {
  if (!centralHudView) {
    return null
  }

  const topSignal = hudSnapshot.signals[0]
  const pathText = semanticFocusPath
    ? `${semanticFocusPath.nodeIds.length} nodes / ${semanticFocusPath.connectionIds.length} edges`
    : null

  return (
    <div
      className={`cognitive-hud-overlay cognitive-hud-overlay-${centralHudView.priority} cognitive-hud-variant-${centralHudView.variant}`}
      aria-label="Cognitive HUD overlay"
    >
      <div className="cognitive-hud-overlay-card">
        <span className="eyebrow">Cognitive HUD / {centralHudView.sourceLabel}</span>
        <strong>{centralHudView.headline}</strong>
        <span className="cognitive-hud-overlay-meta">
          L{centralHudView.alertLevel} / {hudPriorityLabels[centralHudView.priority]}
          {centralHudView.focusLabel ? ` / Focus: ${centralHudView.focusLabel}` : null}
        </span>
        <span className="cognitive-hud-overlay-signal">{centralHudView.detail}</span>
        {topSignal ? (
          <span className="cognitive-hud-overlay-signal">
            {hudSignalKindLabels[topSignal.kind]}: {topSignal.title}
          </span>
        ) : null}
        {pathText ? (
          <span className="cognitive-hud-overlay-path">
            Attention path: {pathText} / evidence {centralHudView.signalCount}
          </span>
        ) : null}
        {centralHudView.stateCue ? (
          <span className={`cognitive-hud-state-cue cognitive-hud-state-cue-${centralHudView.stateCue.state}`}>
            <strong>{centralHudView.stateCue.label}</strong>
            <span>{centralHudView.stateCue.commandHint}</span>
            <span>{centralHudView.stateCue.guardrail}</span>
          </span>
        ) : null}
        <span className="cognitive-hud-overlay-action muted">
          Next: {centralHudView.nextAction}
        </span>
      </div>
    </div>
  )
}
