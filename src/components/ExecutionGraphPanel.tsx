import {
  executionStepStatusLabels,
  routeKindLabels,
} from '../domain/displayLabels'
import type { ExecutionGraph } from '../domain/executionGraph'

type ExecutionGraphPanelProps = {
  executionGraph: ExecutionGraph | null
}

export function ExecutionGraphPanel({ executionGraph }: ExecutionGraphPanelProps) {
  if (!executionGraph) {
    return <p className="muted">まだ実行グラフはありません。実行後に表示されます。</p>
  }

  const activeStep =
    executionGraph.steps.find((step) => step.id === executionGraph.activeStepId) ?? null
  const failedStep =
    executionGraph.steps.find((step) => step.id === executionGraph.failedStepId) ?? null
  const reviewStep =
    executionGraph.steps.find((step) => step.id === executionGraph.reviewStepId) ?? null
  const retryCandidates = executionGraph.steps.filter((step) =>
    executionGraph.retryCandidates.includes(step.id),
  )

  return (
    <section className="execution-graph-panel">
      <div className="execution-graph-meta">
        <div>
          <span className="eyebrow">Run ID</span>
          <strong>{executionGraph.runId.slice(0, 24)}...</strong>
        </div>
        <div>
          <span className="eyebrow">実行中</span>
          <strong>{activeStep?.nodeTitle ?? 'なし'}</strong>
        </div>
        <div>
          <span className="eyebrow">失敗</span>
          <strong>{failedStep?.nodeTitle ?? 'なし'}</strong>
        </div>
        <div>
          <span className="eyebrow">確認待ち</span>
          <strong>{reviewStep?.nodeTitle ?? 'なし'}</strong>
        </div>
      </div>

      <div className="execution-graph-summary">
        <div>
          <h4>再試行候補</h4>
          {retryCandidates.length === 0 ? (
            <p className="muted">候補なし</p>
          ) : (
            retryCandidates.map((step) => <p key={step.id}>{step.nodeTitle}</p>)
          )}
        </div>
        <div>
          <h4>レビュー候補</h4>
          {reviewStep ? <p>{reviewStep.nodeTitle}</p> : <p className="muted">候補なし</p>}
        </div>
      </div>

      <div className="execution-step-list">
        {executionGraph.steps.map((step) => (
          <article key={step.id} className={`execution-step-card step-${step.status}`}>
            <div className="execution-step-header">
              <strong>{step.nodeTitle}</strong>
              <span>{executionStepStatusLabels[step.status]}</span>
            </div>
            <p>
              経路: {routeKindLabels[step.route]}
              {step.durationMs ? ` / ${step.durationMs} ms` : ''}
            </p>
            {step.message ? <p>{step.message}</p> : null}
            {step.error ? <p className="error-text">{step.error}</p> : null}
          </article>
        ))}
      </div>

      {executionGraph.routes.length > 0 && (
        <div className="execution-route-list">
          <h4>経路一覧</h4>
          {executionGraph.routes.map((route) => (
            <p key={route.id}>
              {routeKindLabels[route.kind]}: {route.fromNodeId}
              {route.toNodeId ? ` → ${route.toNodeId}` : ''} / {route.reason}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
