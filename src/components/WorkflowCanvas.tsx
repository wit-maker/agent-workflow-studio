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
    <main className="canvas-panel" aria-label="ワークフローキャンバス">
      <div className="canvas-toolbar">
        <span>キャンバス</span>
        <button type="button">全体表示</button>
        <button type="button">検証</button>
        <button type="button">モック実行のみ</button>
        <strong className={invalidConnections.length === 0 ? 'valid-count' : 'invalid-count'}>
          {invalidConnections.length === 0
            ? `有効な接続 ${connectionValidation.length} 件`
            : `無効な接続 ${invalidConnections.length} 件`}
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
          <section className="connection-validation-card" aria-label="接続検証">
            <h3>接続検証</h3>
            {connectionValidation.slice(0, 5).map((result) => (
              <p key={result.connectionId} className={result.valid ? 'success-text' : 'error-text'}>
                {result.sourceLabel} → {result.targetLabel}: {result.valid ? '有効' : result.reason}
              </p>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
