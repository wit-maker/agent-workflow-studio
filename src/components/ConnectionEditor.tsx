import { useMemo, useState } from 'react'
import {
  connectionKinds,
  type ConnectionKind,
  type Workflow,
  type WorkflowDataType,
} from '../domain/workflow'
import type { ConnectionValidationResult } from '../state/workflowSelectors'
import { validateConnectionDraft } from '../state/workflowSelectors'

type ConnectionEditorProps = {
  workflow: Workflow
  connectionValidation: ConnectionValidationResult[]
  onCreateConnection: (draft: {
    sourceNodeId: string
    sourcePort: string
    targetNodeId: string
    targetPort: string
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
  const [sourcePort, setSourcePort] = useState<WorkflowDataType>(
    sourceNode?.outputTypes[0] ?? 'Trigger',
  )
  const [targetPort, setTargetPort] = useState<WorkflowDataType>(
    targetNode?.inputTypes[0] ?? 'Trigger',
  )
  const [kind, setKind] = useState<ConnectionKind>('data')

  const draftValidation = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return null
    }
    return validateConnectionDraft(workflow, {
      sourceNodeId,
      sourcePort,
      targetNodeId,
      targetPort,
      kind,
    })
  }, [kind, sourceNode, sourceNodeId, sourcePort, targetNode, targetNodeId, targetPort, workflow])

  function selectSource(nodeId: string) {
    const nextSource = workflow.nodes.find((node) => node.id === nodeId)
    setSourceNodeId(nodeId)
    setSourcePort(nextSource?.outputTypes[0] ?? 'Trigger')
  }

  function selectTarget(nodeId: string) {
    const nextTarget = workflow.nodes.find((node) => node.id === nodeId)
    setTargetNodeId(nodeId)
    setTargetPort(nextTarget?.inputTypes[0] ?? 'Trigger')
  }

  return (
    <section className="connection-editor" aria-label="Connection editor">
      <div className="panel-heading compact">
        <span className="eyebrow">Connections</span>
        <h3>Connection Editor</h3>
      </div>
      <div className="connection-form-grid">
        <label className="field-label">
          Source node
          <select value={sourceNodeId} onChange={(event) => selectSource(event.target.value)}>
            {workflow.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Source output
          <select
            value={sourcePort}
            onChange={(event) => setSourcePort(event.target.value as WorkflowDataType)}
          >
            {(sourceNode?.outputTypes ?? []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Target node
          <select value={targetNodeId} onChange={(event) => selectTarget(event.target.value)}>
            {workflow.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Target input
          <select
            value={targetPort}
            onChange={(event) => setTargetPort(event.target.value as WorkflowDataType)}
          >
            {(targetNode?.inputTypes ?? []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Kind
          <select value={kind} onChange={(event) => setKind(event.target.value as ConnectionKind)}>
            {connectionKinds.map((item) => (
              <option key={item} value={item}>
                {item}
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
              sourcePort,
              targetNodeId,
              targetPort,
              kind,
            })
          }
        >
          Create Connection
        </button>
      </div>
      {draftValidation ? (
        <p className={draftValidation.valid ? 'success-text' : 'error-text'}>
          Draft: {draftValidation.valid ? 'valid' : draftValidation.reason}
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
                  {source?.title ?? connection.sourceNodeId} to{' '}
                  {target?.title ?? connection.targetNodeId}
                </strong>
                <span>
                  {connection.kind} / {connection.carries.join(', ')} / {connection.status}
                </span>
                <span className={validation?.valid ? 'success-text' : 'error-text'}>
                  {validation?.valid ? 'valid' : validation?.reason}
                </span>
              </div>
              <button type="button" className="icon-button" onClick={() => onDeleteConnection(connection.id)}>
                Delete
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
