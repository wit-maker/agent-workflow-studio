import { useState } from 'react'
import {
  checkOutcomeLabels,
  evaluationStatusLabels,
  reviewDecisionLabels,
} from '../domain/displayLabels'
import type { EvaluationResult, HumanReviewState } from '../domain/evaluation'
import type { Workflow, WorkflowArtifact, WorkflowNode } from '../domain/workflow'

type StagePreviewProps = {
  artifact: WorkflowArtifact
  checkOutcome: string
  workflow: Workflow
  selectedNode: WorkflowNode | undefined
  evaluation?: EvaluationResult
  humanReview?: HumanReviewState
  artifactVersionCount: number
  rebuildRequestCount: number
}

export function StagePreview({
  artifact,
  checkOutcome,
  workflow,
  selectedNode,
  evaluation,
  humanReview,
  artifactVersionCount,
  rebuildRequestCount,
}: StagePreviewProps) {
  const [activeTab, setActiveTab] = useState<'Preview' | 'Markdown' | 'JSON'>('Preview')
  const tabLabels = {
    Preview: 'プレビュー',
    Markdown: 'Markdown',
    JSON: 'JSON',
  } as const
  const jsonView = JSON.stringify(
    {
      artifact,
      metrics: workflow.metrics,
      selectedNode: selectedNode
        ? {
            id: selectedNode.id,
            title: selectedNode.title,
            status: selectedNode.status,
            inputTypes: selectedNode.inputTypes,
            outputTypes: selectedNode.outputTypes,
            config: selectedNode.config,
          }
        : null,
    },
    null,
    2,
  )

  return (
    <section className="stage-preview" aria-label="成果物ステージ">
      <div className="panel-heading compact">
        <span className="eyebrow">成果物</span>
        <h2>{artifact.title}</h2>
      </div>

      <div className="stage-meta-row">
        <div className={`review-badge review-${checkOutcome.toLowerCase()}`}>
          判定: {checkOutcomeLabels[checkOutcome as keyof typeof checkOutcomeLabels] ?? checkOutcome}
        </div>

        {evaluation && (
          <div className={`eval-badge-sm eval-${evaluation.status}`}>
            評価: {evaluationStatusLabels[evaluation.status]}
            {' '}({evaluation.totalScore}/{evaluation.maxScore}点)
          </div>
        )}

        {humanReview && humanReview.decision !== 'pending' && (
          <div className={`review-badge review-${humanReview.decision}`}>
            HR: {reviewDecisionLabels[humanReview.decision]}
          </div>
        )}

        {artifactVersionCount > 0 && (
          <div className="version-badge-sm">
            v{artifactVersionCount + 1} (再作成{artifactVersionCount}件)
          </div>
        )}

        {rebuildRequestCount > 0 && (
          <div className="rebuild-count-badge muted">
            再作成依頼 {rebuildRequestCount} 件
          </div>
        )}
      </div>

      <div className="stage-tabs" aria-label="成果物表示">
        {(['Preview', 'Markdown', 'JSON'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      <pre>
        {activeTab === 'Preview'
          ? `${artifact.title}\n\n${artifact.content}`
          : activeTab === 'Markdown'
            ? artifact.content
            : jsonView}
      </pre>
    </section>
  )
}
