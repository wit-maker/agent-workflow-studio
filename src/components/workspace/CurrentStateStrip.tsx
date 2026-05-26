import type { HudSnapshot } from '../../domain/cognitiveHud'
import { hudPriorityLabels } from '../../domain/cognitiveHud'
import { workflowStatusLabels } from '../../domain/displayLabels'
import type { WorkflowStatus } from '../../domain/workflow'

/*
 * CurrentStateStrip
 *
 * Top strip — issue #34 redesign.
 * Reports execution state, the single most important attention target,
 * and the recommended/current model in one short row. Read-only derived
 * view: it never owns state and does not perform any side effects.
 *
 * Normal-state policy: when nothing is wrong, this strip stays quiet
 * (priority `normal`) so the canvas keeps the user's foreground attention.
 */

type CurrentStateStripProps = {
  workflowStatus: WorkflowStatus
  isRunning: boolean
  hudSnapshot: HudSnapshot
  runHistoryCount: number
}

export function CurrentStateStrip({
  workflowStatus,
  isRunning,
  hudSnapshot,
  runHistoryCount,
}: CurrentStateStripProps) {
  const priority = hudSnapshot.priority
  const topSignal = hudSnapshot.signals[0]
  const focusLabel = hudSnapshot.focusTargetLabel ?? 'なし'

  return (
    <div
      className={`current-state-strip current-state-strip-${priority}`}
      aria-label="現在状態ストリップ"
    >
      <div className="current-state-cell">
        <span className="eyebrow">実行状態</span>
        <span className={`status-pill status-${workflowStatus}`}>
          {workflowStatusLabels[workflowStatus]}
          {isRunning ? ' (実行中)' : ''}
        </span>
      </div>
      <div className="current-state-cell">
        <span className="eyebrow">最重要状態</span>
        <strong className="current-state-summary">{hudSnapshot.summary}</strong>
        <span className="current-state-priority">優先度: {hudPriorityLabels[priority]} / L{hudSnapshot.alertLevel}</span>
      </div>
      <div className="current-state-cell">
        <span className="eyebrow">フォーカス</span>
        <span className="current-state-focus">{focusLabel}</span>
        {topSignal ? (
          <span className="current-state-action muted">{hudSnapshot.recommendedAction}</span>
        ) : null}
      </div>
      <div className="current-state-cell">
        <span className="eyebrow">モデル</span>
        <span className="model-pill">推奨: GPT-5.5 high / Claude Opus 4.7</span>
        <span className="muted">現在: ローカルモック（実 API 未接続）</span>
      </div>
      <div className="current-state-cell">
        <span className="eyebrow">安全状態</span>
        <span className="muted">credential: 未保存 / 実行履歴: {runHistoryCount} 件</span>
      </div>
    </div>
  )
}
