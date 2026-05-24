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

type ConfigValidation =
  | { valid: true; error: null; value: Record<string, unknown> }
  | { valid: false; error: string; value: null }

function validateConfigText(text: string): ConfigValidation {
  if (typeof text !== 'string' || !text.trim()) {
    return { valid: false, error: 'Config JSON は空にできません。', value: null }
  }
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: 'Config JSON はオブジェクト形式で入力してください。', value: null }
    }
    return { valid: true, error: null, value: parsed as Record<string, unknown> }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'JSON形式が正しくありません。',
      value: null,
    }
  }
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
  const [configText, setConfigText] = useState(() => JSON.stringify(selectedNode.config ?? {}, null, 2))
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const originalConfigJson = useMemo(
    () => JSON.stringify(selectedNode.config ?? {}),
    [selectedNode.config],
  )

  const configValidation = useMemo(() => validateConfigText(configText), [configText])

  const isDirty = useMemo(() => {
    if (title.trim() !== selectedNode.title) return true
    if (description.trim() !== selectedNode.description) return true
    if (agentRole !== (selectedNode.agentRole ?? '')) return true
    if (!configValidation.valid) return true
    return JSON.stringify(configValidation.value) !== originalConfigJson
  }, [title, description, agentRole, configValidation, selectedNode, originalConfigJson])

  const canSave = isDirty && configValidation.valid && title.trim().length > 0

  const nextNode = nodes.find((node) => node.position.x > selectedNode.position.x)
  const connectionError = nextNode ? getConnectionError(selectedNode, nextNode) : null

  const selectedValidation = useMemo(
    () =>
      connectionValidation.filter(
        (result) =>
          result.sourceLabel === selectedNode.title || result.targetLabel === selectedNode.title,
      ),
    [connectionValidation, selectedNode.title],
  )

  function markDirty() {
    setSaveMessage(null)
  }

  function handleReset() {
    setTitle(selectedNode.title)
    setDescription(selectedNode.description)
    setAgentRole(selectedNode.agentRole ?? '')
    setConfigText(JSON.stringify(selectedNode.config ?? {}, null, 2))
    setSaveMessage(null)
  }

  function handleFormatJson() {
    if (configValidation.valid) {
      setConfigText(JSON.stringify(configValidation.value, null, 2))
    }
  }

  function saveChanges() {
    if (!configValidation.valid || !configValidation.value || !title.trim()) {
      return
    }

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    onSaveNode(selectedNode.id, {
      title: trimmedTitle,
      description: trimmedDescription,
      agentRole: agentRole || undefined,
      config: configValidation.value,
    })

    setTitle(trimmedTitle)
    setDescription(trimmedDescription)
    setConfigText(JSON.stringify(configValidation.value, null, 2))
    setSaveMessage('ワークフロー状態へ保存しました。')
  }

  return (
    <aside className="inspector" aria-label="選択ノードのインスペクター">
      <div className="panel-heading">
        <span className="eyebrow">インスペクター</span>
        <h2>{selectedNode.title}</h2>
      </div>

      <section className="inspector-section">
        <h3>基本情報</h3>
        <dl className="property-list">
          <div>
            <dt>種別</dt>
            <dd>{selectedNode.type}</dd>
          </div>
          <div>
            <dt>状態</dt>
            <dd>{statusLabels[selectedNode.status]}</dd>
          </div>
          <div>
            <dt>担当</dt>
            <dd>{selectedNode.agentRole ? agentRoleLabels[selectedNode.agentRole] : '未割当'}</dd>
          </div>
          <div>
            <dt>入力型</dt>
            <dd>
              {getInputPorts(selectedNode).length === 0
                ? 'なし'
                : getInputPorts(selectedNode)
                    .map((p) => `${formatDataTypeLabel(p.dataType)}${p.required ? '（必須）' : ''}`)
                    .join('、')}
            </dd>
          </div>
          <div>
            <dt>出力型</dt>
            <dd>
              {getOutputPorts(selectedNode)
                .map((p) => formatDataTypeLabel(p.dataType))
                .join('、')}
            </dd>
          </div>
        </dl>
      </section>

      <section className="inspector-section">
        <h3>編集</h3>
        {isDirty ? (
          <p className="inspector-dirty-banner">未保存の変更があります</p>
        ) : null}
        <label className="field-label">
          タイトル
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              markDirty()
            }}
          />
        </label>
        {!title.trim() ? <p className="error-text">タイトルは必須です。</p> : null}
        <label className="field-label">
          説明
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              markDirty()
            }}
            rows={3}
          />
        </label>
        <label className="field-label">
          担当ロール
          <select
            value={agentRole}
            onChange={(event) => {
              setAgentRole(event.target.value as AgentRole | '')
              markDirty()
            }}
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
            className={`json-editor ${configValidation.valid ? 'json-editor--valid' : 'json-editor--invalid'}`}
            value={configText}
            onChange={(event) => {
              setConfigText(event.target.value)
              markDirty()
            }}
            rows={7}
          />
        </label>
        {configValidation.error ? (
          <p className="error-text">{configValidation.error}</p>
        ) : null}
        <button
          type="button"
          className="icon-button inline-action"
          onClick={handleFormatJson}
          disabled={!configValidation.valid}
        >
          JSONを整形
        </button>
        {saveMessage ? <p className="success-text">{saveMessage}</p> : null}
        <div className="inspector-action-row">
          <button
            type="button"
            className="primary-button inline-action"
            onClick={saveChanges}
            disabled={!canSave}
            title={
              !isDirty
                ? '変更がありません'
                : !configValidation.valid
                  ? 'Config JSONが不正です'
                  : 'ノードを保存'
            }
          >
            {isDirty ? 'ノードを保存' : '変更なし'}
          </button>
          <button
            type="button"
            className="icon-button inline-action"
            onClick={handleReset}
            disabled={!isDirty}
          >
            変更を破棄
          </button>
        </div>
      </section>

      <section className="inspector-section">
        <h3>ポート</h3>
        {(() => {
          const unconnectedRequired = getUnconnectedRequiredInputPorts(selectedNode, connections)
          return unconnectedRequired.length > 0 ? (
            <p className="warning-text">
              必須入力ポートが未接続です:{' '}
              {unconnectedRequired.map((p) => formatDataTypeLabel(p.dataType)).join('、')}
            </p>
          ) : null
        })()}
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
                  {formatDataTypeLabel(port.dataType)} /{' '}
                  {connected ? '接続済み' : port.required ? '必須・未接続' : '任意'}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <section className="inspector-section">
        <h3>接続検証</h3>
        <p className={connectionError ? 'warning-text' : 'success-text'}>
          {nextNode
            ? connectionError ?? `${nextNode.title} に接続できます。`
            : 'このサンプル経路の終端です。'}
        </p>
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
          <span>
            {selectedNode.metrics?.estimatedTokens ?? 0} {metricLabels.tokens}
          </span>
          <span>${selectedNode.metrics?.estimatedCost?.toFixed(3) ?? '0.000'}</span>
          <span>{selectedNode.metrics?.estimatedLatencyMs ?? 0} ms</span>
        </div>
      </section>

      <section className="inspector-section">
        <h3>接続編集</h3>
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
      </section>
    </aside>
  )
}
