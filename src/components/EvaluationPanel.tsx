import { evaluationStatusLabels } from '../domain/displayLabels'
import type { EvaluationResult } from '../domain/evaluation'

type EvaluationPanelProps = {
  evaluation: EvaluationResult | undefined
  canEvaluate: boolean
  isEvaluating: boolean
  onEvaluate: () => void
}

export function EvaluationPanel({
  evaluation,
  canEvaluate,
  isEvaluating,
  onEvaluate,
}: EvaluationPanelProps) {
  const percentage =
    evaluation && evaluation.maxScore > 0
      ? Math.round((evaluation.totalScore / evaluation.maxScore) * 100)
      : null

  const statusClass =
    evaluation?.status === 'passed'
      ? 'eval-status-passed'
      : evaluation?.status === 'needs_review'
        ? 'eval-status-review'
        : evaluation?.status === 'failed'
          ? 'eval-status-failed'
          : evaluation?.status === 'evaluating'
            ? 'eval-status-evaluating'
            : 'eval-status-none'

  return (
    <div className="evaluation-panel">
      <div className="eval-header">
        <h3>評価結果</h3>
        <button
          type="button"
          className="primary-button btn-sm"
          disabled={!canEvaluate || isEvaluating}
          onClick={onEvaluate}
        >
          {isEvaluating ? '評価中…' : '評価を実行'}
        </button>
      </div>

      {!evaluation ? (
        <p className="muted">実行後に「評価を実行」ボタンで評価できます。</p>
      ) : (
        <>
          <div className="eval-summary-row">
            <span className={`eval-status-badge ${statusClass}`}>
              {evaluationStatusLabels[evaluation.status]}
            </span>
            {percentage !== null ? (
              <span className="eval-score">
                {evaluation.totalScore} / {evaluation.maxScore} 点（{percentage}%）
              </span>
            ) : null}
          </div>

          <p className="eval-summary-text">{evaluation.summary}</p>

          <div className="eval-score-bar-wrap">
            <div
              className={`eval-score-bar ${statusClass}`}
              style={{ width: `${percentage ?? 0}%` }}
            />
          </div>

          <table className="eval-criteria-table">
            <thead>
              <tr>
                <th>基準</th>
                <th>スコア</th>
                <th>判定</th>
                <th>メモ</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.criteria.map((criterion) => (
                <tr key={criterion.id} className={criterion.passed ? '' : 'eval-row-fail'}>
                  <td>
                    <strong>{criterion.label}</strong>
                    <span className="eval-criterion-desc">{criterion.description}</span>
                  </td>
                  <td className="eval-score-cell">
                    {criterion.score}/{criterion.maxScore}
                  </td>
                  <td>{criterion.passed ? '✓' : '✗'}</td>
                  <td className="eval-note-cell">{criterion.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
