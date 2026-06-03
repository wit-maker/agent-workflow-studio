import { useMemo, useState } from 'react'
import {
  connectionKindLabels,
  connectionStatusLabels,
  formatDataTypeLabel,
} from '../domain/displayLabels'
import {
  normalizeConnectionRuntimePolicy,
  summarizeConnectionRuntimePolicy,
} from '../domain/edgeRuntimePolicy'
import { findPort, getInputPorts, getOutputPorts } from '../domain/portRules'
import {
  connectionKinds,
  type ConnectionKind,
  type Workflow,
  type WorkflowConnection,
  type WorkflowConnectionConditionMode,
  type WorkflowConnectionRuntimePolicy,
  type WorkflowPort,
} from '../domain/workflow'
import type { ConnectionValidationResult } from '../state/workflowSelectors'
import { validateConnectionDraft } from '../state/workflowSelectors'

function formatPortDisplay(port: WorkflowPort | undefined, fallback: string | undefined): string {
  if (port) {
    return `${port.label}（${formatDataTypeLabel(port.dataType)}）`
  }
  return fallback ? formatDataTypeLabel(fallback) : '未指定'
}

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
  onUpdateConnectionRuntimePolicy: (
    connectionId: string,
    runtimePolicy: WorkflowConnectionRuntimePolicy | undefined,
  ) => void
  onDeleteConnection: (connectionId: string) => void
}

export function ConnectionEditor({
  workflow,
  connectionValidation,
  onCreateConnection,
  onUpdateConnectionRuntimePolicy,
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
                    出力: {formatPortDisplay(
                      connection.sourcePortId && source
                        ? findPort(getOutputPorts(source), connection.sourcePortId)
                        : undefined,
                      connection.sourcePort,
                    )}
                  </span>
                )}
                {(connection.targetPortId ?? connection.targetPort) && (
                  <span className="port-meta">
                    入力: {formatPortDisplay(
                      connection.targetPortId && target
                        ? findPort(getInputPorts(target), connection.targetPortId)
                        : undefined,
                      connection.targetPort,
                    )}
                  </span>
                )}
                <span className={validation?.valid ? 'success-text' : 'error-text'}>
                  {validation?.valid ? '有効' : validation?.reason}
                </span>
                <ConnectionRuntimePolicyEditor
                  connection={connection}
                  nodes={workflow.nodes}
                  onSave={onUpdateConnectionRuntimePolicy}
                />
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

const conditionModeOptions: Array<{ value: WorkflowConnectionConditionMode; label: string }> = [
  { value: 'always', label: '常に通す' },
  { value: 'on_success', label: '成功時' },
  { value: 'on_failure', label: '失敗時' },
  { value: 'on_failed', label: '失敗時(alias)' },
  { value: 'on_review', label: 'レビュー時' },
  { value: 'on_review_required', label: '承認待ち時' },
  { value: 'on_high_cost', label: '高コスト時' },
  { value: 'on_bottleneck', label: '詰まり時' },
  { value: 'on_validation_warning', label: '検証警告時' },
  { value: 'expression', label: '安全な式' },
]

type ConnectionRuntimePolicyEditorProps = {
  connection: WorkflowConnection
  nodes: Workflow['nodes']
  onSave: (connectionId: string, runtimePolicy: WorkflowConnectionRuntimePolicy | undefined) => void
}

