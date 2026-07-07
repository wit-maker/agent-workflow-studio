import { useMemo, useState } from 'react'
import type { ConnectorPolicyRailProjection } from '../domain/connectorPolicyRail'
import { reviewDecisionLabels } from '../domain/displayLabels'
import type { EvaluationResult, HumanReviewState, ReviewDecision } from '../domain/evaluation'
import { buildReviewDecisionAuditBoundaryView } from '../domain/reviewDecisionAudit'

type HumanReviewPanelProps = {
  evaluation: EvaluationResult | undefined
  humanReview: HumanReviewState | undefined
  policyRail?: ConnectorPolicyRailProjection | null
  onDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
}

export function HumanReviewPanel({
  evaluation,
  humanReview,
  policyRail = null,
  onDecide,
  onRequestRebuild,
}: HumanReviewPanelProps) {
  const [note, setNote] = useState('')
  const [rebuildReason, setRebuildReason] = useState('')
  const [rebuildInstruction, setRebuildInstruction] = useState('')
  const [showRebuildForm, setShowRebuildForm] = useState(false)

  const hasPendingDecision = !humanReview || humanReview.decision === 'pending'
  const auditBoundary = useMemo(
    () => buildReviewDecisionAuditBoundaryView({ humanReview, runId: evaluation?.runId }),
    [evaluation?.runId, humanReview],
  )

  function handleDecide(decision: ReviewDecision) {
    onDecide(decision, note)
    setNote('')
  }

  function handleRebuildSubmit() {
    if (!rebuildReason.trim() || !rebuildInstruction.trim()) {
      return
    }
    onRequestRebuild(rebuildReason.trim(), rebuildInstruction.trim())
    setRebuildReason('')
    setRebuildInstruction('')
    setShowRebuildForm(false)
  }

  return (
    <div className="human-review-panel">
      <h3>ヒューマンレビュー</h3>

      <div className="hr-audit-boundary" aria-label="レビュー決定の保存境界">
        <span className="eyebrow">保存境界</span>
        <strong>{auditBoundary.persistenceLabel}</strong>
        <p>{auditBoundary.durableBoundaryLabel}</p>
        <dl>
          <div>
            <dt>Safe summary</dt>
            <dd>{auditBoundary.safeAuditSummary}</dd>
          </div>
          <div>
            <dt>Note</dt>
            <dd>
              {auditBoundary.noteIncludedInSafeSummary
                ? auditBoundary.noteSummary
                : 'safe summary には含めません'}
            </dd>
          </div>
        </dl>
      </div>

      {policyRail ? (
        <div className="hr-audit-boundary" aria-label="Write 系 mock action の gate 境界">
          <span className="eyebrow">Write gate</span>
          <strong>{policyRail.reviewGateLabel}</strong>
          <p>{policyRail.reviewGateHint}</p>
          <dl>
            <div>
              <dt>Fixed policy</dt>
              <dd>
                {policyRail.entries.find((entry) => entry.kind === 'human_review')?.fixedPolicy}
              </dd>
            </div>
            <div>
              <dt>Gate 対象</dt>
              <dd>
                write 系 node {policyRail.writeLikeNodeCount} 件 / gate 停止中 job{' '}
                {policyRail.gatedWriteLikeJobCount} 件
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {!evaluation ? (
        <p className="muted">評価を実行してからレビューしてください。</p>
      ) : (
        <>
          {humanReview && humanReview.decision !== 'pending' ? (
            <div className="hr-decision-result">
              <span className={`hr-decision-badge hr-decision-${humanReview.decision}`}>
                {reviewDecisionLabels[humanReview.decision]}
              </span>
              {humanReview.reviewer ? (
                <span className="hr-reviewer">レビュアー: {humanReview.reviewer}</span>
              ) : null}
              {humanReview.note ? <p className="hr-note">{humanReview.note}</p> : null}
              {humanReview.decidedAt ? (
                <time className="hr-decided-at">
                  {new Date(humanReview.decidedAt).toLocaleString('ja-JP')}
                </time>
              ) : null}
            </div>
          ) : null}

          {hasPendingDecision ? (
            <div className="hr-actions">
              <label className="hr-note-label" htmlFor="hr-note-input">
                メモ（任意）
              </label>
              <textarea
                id="hr-note-input"
                className="hr-note-textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="レビューメモを入力…"
                rows={2}
              />
              <div className="hr-buttons">
                <button
                  type="button"
                  className="primary-button btn-sm"
                  onClick={() => handleDecide('approved')}
                >
                  承認
                </button>
                <button
                  type="button"
                  className="icon-button btn-sm"
                  onClick={() => handleDecide('revise_requested')}
                >
                  修正依頼
                </button>
                <button
                  type="button"
                  className="icon-button btn-sm"
                  onClick={() => handleDecide('rejected')}
                >
                  却下
                </button>
                <button
                  type="button"
                  className="icon-button btn-sm"
                  onClick={() => handleDecide('skipped')}
                >
                  スキップ
                </button>
              </div>
            </div>
          ) : null}

          <div className="hr-rebuild-section">
            <button
              type="button"
              className="icon-button btn-sm"
              onClick={() => setShowRebuildForm((prev) => !prev)}
            >
              {showRebuildForm ? '再作成フォームを閉じる' : '再作成をリクエスト'}
            </button>

            {showRebuildForm ? (
              <div className="hr-rebuild-form">
                <label htmlFor="rebuild-reason">理由</label>
                <input
                  id="rebuild-reason"
                  type="text"
                  className="hr-input"
                  value={rebuildReason}
                  onChange={(event) => setRebuildReason(event.target.value)}
                  placeholder="再作成が必要な理由…"
                />
                <label htmlFor="rebuild-instruction">指示</label>
                <textarea
                  id="rebuild-instruction"
                  className="hr-note-textarea"
                  value={rebuildInstruction}
                  onChange={(event) => setRebuildInstruction(event.target.value)}
                  placeholder="再作成の具体的な指示…"
                  rows={3}
                />
                <button
                  type="button"
                  className="primary-button btn-sm"
                  disabled={!rebuildReason.trim() || !rebuildInstruction.trim()}
                  onClick={handleRebuildSubmit}
                >
                  送信
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
