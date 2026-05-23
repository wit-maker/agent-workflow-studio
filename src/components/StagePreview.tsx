import { useState } from 'react'
import type { Workflow, WorkflowArtifact, WorkflowNode } from '../domain/workflow'

type StagePreviewProps = {
  artifact: WorkflowArtifact
  checkOutcome: string
  workflow: Workflow
  selectedNode: WorkflowNode | undefined
}

export function StagePreview({
  artifact,
  checkOutcome,
  workflow,
  selectedNode,
}: StagePreviewProps) {
  const [activeTab, setActiveTab] = useState<'Preview' | 'Markdown' | 'JSON'>('Preview')
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
    <section className="stage-preview" aria-label="Stage preview">
      <div className="panel-heading compact">
        <span className="eyebrow">Stage</span>
        <h2>{artifact.title}</h2>
      </div>
      <div className="stage-tabs" aria-label="Artifact views">
        {(['Preview', 'Markdown', 'JSON'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
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
      <div className={`review-badge review-${checkOutcome.toLowerCase()}`}>
        Check: {checkOutcome}
      </div>
    </section>
  )
}
