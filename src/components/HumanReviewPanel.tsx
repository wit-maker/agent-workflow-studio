import { useState } from 'react'
import { evaluationStatusLabels, reviewDecisionLabels } from '../domain/displayLabels'
import type { EvaluationResult, HumanReviewState, ReviewDecision } from '../domain/evaluation'

type HumanReviewPanelProps = {
  humanReview?: HumanReviewState
  evaluation?: EvaluationResult
  onDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
}

export function HumanReviewPanel({
  humanReview,
  evaluation,
  onDecide,
  onRequestRebuild,
}: HumanReviewPanelProps) {
  const [note, setNote] = useState('')
  const [rebuildInstruction, setRebuildInstruction] = useState('')
  const [showRebuildForm, setShowRebuildForm] = useState(false)

  function handleDecide(decision: ReviewDecision) {
    if (decision === 'revise_requested') {
      setShowRebuildForm(true)
      return
    }
    onDecide(decision, note)
    setNote('')
    setShowRebuildForm(false)
  }

  function handleSubmitRebuild() {
    if (!rebuildInstruction.trim()) {
      return
    }
    onDecide('revise_requested', note)
    onRequestRebuild('Human Review による修正依頼', rebuildInstruction)
    setRebuildInstruction('')
    setNote('')
    setShowRebuildForm(false)
  }

  const current = humanReview?.decision ?? 'pending'

  return (
    <div className="human-review-panel">
      <div className="panel-section-heading">
        <span>Human Review</span>
        {humanReview?.decidedAt && (
          <span className="muted">
            {new Date(humanReview.decidedAt).toLocaleString('ja-JP')}
          </span>
        )}
      </div>

      {evaluation && (
        <div className="review-eval-link muted">
          評価結果:{' '}
          <strong>{evaluationStatusLabels[evaluation.status]}</strong>
          {' '}({evaluation.totalScore}/{evaluation.maxScore}点)
        </div>
      )}

      <div className="review-current">
        現在の判断:{' '}
        <strong className={`review-badge review-${current}`}>
          {reviewDecisionLabels[current]}
        </strong>
        {humanReview?.note && (
          <span className="review-note muted"> — {humanReview.note}</span>
        )}
      </div>

      <textarea
        className="review-memo"
        rows={2}
        placeholder="判断メモ（任意）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="review-actions">
        <button
          type="button"
          className="btn-success btn-sm"
          onClick={() => handleDecide('approved')}
        >
          承認
        </button>
        <button
          type="button"
          className="btn-danger btn-sm"
          onClick={() => handleDecide('rejected')}
        >
          却下
        </button>
        <button
          type="button"
          className="btn-warning btn-sm"
          onClick={() => handleDecide('revise_requested')}
        >
          修正依頼
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => handleDecide('skipped')}
        >
          スキップ
        </button>
      </div>

      {showRebuildForm && (
        <div className="rebuild-request-form">
          <label htmlFor="rebuild-instruction">
            <strong>再作成指示</strong>
          </label>
          <textarea
            id="rebuild-instruction"
            className="rebuild-instruction"
            rows={3}
            placeholder="どのように修正するか具体的に記述してください..."
            value={rebuildInstruction}
            onChange={(e) => setRebuildInstruction(e.target.value)}
          />
          <div className="rebuild-form-actions">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSubmitRebuild}
              disabled={!rebuildInstruction.trim()}
            >
              修正依頼を送信
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setShowRebuildForm(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
