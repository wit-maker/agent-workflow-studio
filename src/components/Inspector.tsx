import { useMemo, useState } from 'react'
import { getConnectionError } from '../domain/connectionRules'
import {
  agentRoleLabels,
  statusLabels,
  type ConnectionKind,
  type WorkflowConnection,
  type AgentRole,
  type WorkflowNode,
} from '../domain/workflow'
import type { ConnectionValidationResult } from '../state/workflowSelectors'
import { ConnectionEditor } from './ConnectionEditor'

type InspectorProps = {
  selectedNode: WorkflowNode | undefined
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  connectionValidation: ConnectionValidationResult[]
  onSaveNode: (
    nodeId: string,
    updates: {
      title: string
      description: string
      agentRole: AgentRole | undefined
      config: Record<string, unknown>
    },
  ) => void
  onCreateConnection: (draft: {
    sourceNodeId: string
    sourcePort: string
    targetNodeId: string
    targetPort: string
    kind: ConnectionKind
  }) => void
  onDeleteConnection: (connectionId: string) => void
}

export function Inspector({
  selectedNode,
  nodes,
  connections,
  connectionValidation,
  onSaveNode,
  onCreateConnection,
  onDeleteConnection,
}: InspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="inspector" aria-label="Selected node inspector">
        <div className="panel-heading">
          <span className="eyebrow">Inspector</span>
          <h2>No node selected</h2>
        </div>
        <p className="muted">Select a node from the canvas or palette.</p>
      </aside>
    )
  }

  return (
    <InspectorContent
      key={selectedNode.id}
      selectedNode={selectedNode}
      nodes={nodes}
      connections={connections}
      connectionValidation={connectionValidation}
      onSaveNode={onSaveNode}
      onCreateConnection={onCreateConnection}
      onDeleteConnection={onDeleteConnection}
    />
  )
}

type InspectorContentProps = Omit<InspectorProps, 'selectedNode'> & {
  selectedNode: WorkflowNode
}

