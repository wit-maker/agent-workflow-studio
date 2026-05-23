import type { Workflow } from '../domain/workflow'
import { ConnectionLine } from './ConnectionLine'
import { NodeCard } from './NodeCard'

type WorkflowCanvasProps = {
  workflow: Workflow
  selectedNodeId: string
  onSelectNode: (nodeId: string) => void
}

export function WorkflowCanvas({
  workflow,
  selectedNodeId,
  onSelectNode,
}: WorkflowCanvasProps) {
  return (
    <main className="canvas-panel" aria-label="Workflow canvas">
      <div className="canvas-toolbar">
        <span>Canvas</span>
        <button type="button">Fit</button>
        <button type="button">Validate</button>
        <button type="button">Mock APIs only</button>
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
        </div>
      </div>
    </main>
  )
}
