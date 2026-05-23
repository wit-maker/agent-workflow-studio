import {
  Background,
  Controls,
  ReactFlow,
  applyNodeChanges,
  useStoreApi,
  type Connection,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
  type XYPosition,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { connectionKindLabels, formatDataTypeLabel } from '../domain/displayLabels'
import {
  scaleNodePosition,
  toReactFlowEdges,
  toReactFlowNodes,
  toWorkflowConnectionDraft,
  type ReactFlowWorkflowNode,
} from '../domain/reactFlowAdapter'
import type { ConnectionKind, Workflow } from '../domain/workflow'
import {
  clearReactFlowPositions,
  readReactFlowPositions,
  writeReactFlowPositions,
  type SavedReactFlowPositions,
} from '../storage/localCanvasState'
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
  onResetPositions?: () => void
}

const nodeTypes = {
  workflowNode: ReactFlowNode,
}

type NodePositionMap = Record<string, XYPosition>

const escapeCssSelectorValue = (value: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&')

function buildNodePositions(
  workflow: Workflow,
  savedPositions: SavedReactFlowPositions,
): NodePositionMap {
  return Object.fromEntries(
    workflow.nodes.map((node) => [
      node.id,
      savedPositions[node.id] ?? scaleNodePosition(node.position),
    ]),
  )
}

function buildFlowNodes(
  workflow: Workflow,
  savedPositions: SavedReactFlowPositions,
  selectedNodeId: string,
): ReactFlowWorkflowNode[] {
  return toReactFlowNodes(workflow, buildNodePositions(workflow, savedPositions)).map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
  }))
}

function pickWorkflowPositions(nodes: ReactFlowWorkflowNode[]): SavedReactFlowPositions {
  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        x: node.position.x,
        y: node.position.y,
      },
    ]),
  )
}

function NodeMeasurer({ nodeIds }: { nodeIds: string[] }) {
  const store = useStoreApi()

  useEffect(() => {
    if (nodeIds.length === 0) return

    const { domNode, updateNodeInternals } = store.getState()
    if (!domNode) return

    const updates = new Map(
      nodeIds.flatMap((id) => {
        const escapedId = escapeCssSelectorValue(id)
        const el = domNode.querySelector(`.react-flow__node[data-id="${escapedId}"]`)
        return el ? [[id, { id, nodeElement: el as HTMLDivElement, force: true }]] : []
      }),
    )

    if (updates.size > 0) {
      updateNodeInternals(updates)
    }
  }, [nodeIds, store])

  return null
}

export function ReactFlowCanvas({
  workflow,
  selectedNodeId,
  connectionValidation,
  onSelectNode,
  onCreateConnection,
  onDeleteConnection,
  onResetPositions,
}: ReactFlowCanvasProps) {
  const invalidConnections = connectionValidation.filter((result) => !result.valid)
  const [nodes, setNodes] = useState<ReactFlowWorkflowNode[]>(() =>
    buildFlowNodes(workflow, readReactFlowPositions(), selectedNodeId),
  )
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [connectMessage, setConnectMessage] = useState<CreateConnectionResult | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const nodesRef = useRef(nodes)
  const effectiveSelectedConnectionId =
    workflow.connections.find((connection) => connection.id === selectedConnectionId)?.id ?? null

  useEffect(() => {
    const next = buildFlowNodes(workflow, readReactFlowPositions(), selectedNodeId)
    nodesRef.current = next
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(next)
  }, [selectedNodeId, workflow])

  const nodeIds = useMemo(() => workflow.nodes.map((node) => node.id), [workflow.nodes])
  const nodeTitleById = useMemo(
    () => new Map(workflow.nodes.map((node) => [node.id, node.title])),
    [workflow.nodes],
  )
  const edges = useMemo(
    () => toReactFlowEdges(workflow, effectiveSelectedConnectionId ?? undefined),
    [effectiveSelectedConnectionId, workflow],
  )
  const connectionOptions = useMemo(
    () =>
      workflow.connections.map((connection) => {
        const sourceTitle = nodeTitleById.get(connection.sourceNodeId) ?? connection.sourceNodeId
        const targetTitle = nodeTitleById.get(connection.targetNodeId) ?? connection.targetNodeId

        return {
          id: connection.id,
          label: `${sourceTitle} → ${targetTitle} (${connection.carries
            .map((dataType) => formatDataTypeLabel(dataType))
            .join(', ')})`,
        }
      }),
    [nodeTitleById, workflow.connections],
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
    setNodes((current) => {
      const next = applyNodeChanges<ReactFlowWorkflowNode>(
        changes as NodeChange<ReactFlowWorkflowNode>[],
        current,
      )
      nodesRef.current = next

      if (changes.some((change) => change.type === 'position' && change.position)) {
        writeReactFlowPositions(pickWorkflowPositions(next))
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

  const handleConnect = useCallback(
    (connection: Connection) => {
      const draft = toWorkflowConnectionDraft(workflow, connection, 'data')

      if (!draft) {
        setConnectMessage({ ok: false, reason: 'ポート情報を解決できませんでした。' })
        return
      }

      const result = onCreateConnection(draft)
      setConnectMessage(result)
    },
    [onCreateConnection, workflow],
  )

  const handleResetPositions = useCallback(() => {
    clearReactFlowPositions()

    const next = buildFlowNodes(workflow, {}, selectedNodeId)
    nodesRef.current = next
    setNodes(next)
    setSelectedConnectionId(null)
    onResetPositions?.()

    window.requestAnimationFrame(() => {
      reactFlowInstance?.fitView({ padding: 0.12, duration: 250 })
    })
  }, [onResetPositions, reactFlowInstance, selectedNodeId, workflow])

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
        <button
          type="button"
          className="icon-button"
          onClick={handleResetPositions}
        >
          位置をリセット
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
            onNodesChange={handleNodesChange}
            onConnect={handleConnect}
            onEdgeClick={handleEdgeClick}
            onNodeClick={(_, node) => onSelectNode(node.id)}
            onPaneClick={() => setSelectedConnectionId(null)}
            isValidConnection={isValidConnection}
          >
            <NodeMeasurer nodeIds={nodeIds} />
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
                  {nodeTitleById.get(selectedConnection.sourceNodeId) ??
                    selectedConnection.sourceNodeId}
                  {' → '}
                  {nodeTitleById.get(selectedConnection.targetNodeId) ??
                    selectedConnection.targetNodeId}
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