function InspectorContent({
  selectedNode,
  nodes,
  connections,
  connectionValidation,
  onSaveNode,
  onCreateConnection,
  onDeleteConnection,
}: InspectorContentProps) {
  const [title, setTitle] = useState(selectedNode.title)
  const [description, setDescription] = useState(selectedNode.description)
  const [agentRole, setAgentRole] = useState<AgentRole | ''>(selectedNode.agentRole ?? '')
  const [configText, setConfigText] = useState(JSON.stringify(selectedNode.config, null, 2))
  const [editError, setEditError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const nextNode = nodes.find((node) => node.position.x > selectedNode.position.x)
  const connectionError = nextNode ? getConnectionError(selectedNode, nextNode) : null

  const selectedValidation = useMemo(
    () =>
      connectionValidation.filter(
        (result) =>
          result.sourceLabel === selectedNode.title || result.targetLabel === selectedNode.title,
      ),
    [connectionValidation, selectedNode],
  )

  function saveChanges() {
    try {
      const parsedConfig = JSON.parse(configText) as unknown
      if (
        typeof parsedConfig !== 'object' ||
        parsedConfig === null ||
        Array.isArray(parsedConfig)
      ) {
        setEditError('Config JSON must be an object.')
        setSaveMessage(null)
        return
      }

      onSaveNode(selectedNode.id, {
        title: title.trim() || selectedNode.title,
        description: description.trim() || selectedNode.description,
        agentRole: agentRole || undefined,
        config: parsedConfig as Record<string, unknown>,
      })
      setEditError(null)
      setSaveMessage('Saved to workflow state.')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Config JSON is invalid.')
      setSaveMessage(null)
    }
  }

  return (
    <aside className="inspector" aria-label="Selected node inspector">
      <div className="panel-heading">
        <span className="eyebrow">Inspector</span>
        <h2>{selectedNode.title}</h2>
      </div>
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
            <h3>Ports</h3>
            <div className="port-list">
              <div>
                <strong>Input ports</strong>
                {selectedNode.inputTypes.length === 0 ? (
                  <span className="muted">Start node</span>
                ) : (
                  selectedNode.inputTypes.map((type) => {
                    const connected = connections.some(
                      (connection) =>
                        connection.targetNodeId === selectedNode.id &&
                        (connection.targetPort === type || connection.carries.includes(type)),
                    )
                    return (
                      <span key={type} className={connected ? 'port-chip connected' : 'port-chip'}>
                        {type} / {connected ? 'connected' : 'optional'}
                      </span>
                    )
                  })
                )}
              </div>
              <div>
                <strong>Output ports</strong>
                {selectedNode.outputTypes.map((type) => {
                  const connected = connections.some(
                    (connection) =>
                      connection.sourceNodeId === selectedNode.id &&
                      (connection.sourcePort === type || connection.carries.includes(type)),
                  )
                  return (
                    <span key={type} className={connected ? 'port-chip connected' : 'port-chip'}>
                      {type} / {connected ? 'connected' : 'optional'}
                    </span>
                  )
                })}
              </div>
            </div>
          </section>
          <section className="inspector-section">
            <h3>Edit Node</h3>
            <label className="field-label">
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field-label">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </label>
            <label className="field-label">
              Agent role
              <select
                value={agentRole}
                onChange={(event) => setAgentRole(event.target.value as AgentRole | '')}
              >
                <option value="">Unassigned</option>
                {Object.entries(agentRoleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Config JSON
              <textarea
                className="json-editor"
                value={configText}
                onChange={(event) => setConfigText(event.target.value)}
                rows={7}
              />
            </label>
            {editError ? <p className="error-text">{editError}</p> : null}
            {saveMessage ? <p className="success-text">{saveMessage}</p> : null}
            <button type="button" className="primary-button inline-action" onClick={saveChanges}>
              Save Node
            </button>
          </section>
          <section className="inspector-section">
            <h3>Type Check</h3>
            <p className={connectionError ? 'warning-text' : 'success-text'}>
              {nextNode
                ? connectionError ?? `Can connect to ${nextNode.title}.`
                : 'End of this sample path.'}
            </p>
          </section>
          <section className="inspector-section">
            <h3>Connection Validation</h3>
            <div className="validation-list">
              {selectedValidation.length === 0 ? (
                <p className="muted">No direct validation entries for this node.</p>
              ) : (
                selectedValidation.map((result) => (
                  <p key={result.connectionId} className={result.valid ? 'success-text' : 'error-text'}>
                    {result.sourceLabel} to {result.targetLabel}: {result.valid ? 'valid' : result.reason}
                  </p>
                ))
              )}
            </div>
          </section>
          <section className="inspector-section">
            <h3>Metrics</h3>
            <div className="mini-metrics">
              <span>{selectedNode.metrics?.estimatedTokens ?? 0} tokens</span>
              <span>${selectedNode.metrics?.estimatedCost?.toFixed(3) ?? '0.000'}</span>
              <span>{selectedNode.metrics?.estimatedLatencyMs ?? 0} ms</span>
            </div>
          </section>
          <ConnectionEditor
            workflow={{
              id: 'inspector-workflow-view',
              name: 'Inspector workflow view',
              description: '',
              version: 1,
              status: 'ready',
              nodes,
              connections,
              metrics: {
                tokens: 0,
                cost: 0,
                latencyMs: 0,
                successRate: 0,
                queueCount: 0,
                retryCount: 0,
                bottleneckNodeId: null,
              },
              logs: [],
              artifact: {
                title: '',
                format: 'Preview',
                content: '',
                status: 'draft',
              },
              createdAt: '',
              updatedAt: '',
            }}
            connectionValidation={connectionValidation}
            onCreateConnection={onCreateConnection}
            onDeleteConnection={onDeleteConnection}
          />
      </>
    </aside>
  )
}
