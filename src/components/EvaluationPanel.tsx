import { evaluationStatusLabels } from '../domain/displayLabels'
import type { EvaluationResult, EvaluationStatus } from '../domain/evaluation'

type EvaluationPanelProps = {
  evaluation?: EvaluationResult
  canEvaluate: boolean
  onEvaluate: () => void
}

function statusClass(status: EvaluationStatus): string {
  switch (status) {
    case 'passed':
      return 'eval-passed'
    case 'needs_review':
      return 'eval-needs-review'
    case 'failed':
      return 'eval-failed'
    case 'evaluating':
      return 'eval-running'
    default:
      return 'eval-none'
  }
}

export function EvaluationPanel({ evaluation, canEvaluate, onEvaluate }: EvaluationPanelProps) {
  const pct = evaluation
    ? Math.round((evaluation.totalScore / evaluation.maxScore) * 100)
    : null

  return (
    <div className="evaluation-panel">
      <div className="panel-section-heading">
        <span>成果物評価</span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onEvaluate}
          disabled={!canEvaluate || evaluation?.status === 'evaluating'}
        >
          {evaluation?.status === 'evaluating' ? '評価中...' : '評価実行'}
        </button>
      </div>

      {!evaluation || evaluation.status === 'not_evaluated' ? (
        <p className="muted">実行完了後に「評価実行」ボタンで評価できます。</p>
      ) : (
        <div className="eval-content">
          <div className={`eval-status-badge ${statusClass(evaluation.status)}`}>
            {evaluationStatusLabels[evaluation.status]}
            {pct !== null && (
              <span className="eval-score">
                {evaluation.totalScore} / {evaluation.maxScore} 点 ({pct}%)
              </span>
            )}
          </div>

          <p className="eval-summary">{evaluation.summary}</p>

          <table className="eval-criteria-table">
            <thead>
              <tr>
                <th>評価基準</th>
                <th>点数</th>
                <th>判定</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.criteria.map((c) => (
                <tr key={c.id} className={c.passed ? '' : 'eval-criterion-fail'}>
                  <td>
                    <strong>{c.label}</strong>
                    {c.note && <span className="eval-note"> — {c.note}</span>}
                  </td>
                  <td>
                    {c.score} / {c.maxScore}
                  </td>
                  <td>{c.passed ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="eval-timestamp muted">
            評価日時: {new Date(evaluation.createdAt).toLocaleString('ja-JP')}
          </p>
        </div>
      )}
    </div>
  )
}
