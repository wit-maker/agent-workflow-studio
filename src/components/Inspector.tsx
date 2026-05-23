import { getConnectionError } from '../domain/connectionRules'
import { agentRoleLabels, statusLabels, type WorkflowNode } from '../domain/workflow'

type InspectorProps = {
  selectedNode: WorkflowNode | undefined
  nodes: WorkflowNode[]
}

export function Inspector({ selectedNode, nodes }: InspectorProps) {
  const nextNode = selectedNode
    ? nodes.find((node) => node.position.x > selectedNode.position.x)
    : undefined
  const connectionError =
    selectedNode && nextNode ? getConnectionError(selectedNode, nextNode) : null

  return (
    <aside className="inspector" aria-label="Selected node inspector">
      <div className="panel-heading">
        <span className="eyebrow">Inspector</span>
        <h2>{selectedNode?.title ?? 'No node selected'}</h2>
      </div>
      {selectedNode ? (
        <>
          <p className="muted">{selectedNode.description}</p>
          <dl className="property-list">
            <div>
              <dt>Status</dt>
              <dd>{statusLabels[selectedNode.status]}</dd>
            </div>
            <div>
              <dt>Agent</dt>
              <dd>
                {selectedNode.agentRole
                  ? agentRoleLabels[selectedNode.agentRole]
                  : 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt>Inputs</dt>
              <dd>{selectedNode.inputTypes.join(', ') || 'None'}</dd>
            </div>
            <div>
              <dt>Outputs</dt>
              <dd>{selectedNode.outputTypes.join(', ')}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{String(selectedNode.config.mode)}</dd>
            </div>
          </dl>
          <section className="inspector-section">
            <h3>Type Check</h3>
            <p className={connectionError ? 'warning-text' : 'success-text'}>
              {nextNode
                ? connectionError ?? `Can connect to ${nextNode.title}.`
                : 'End of this sample path.'}
            </p>
          </section>
          <section className="inspector-section">
            <h3>Metrics</h3>
            <div className="mini-metrics">
              <span>{selectedNode.metrics?.estimatedTokens ?? 0} tokens</span>
              <span>${selectedNode.metrics?.estimatedCost?.toFixed(3) ?? '0.000'}</span>
              <span>{selectedNode.metrics?.estimatedLatencyMs ?? 0} ms</span>
            </div>
          </section>
        </>
      ) : (
        <p className="muted">Select a node from the canvas or palette.</p>
      )}
    </aside>
  )
}