function ConnectionRuntimePolicyEditor({
  connection,
  nodes,
  onSave,
}: ConnectionRuntimePolicyEditorProps) {
  const policy = connection.runtimePolicy
  const summary = summarizeConnectionRuntimePolicy(connection)
  const [conditionMode, setConditionMode] = useState<WorkflowConnectionConditionMode>(
    policy?.condition?.mode ?? 'always',
  )
  const [conditionLabel, setConditionLabel] = useState(policy?.condition?.label ?? '')
  const [conditionExpression, setConditionExpression] = useState(policy?.condition?.expression ?? '')
  const [delayMs, setDelayMs] = useState(String(policy?.delayMs ?? 0))
  const [retryEnabled, setRetryEnabled] = useState(policy?.retry?.enabled ?? false)
  const [maxAttempts, setMaxAttempts] = useState(String(policy?.retry?.maxAttempts ?? 2))
  const [backoffMs, setBackoffMs] = useState(String(policy?.retry?.backoffMs ?? 500))
  const [errorRouteEnabled, setErrorRouteEnabled] = useState(policy?.errorRoute?.enabled ?? false)
  const [errorRouteTargetNodeId, setErrorRouteTargetNodeId] = useState(
    policy?.errorRoute?.targetNodeId ?? '',
  )
  const [errorRouteLabel, setErrorRouteLabel] = useState(policy?.errorRoute?.label ?? '')

  function savePolicy() {
    const normalized = normalizeConnectionRuntimePolicy({
      condition: {
        mode: conditionMode,
        label: conditionLabel,
        expression: conditionExpression,
      },
      delayMs: Number(delayMs),
      retry: {
        enabled: retryEnabled,
        maxAttempts: Number(maxAttempts),
        backoffMs: Number(backoffMs),
      },
      errorRoute: {
        enabled: errorRouteEnabled,
        targetNodeId: errorRouteTargetNodeId,
        label: errorRouteLabel,
      },
    })
    onSave(connection.id, normalized)
  }

  function clearPolicy() {
    setConditionMode('always')
    setConditionLabel('')
    setConditionExpression('')
    setDelayMs('0')
    setRetryEnabled(false)
    setMaxAttempts('2')
    setBackoffMs('500')
    setErrorRouteEnabled(false)
    setErrorRouteTargetNodeId('')
    setErrorRouteLabel('')
    onSave(connection.id, undefined)
  }

  return (
    <details className="connection-runtime-policy">
      <summary>
        Runtime policy
        <span>{summary.conditionSummary} / {summary.retrySummary}</span>
      </summary>
      <div className="connection-runtime-policy-grid">
        <label className="field-label">
          条件
          <select value={conditionMode} onChange={(event) => setConditionMode(event.target.value as WorkflowConnectionConditionMode)}>
            {conditionModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          条件ラベル
          <input
            value={conditionLabel}
            onChange={(event) => setConditionLabel(event.target.value)}
            placeholder="例: high-confidence only"
          />
        </label>
        <label className="field-label">
          安全な式
          <input
            value={conditionExpression}
            onChange={(event) => setConditionExpression(event.target.value)}
            placeholder="例: score >= 0.8"
            disabled={conditionMode !== 'expression'}
          />
        </label>
        <label className="field-label">
          Delay ms
          <input
            type="number"
            min="0"
            max="30000"
            value={delayMs}
            onChange={(event) => setDelayMs(event.target.value)}
          />
        </label>
        <label className="field-label checkbox-field">
          <input
            type="checkbox"
            checked={retryEnabled}
            onChange={(event) => setRetryEnabled(event.target.checked)}
          />
          Retry enabled
        </label>
        <label className="field-label">
          Max attempts
          <input
            type="number"
            min="1"
            max="8"
            value={maxAttempts}
            onChange={(event) => setMaxAttempts(event.target.value)}
          />
        </label>
        <label className="field-label">
          Backoff ms
          <input
            type="number"
            min="0"
            max="30000"
            value={backoffMs}
            onChange={(event) => setBackoffMs(event.target.value)}
          />
        </label>
        <label className="field-label checkbox-field">
          <input
            type="checkbox"
            checked={errorRouteEnabled}
            onChange={(event) => setErrorRouteEnabled(event.target.checked)}
          />
          Error route
        </label>
        <label className="field-label">
          Error target
          <select
            value={errorRouteTargetNodeId}
            onChange={(event) => setErrorRouteTargetNodeId(event.target.value)}
            disabled={!errorRouteEnabled}
          >
            <option value="">未指定</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Error label
          <input
            value={errorRouteLabel}
            onChange={(event) => setErrorRouteLabel(event.target.value)}
            placeholder="例: fallback review"
            disabled={!errorRouteEnabled}
          />
        </label>
      </div>
      <div className="connection-runtime-policy-actions">
        <button type="button" className="primary-button inline-action" onClick={savePolicy}>
          Policy 保存
        </button>
        <button type="button" className="icon-button" onClick={clearPolicy}>
          クリア
        </button>
      </div>
      <p className="muted">
        表示と比較には安全な policy summary だけを使います。機密らしい文字列は保存時に除外します。
      </p>
    </details>
  )
}
