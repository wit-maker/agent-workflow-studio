import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
  type XYPosition,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { connectionKindLabels, formatDataTypeLabel } from '../domain/displayLabels'
import type { ConnectionKind, Workflow } from '../domain/workflow'
import {
  toReactFlowEdges,
  toReactFlowNodes,
  toWorkflowConnectionDraft,
} from '../domain/reactFlowAdapter'
import {
  type ConnectionValidationResult,
  validateConnectionDraft,
} from '../state/workflowSelectors'
import { ReactFlowNode } from './ReactFlowNode'

type CreateConnectionResult = {
  ok: boolean
  reason?: string | null
}

type ReactFlowCanvasProps = {
  workflow: Workflow
  selectedNodeId: string
  connectionValidation: ConnectionValidationResult[]
  onSelectNode: (nodeId: string) => void
  onCreateConnection: (draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) => CreateConnectionResult
  onDeleteConnection: (connectionId: string) => void
}

const nodeTypes = {
  workflowNode: ReactFlowNode,
}

export function ReactFlowCanvas({
  workflow,
  selectedNodeId,
  connectionValidation,
  onSelectNode,
  onCreateConnection,
  onDeleteConnection,
}: ReactFlowCanvasProps) {
  const invalidConnections = connectionValidation.filter((result) => !result.valid)
  const [positions, setPositions] = useState<Record<string, XYPosition>>({})
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [connectMessage, setConnectMessage] = useState<CreateConnectionResult | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const previousWorkflowPositionsRef = useRef<Record<string, XYPosition>>({})
  const effectiveSelectedConnectionId =
    workflow.connections.find((connection) => connection.id === selectedConnectionId)?.id ?? null

  useEffect(() => {
    setPositions((current) => {
      const next: Record<string, XYPosition> = {}

      for (const node of workflow.nodes) {
        const previousWorkflowPosition = previousWorkflowPositionsRef.current[node.id]
        const incomingPosition = node.position
        const cachedPosition = current[node.id]
        const workflowPositionChanged =
          !previousWorkflowPosition ||
          previousWorkflowPosition.x !== incomingPosition.x ||
          previousWorkflowPosition.y !== incomingPosition.y

        next[node.id] = workflowPositionChanged
          ? incomingPosition
          : cachedPosition ?? incomingPosition
      }

      previousWorkflowPositionsRef.current = Object.fromEntries(
        workflow.nodes.map((node) => [node.id, node.position]),
      )

      return next
    })
  }, [workflow.nodes])

  const nodes = useMemo(
    () =>
      toReactFlowNodes(workflow, positions).map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    [positions, selectedNodeId, workflow],
  )
  const edges = useMemo(
    () => toReactFlowEdges(workflow, effectiveSelectedConnectionId ?? undefined),
    [effectiveSelectedConnectionId, workflow],
  )
  const connectionOptions = useMemo(
    () =>
      workflow.connections.map((connection) => {
        const sourceTitle =
          workflow.nodes.find((node) => node.id === connection.sourceNodeId)?.title ??
          connection.sourceNodeId
        const targetTitle =
          workflow.nodes.find((node) => node.id === connection.targetNodeId)?.title ??
          connection.targetNodeId

        return {
          id: connection.id,
          label: `${sourceTitle} → ${targetTitle} (${connection.carries
            .map((dataType) => formatDataTypeLabel(dataType))
            .join(', ')})`,
        }
      }),
    [workflow.connections, workflow.nodes],
  )

  useEffect(() => {
    if (!connectMessage) return
    const timer = window.setTimeout(() => setConnectMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [connectMessage])

  const selectedConnection = useMemo(
    () => workflow.connections.find((c) => c.id === effectiveSelectedConnectionId) ?? null,
    [effectiveSelectedConnectionId, workflow.connections],
  )

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setPositions((current) => {
      const hasPositionChange = changes.some((c) => c.type === 'position' && c.position)
      if (!hasPositionChange) return current

      const next = { ...current }
      for (const change of changes) {
        if (change.type === 'position' && change.id && change.position) {
          next[change.id] = change.position
        }
      }
      return next
    })
  }, [])

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedConnectionId(edge.id)
  }, [])

  const isValidConnection = useCallback(
    (connectionOrEdge: Connection | Edge): boolean => {
      const { source, target, sourceHandle, targetHandle } = connectionOrEdge
      if (!source || !target || !sourceHandle || !targetHandle) return false
      if (source === target) return false
      const draft = toWorkflowConnectionDraft(
        workflow,
        { source, target, sourceHandle, targetHandle },
        'data',
      )
      if (!draft) return false
      return validateConnectionDraft(workflow, draft).valid
    },
    [workflow],
  )

  const handleConnect = useCallback((connection: Connection) => {
    const draft = toWorkflowConnectionDraft(workflow, connection, 'data')

    if (!draft) {
      setConnectMessage({ ok: false, reason: 'ポート情報を解決できませんでした。' })
      return
    }

    const result = onCreateConnection(draft)
    setConnectMessage(result)
  }, [onCreateConnection, workflow])

  return (
    <main className="canvas-panel" aria-label="React Flowキャンバス">
      <div className="canvas-toolbar">
        <span>React Flow Canvas</span>
        <button
          type="button"
          className="icon-button"
          onClick={() => reactFlowInstance?.fitView({ padding: 0.12, duration: 250 })}
        >
          全体表示
        </button>
        <select
          className="canvas-toolbar-select"
          aria-label="接続選択"
          value={effectiveSelectedConnectionId ?? ''}
          onChange={(event) => setSelectedConnectionId(event.target.value || null)}
        >
          <option value="">接続を選択</option>
          {connectionOptions.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-button"
          onClick={() => {
            if (effectiveSelectedConnectionId) {
              onDeleteConnection(effectiveSelectedConnectionId)
            }
          }}
          disabled={!effectiveSelectedConnectionId}
        >
          選択中の接続を削除
        </button>
        <strong className={invalidConnections.length === 0 ? 'valid-count' : 'invalid-count'}>
          {invalidConnections.length === 0
            ? `有効な接続 ${connectionValidation.length} 件`
            : `無効な接続 ${invalidConnections.length} 件`}
        </strong>
      </div>
      <div className="canvas-scroll react-flow-canvas-body">
        <div className="react-flow-canvas-root">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            onInit={setReactFlowInstance}
            onConnect={handleConnect}
            onNodesChange={handleNodesChange}
            onEdgeClick={handleEdgeClick}
            onNodeClick={(_, node) => onSelectNode(node.id)}
            onPaneClick={() => setSelectedConnectionId(null)}
            isValidConnection={isValidConnection}
          >
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
          <section
            className="connection-validation-card react-flow-validation-card"
            aria-label="接続検証"
          >
            <h3>接続検証</h3>
            {connectMessage ? (
              <p className={connectMessage.ok ? 'success-text' : 'error-text'}>
                {connectMessage.ok ? '接続を作成しました。' : connectMessage.reason}
              </p>
            ) : null}
            {selectedConnection ? (
              <div className="selected-connection-detail">
                <strong>選択中の接続</strong>
                <span>
                  {workflow.nodes.find((n) => n.id === selectedConnection.sourceNodeId)?.title ?? selectedConnection.sourceNodeId}
                  {' → '}
                  {workflow.nodes.find((n) => n.id === selectedConnection.targetNodeId)?.title ?? selectedConnection.targetNodeId}
                </span>
                <span>
                  {connectionKindLabels[selectedConnection.kind]}
                  {' / '}
                  {selectedConnection.carries.map((t) => formatDataTypeLabel(t)).join(', ')}
                </span>
              </div>
            ) : null}
            {connectionValidation.slice(0, 4).map((result) => (
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
