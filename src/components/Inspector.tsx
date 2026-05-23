import { useMemo, useState } from 'react'
import { getConnectionError } from '../domain/connectionRules'
import {
  agentRoleLabels,
  formatDataTypeLabel,
  metricLabels,
  statusLabels,
} from '../domain/displayLabels'
import {
  getInputPorts,
  getOutputPorts,
  getUnconnectedRequiredInputPorts,
  isPortConnected,
} from '../domain/portRules'
import type {
  AgentRole,
  ConnectionKind,
  WorkflowConnection,
  WorkflowNode,
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
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
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
      <aside className="inspector" aria-label="選択ノードのインスペクター">
        <div className="panel-heading">
          <span className="eyebrow">インスペクター</span>
          <h2>ノードが選択されていません</h2>
        </div>
        <p className="muted">キャンバスまたはパレットからノードを選択してください。</p>
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
        setEditError('Config JSON はオブジェクト形式で入力してください。')
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
      setSaveMessage('ワークフロー状態へ保存しました。')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'JSON形式が正しくありません。')
      setSaveMessage(null)
    }
  }

  return (
    <aside className="inspector" aria-label="選択ノードのインスペクター">
      <div className="panel-heading">
        <span className="eyebrow">インスペクター</span>
        <h2>{selectedNode.title}</h2>
      </div>
      <>
        <p className="muted">{selectedNode.description}</p>
        <dl className="property-list">
          <div>
            <dt>状態</dt>
            <dd>{statusLabels[selectedNode.status]}</dd>
          </div>
          <div>
            <dt>担当</dt>
            <dd>{selectedNode.agentRole ? agentRoleLabels[selectedNode.agentRole] : '未割当'}</dd>
          </div>
          <div>
            <dt>入力</dt>
            <dd>
              {getInputPorts(selectedNode).length === 0
                ? 'なし'
                : getInputPorts(selectedNode)
                    .map((p) => `${formatDataTypeLabel(p.dataType)}${p.required ? '（必須）' : ''}`)
                    .join('、')}
            </dd>
          </div>
          <div>
            <dt>出力</dt>
            <dd>
              {getOutputPorts(selectedNode)
                .map((p) => formatDataTypeLabel(p.dataType))
                .join('、')}
            </dd>
          </div>
          <div>
            <dt>モード</dt>
            <dd>{String(selectedNode.config.mode)}</dd>
          </div>
        </dl>

        <section className="inspector-section">
          <h3>ポート</h3>
          {getUnconnectedRequiredInputPorts(selectedNode, connections).length > 0 && (
            <p className="warning-text">
              必須入力ポートが未接続です:{' '}
              {getUnconnectedRequiredInputPorts(selectedNode, connections)
                .map((p) => formatDataTypeLabel(p.dataType))
                .join('、')}
            </p>
          )}
          <div className="port-list">
            <div>
              <strong>入力ポート</strong>
              {getInputPorts(selectedNode).length === 0 ? (
                <span className="muted">開始ノード</span>
              ) : (
                getInputPorts(selectedNode).map((port) => {
                  const connected = isPortConnected(port, selectedNode.id, connections)
                  return (
                    <span key={port.id} className={connected ? 'port-chip connected' : 'port-chip'}>
                      {formatDataTypeLabel(port.dataType)} /{' '}
                      {connected ? '接続済み' : port.required ? '必須・未接続' : '任意'}
                    </span>
                  )
                })
              )}
            </div>
            <div>
              <strong>出力ポート</strong>
              {getOutputPorts(selectedNode).map((port) => {
                const connected = isPortConnected(port, selectedNode.id, connections)
                return (
                  <span key={port.id} className={connected ? 'port-chip connected' : 'port-chip'}>
                    {formatDataTypeLabel(port.dataType)} / {connected ? '接続済み' : '任意'}
                  </span>
                )
              })}
            </div>
          </div>
        </section>

        <section className="inspector-section">
          <h3>ノード編集</h3>
          <label className="field-label">
            タイトル
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field-label">
            説明
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>
          <label className="field-label">
            担当ロール
            <select
              value={agentRole}
              onChange={(event) => setAgentRole(event.target.value as AgentRole | '')}
            >
              <option value="">未割当</option>
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
            ノードを保存
          </button>
        </section>

        <section className="inspector-section">
          <h3>型チェック</h3>
          <p className={connectionError ? 'warning-text' : 'success-text'}>
            {nextNode
              ? connectionError ?? `${nextNode.title} に接続できます。`
              : 'このサンプル経路の終端です。'}
          </p>
        </section>

        <section className="inspector-section">
          <h3>接続検証</h3>
          <div className="validation-list">
            {selectedValidation.length === 0 ? (
              <p className="muted">このノードに直接関係する検証結果はありません。</p>
            ) : (
              selectedValidation.map((result) => (
                <p key={result.connectionId} className={result.valid ? 'success-text' : 'error-text'}>
                  {result.sourceLabel} → {result.targetLabel}: {result.valid ? '有効' : result.reason}
                </p>
              ))
            )}
          </div>
        </section>

        <section className="inspector-section">
          <h3>メトリクス</h3>
          <div className="mini-metrics">
            <span>{selectedNode.metrics?.estimatedTokens ?? 0} {metricLabels.tokens}</span>
            <span>${selectedNode.metrics?.estimatedCost?.toFixed(3) ?? '0.000'}</span>
            <span>{selectedNode.metrics?.estimatedLatencyMs ?? 0} ms</span>
          </div>
        </section>

        <ConnectionEditor
          workflow={{
            id: 'inspector-workflow-view',
            name: 'インスペクター表示用ワークフロー',
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
