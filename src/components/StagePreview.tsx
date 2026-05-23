import type { WorkflowArtifact } from '../domain/workflow'

type StagePreviewProps = {
  artifact: WorkflowArtifact
  checkOutcome: string
}

export function StagePreview({ artifact, checkOutcome }: StagePreviewProps) {
  return (
    <section className="stage-preview" aria-label="Stage preview">
      <div className="panel-heading compact">
        <span className="eyebrow">Stage</span>
        <h2>{artifact.title}</h2>
      </div>
      <div className="stage-tabs" aria-label="Artifact views">
        <button type="button" className="active">
          Preview
        </button>
        <button type="button">Markdown</button>
        <button type="button">JSON</button>
        <button type="button" disabled>
          Publish
        </button>
      </div>
      <pre>{artifact.content}</pre>
      <div className={`review-badge review-${checkOutcome.toLowerCase()}`}>
        Check: {checkOutcome}
      </div>
    </section>
  )
}
