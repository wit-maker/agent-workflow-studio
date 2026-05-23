import { useMemo, useState } from 'react'
import {
  connectionKindLabels,
  connectionStatusLabels,
  formatDataTypeLabel,
} from '../domain/displayLabels'
import { findPort, getInputPorts, getOutputPorts } from '../domain/portRules'
import {
  connectionKinds,
  type ConnectionKind,
  type Workflow,
} from '../domain/workflow'
import type { ConnectionValidationResult } from '../state/workflowSelectors'
import { validateConnectionDraft } from '../state/workflowSelectors'

type ConnectionEditorProps = {
  workflow: Workflow
  connectionValidation: ConnectionValidationResult[]
  onCreateConnection: (draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) => void
  onDeleteConnection: (connectionId: string) => void
}

export function ConnectionEditor({
  workflow,
  connectionValidation,
  onCreateConnection,
  onDeleteConnection,
}: ConnectionEditorProps) {
  const [sourceNodeId, setSourceNodeId] = useState(workflow.nodes[0]?.id ?? '')
  const [targetNodeId, setTargetNodeId] = useState(workflow.nodes[1]?.id ?? '')
  const sourceNode = workflow.nodes.find((node) => node.id === sourceNodeId) ?? workflow.nodes[0]
  const targetNode = workflow.nodes.find((node) => node.id === targetNodeId) ?? workflow.nodes[1]

  const sourceOutputPorts = useMemo(
    () => (sourceNode ? getOutputPorts(sourceNode) : []),
    [sourceNode],
  )
  const targetInputPorts = useMemo(
    () => (targetNode ? getInputPorts(targetNode) : []),
    [targetNode],
  )

  const [sourcePortId, setSourcePortId] = useState<string>(sourceOutputPorts[0]?.id ?? '')
  const [targetPortId, setTargetPortId] = useState<string>(targetInputPorts[0]?.id ?? '')
  const [kind, setKind] = useState<ConnectionKind>('data')

  const draftValidation = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return null
    }
    return validateConnectionDraft(workflow, {
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
      kind,
    })
  }, [kind, sourceNode, sourceNodeId, sourcePortId, targetNode, targetNodeId, targetPortId, workflow])

  function selectSource(nodeId: string) {
    const nextSource = workflow.nodes.find((node) => node.id === nodeId)
    setSourceNodeId(nodeId)
    const nextPorts = nextSource ? getOutputPorts(nextSource) : []
    setSourcePortId(nextPorts[0]?.id ?? '')
  }

  function selectTarget(nodeId: string) {
    const nextTarget = workflow.nodes.find((node) => node.id === nodeId)
    setTargetNodeId(nodeId)
    const nextPorts = nextTarget ? getInputPorts(nextTarget) : []
    setTargetPortId(nextPorts[0]?.id ?? '')
  }

  const selectedSourcePort = findPort(sourceOutputPorts, sourcePortId)
  const selectedTargetPort = findPort(targetInputPorts, targetPortId)

  return (
    <section className="connection-editor" aria-label="接続エディター">
      <div className="panel-heading compact">
        <span className="eyebrow">接続</span>
        <h3>接続エディター</h3>
      </div>
      <div className="connection-form-grid">
        <label className="field-label">
          接続元ノード
          <select value={sourceNodeId} onChange={(event) => selectSource(event.target.value)}>
            {workflow.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          接続元出力ポート
          <select
            value={sourcePortId}
            onChange={(event) => setSourcePortId(event.target.value)}
          >
            {sourceOutputPorts.map((port) => (
              <option key={port.id} value={port.id}>
                {formatDataTypeLabel(port.dataType)}
              </option>
            ))}
          </select>
          {selectedSourcePort && (
            <span className="port-meta">
              {formatDataTypeLabel(selectedSourcePort.dataType)} / 出力
            </span>
          )}
        </label>
        <label className="field-label">
          接続先ノード
          <select value={targetNodeId} onChange={(event) => selectTarget(event.target.value)}>
            {workflow.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          接続先入力ポート
          <select
            value={targetPortId}
            onChange={(event) => setTargetPortId(event.target.value)}
          >
            {targetInputPorts.map((port) => (
              <option key={port.id} value={port.id}>
                {formatDataTypeLabel(port.dataType)}
                {port.required ? '（必須）' : '（任意）'}
              </option>
            ))}
          </select>
          {selectedTargetPort && (
            <span className="port-meta">
              {formatDataTypeLabel(selectedTargetPort.dataType)} /{' '}
              {selectedTargetPort.required ? '必須' : '任意'}
            </span>
          )}
        </label>
        <label className="field-label">
          接続種別
          <select value={kind} onChange={(event) => setKind(event.target.value as ConnectionKind)}>
            {connectionKinds.map((item) => (
              <option key={item} value={item}>
                {connectionKindLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary-button inline-action"
          disabled={!draftValidation?.valid}
          onClick={() =>
            onCreateConnection({
              sourceNodeId,
              sourcePortId,
              targetNodeId,
              targetPortId,
              kind,
            })
          }
        >
          接続を作成
        </button>
      </div>
      {draftValidation ? (
        <p className={draftValidation.valid ? 'success-text' : 'error-text'}>
          入力中の接続: {draftValidation.valid ? '有効' : draftValidation.reason}
        </p>
      ) : null}
      <div className="connection-list">
        {workflow.connections.map((connection) => {
          const source = workflow.nodes.find((node) => node.id === connection.sourceNodeId)
          const target = workflow.nodes.find((node) => node.id === connection.targetNodeId)
          const validation = connectionValidation.find(
            (result) => result.connectionId === connection.id,
          )
          return (
            <div key={connection.id} className="connection-row">
              <div>
                <strong>
                  {source?.title ?? connection.sourceNodeId} →{' '}
                  {target?.title ?? connection.targetNodeId}
                </strong>
                <span>
                  {connectionKindLabels[connection.kind]} /{' '}
                  {connection.carries.map(formatDataTypeLabel).join(', ')} /{' '}
                  {connectionStatusLabels[connection.status]}
                </span>
                {(connection.sourcePortId ?? connection.sourcePort) && (
                  <span className="port-meta">
                    出力: {formatDataTypeLabel(
                      connection.sourcePortId
                        ? connection.sourcePortId.replace(/-out$/, '')
                        : (connection.sourcePort ?? ''),
                    )}
                  </span>
                )}
                {(connection.targetPortId ?? connection.targetPort) && (
                  <span className="port-meta">
                    入力: {formatDataTypeLabel(
                      connection.targetPortId
                        ? connection.targetPortId.replace(/-in$/, '')
                        : (connection.targetPort ?? ''),
                    )}
                  </span>
                )}
                <span className={validation?.valid ? 'success-text' : 'error-text'}>
                  {validation?.valid ? '有効' : validation?.reason}
                </span>
              </div>
              <button type="button" className="icon-button" onClick={() => onDeleteConnection(connection.id)}>
                削除
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
