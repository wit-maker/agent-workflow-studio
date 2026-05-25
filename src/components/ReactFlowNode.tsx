import { Handle, Position, type NodeProps } from '@xyflow/react'
import { agentRoleLabels, formatDataTypeLabel, nodeCategoryLabels, statusLabels } from '../domain/displayLabels'
import {
  reactFlowNodeType,
  type ReactFlowWorkflowNode,
} from '../domain/reactFlowAdapter'
import type { NodeCategory } from '../domain/workflow'

export function ReactFlowNode({
  data,
  selected,
}: NodeProps<ReactFlowWorkflowNode>) {
  const {
    node,
    inputPorts,
    outputPorts,
    unconnectedRequiredInputPortIds,
    connectedInputPortIds,
    connectedOutputPortIds,
    connectionCount,
  } = data

  return (
    <div
      className={`react-flow-node node-${node.status} ${selected ? 'selected' : ''}`}
      aria-label={`${node.title} ノード`}
    >
      <div className="react-flow-node-header">
        <span className="node-category">{nodeCategoryLabels[node.category as NodeCategory] ?? node.category}</span>
        <span className="node-status">{statusLabels[node.status]}</span>
      </div>
      <strong>{node.title}</strong>
      <div className="react-flow-node-meta">
        <span>{node.type}</span>
        <span>{node.agentRole ? agentRoleLabels[node.agentRole] : '未割当'}</span>
      </div>
      <div className="react-flow-node-body">
        <section className="react-flow-port-group">
          <div className="react-flow-port-heading">
            <span className="react-flow-port-title">入力ポート</span>
            <span className="react-flow-port-side-hint">左側で受信</span>
          </div>
          {inputPorts.length === 0 ? (
            <span className="react-flow-port-empty">なし</span>
          ) : (
            inputPorts.map((port) => {
              const required = port.required
              const unconnectedRequired = unconnectedRequiredInputPortIds.includes(port.id)
              const connected = connectedInputPortIds.includes(port.id)

              return (
                <div
                  key={port.id}
                  className={`react-flow-port-row react-flow-port-row-input ${unconnectedRequired ? 'required-missing' : connected ? 'connected' : ''}`}
                >
                  <Handle
                    id={port.id}
                    type="target"
                    position={Position.Left}
                    className="react-flow-handle react-flow-handle-target"
                  />
                  <div className="react-flow-port-copy">
                    <div className="react-flow-port-line">
                      <strong>
                        {port.label}
                        {required ? '*' : ''}
                      </strong>
                      <span className="react-flow-port-direction react-flow-port-direction-input">
                        入力
                      </span>
                    </div>
                    <span>{formatDataTypeLabel(port.dataType)}</span>
                  </div>
                  <div className="react-flow-port-badges">
                    <span
                      className={`react-flow-port-required ${required ? 'required' : 'optional'}`}
                    >
                      {required ? '必須' : '任意'}
                    </span>
                    {unconnectedRequired ? (
                      <span className="react-flow-port-warning">未接続</span>
                    ) : connected ? (
                      <span className="react-flow-port-connected">接続済み</span>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </section>
        <section className="react-flow-port-group">
          <div className="react-flow-port-heading">
            <span className="react-flow-port-title">出力ポート</span>
            <span className="react-flow-port-side-hint">右側から送信</span>
          </div>
          {outputPorts.length === 0 ? (
            <span className="react-flow-port-empty">なし</span>
          ) : (
            outputPorts.map((port) => (
              <div
                key={port.id}
                className={`react-flow-port-row react-flow-port-row-output ${connectedOutputPortIds.includes(port.id) ? 'connected' : ''}`}
              >
                <div className="react-flow-port-copy">
                  <div className="react-flow-port-line">
                    <strong>
                      {port.label}
                      {port.required ? '*' : ''}
                    </strong>
                    <span className="react-flow-port-direction react-flow-port-direction-output">
                      出力
                    </span>
                  </div>
                  <span>{formatDataTypeLabel(port.dataType)}</span>
                </div>
                <div className="react-flow-port-badges">
                  <span
                    className={`react-flow-port-required ${port.required ? 'required' : 'optional'}`}
                  >
                    {port.required ? '必須' : '任意'}
                  </span>
                  {connectedOutputPortIds.includes(port.id) ? (
                    <span className="react-flow-port-connected">接続済み</span>
                  ) : null}
                </div>
                <Handle
                  id={port.id}
                  type="source"
                  position={Position.Right}
                  className="react-flow-handle react-flow-handle-source"
                />
              </div>
            ))
          )}
        </section>
      </div>
      <div className="react-flow-node-footer">
        <span>{connectionCount} 接続</span>
        <span>
          {node.metrics?.estimatedTokens ?? 0} tokens / {node.metrics?.estimatedLatencyMs ?? 0} ms
        </span>
      </div>
    </div>
  )
}

ReactFlowNode.displayName = reactFlowNodeType
