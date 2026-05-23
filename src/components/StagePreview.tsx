import { useMemo, useState } from 'react'
import { checkOutcomeLabels } from '../domain/displayLabels'
import type { ExecutionGraph } from '../domain/executionGraph'
import { summarizeExecutionGraph } from '../domain/executionGraph'
import type { Workflow, WorkflowArtifact, WorkflowNode } from '../domain/workflow'

type StagePreviewProps = {
  artifact: WorkflowArtifact
  checkOutcome: string
  workflow: Workflow
  selectedNode: WorkflowNode | undefined
  executionGraph: ExecutionGraph | null
}

export function StagePreview({
  artifact,
  checkOutcome,
  workflow,
  selectedNode,
  executionGraph,
}: StagePreviewProps) {
  const [activeTab, setActiveTab] = useState<'Preview' | 'Markdown' | 'JSON'>('Preview')
  const tabLabels = {
    Preview: 'プレビュー',
    Markdown: 'Markdown',
    JSON: 'JSON',
  } as const

  const executionSummary = useMemo(
    () => summarizeExecutionGraph(executionGraph),
    [executionGraph],
  )

  const previewSummary = [
    `最終判定: ${checkOutcomeLabels[checkOutcome as keyof typeof checkOutcomeLabels] ?? checkOutcome}`,
    `確認待ち: ${executionSummary.reviewStepId ? 'あり' : 'なし'}`,
    `失敗ノード: ${executionSummary.failedStepId ? 'あり' : 'なし'}`,
    `再試行候補: ${executionSummary.retryCandidates.length} 件`,
    '',
    artifact.content,
  ].join('\n')

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
      executionGraph: executionSummary,
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
          ? previewSummary
          : activeTab === 'Markdown'
            ? artifact.content
            : jsonView}
      </pre>
      <div className={`review-badge review-${checkOutcome.toLowerCase()}`}>
        判定: {checkOutcomeLabels[checkOutcome as keyof typeof checkOutcomeLabels] ?? checkOutcome}
      </div>
    </section>
  )
}
