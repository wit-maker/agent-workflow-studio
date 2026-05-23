import type { Workflow } from '../domain/workflow'
import type { ConnectionValidationResult } from '../state/workflowSelectors'
import { ConnectionLine } from './ConnectionLine'
import { NodeCard } from './NodeCard'

type WorkflowCanvasProps = {
  workflow: Workflow
  selectedNodeId: string
  onSelectNode: (nodeId: string) => void
  connectionValidation: ConnectionValidationResult[]
}

export function WorkflowCanvas({
  workflow,
  selectedNodeId,
  onSelectNode,
  connectionValidation,
}: WorkflowCanvasProps) {
  const invalidConnections = connectionValidation.filter((result) => !result.valid)

  return (
    <main className="canvas-panel" aria-label="Workflow canvas">
      <div className="canvas-toolbar">
        <span>Canvas</span>
        <button type="button">Fit</button>
        <button type="button">Validate</button>
        <button type="button">Mock APIs only</button>
        <strong className={invalidConnections.length === 0 ? 'valid-count' : 'invalid-count'}>
          {invalidConnections.length === 0
            ? `${connectionValidation.length} valid connections`
            : `${invalidConnections.length} invalid connections`}
        </strong>
      </div>
      <div className="canvas-scroll">
        <div className="workflow-canvas">
          <svg className="connections-layer" viewBox="0 0 2100 360" aria-hidden="true">
            {workflow.connections.map((connection) => (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                nodes={workflow.nodes}
              />
            ))}
          </svg>
          {workflow.nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              onSelect={onSelectNode}
            />
          ))}
          <section className="connection-validation-card" aria-label="Connection validation">
            <h3>Connection Validation</h3>
            {connectionValidation.slice(0, 5).map((result) => (
              <p key={result.connectionId} className={result.valid ? 'success-text' : 'error-text'}>
                {result.sourceLabel} to {result.targetLabel}: {result.valid ? 'valid' : result.reason}
              </p>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
