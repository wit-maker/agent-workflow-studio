import {
  Background,
  Controls,
  ReactFlow,
  applyNodeChanges,
  useStoreApi,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  type XYPosition,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  connectionKindLabels,
  connectionStatusLabels,
  formatDataTypeLabel,
} from '../domain/displayLabels'
import { findPort, getInputPorts, getOutputPorts } from '../domain/portRules'
import {
  resolveConnectionHandles,
  scaleNodePosition,
  toReactFlowEdges,
  toReactFlowNodes,
  toWorkflowConnectionDraft,
  unscaleNodePosition,
  type ReactFlowWorkflowNode,
} from '../domain/reactFlowAdapter'
import type { ConnectionKind, Workflow } from '../domain/workflow'
import {
  clearReactFlowPositions,
  writeReactFlowPositions,
  type SavedReactFlowPositions,
} from '../storage/localCanvasState'
import {
  explainConnectionAttempt,
  type ConnectionValidationResult,
} from '../state/workflowSelectors'
import { ReactFlowNode } from './ReactFlowNode'

type CreateConnectionResult = {
  ok: boolean
  reason?: string | null
}

type CanvasNotice = {
  tone: 'success' | 'error' | 'info'
  text: string
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
  onDeleteNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
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

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.closest('[contenteditable="true"]') !== null
  )
}

function formatConnectionPortLabel(
  label: string | undefined,
  dataType: string | undefined,
  required?: boolean,
): string {
  if (!label || !dataType) {
    return '未解決'
  }

  return `${label} / ${formatDataTypeLabel(dataType)}${required ? ' / 必須' : ''}`
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
  onDeleteNode,
  onMoveNode,
  onResetPositions,
}: ReactFlowCanvasProps) {
  const invalidConnections = connectionValidation.filter((result) => !result.valid)
  const [nodes, setNodes] = useState<ReactFlowWorkflowNode[]>(() =>
    buildFlowNodes(workflow, {}, selectedNodeId),
  )
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [connectionNotice, setConnectionNotice] = useState<CanvasNotice | null>(null)
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const nodesRef = useRef(nodes)
  const rejectedConnectionReasonRef = useRef<string | null>(null)
  const effectiveSelectedConnectionId =
    workflow.connections.find((connection) => connection.id === selectedConnectionId)?.id ?? null

  useEffect(() => {
    const next = buildFlowNodes(workflow, {}, selectedNodeId)
    nodesRef.current = next
    writeReactFlowPositions(pickWorkflowPositions(next))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(next)
  }, [selectedNodeId, workflow])

  const nodeIds = useMemo(() => workflow.nodes.map((node) => node.id), [workflow.nodes])
  const nodeById = useMemo(
    () => new Map(workflow.nodes.map((node) => [node.id, node])),
    [workflow.nodes],
  )
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
    if (!connectionNotice) return

    const timer = window.setTimeout(() => setConnectionNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [connectionNotice])

  useEffect(() => {
    if (!deleteNotice) return

    const timer = window.setTimeout(() => setDeleteNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [deleteNotice])

  const selectedConnection = useMemo(
    () => workflow.connections.find((connection) => connection.id === effectiveSelectedConnectionId) ?? null,
    [effectiveSelectedConnectionId, workflow.connections],
  )
  const selectedConnectionValidation = useMemo(
    () =>
      selectedConnection
        ? connectionValidation.find((result) => result.connectionId === selectedConnection.id) ?? null
        : null,
    [connectionValidation, selectedConnection],
  )
  const selectedConnectionDetails = useMemo(() => {
    if (!selectedConnection) {
      return null
    }

    const sourceNode = nodeById.get(selectedConnection.sourceNodeId)
    const targetNode = nodeById.get(selectedConnection.targetNodeId)
    const { sourceHandle, targetHandle } = resolveConnectionHandles(workflow, selectedConnection)
    const sourcePort =
      sourceNode && sourceHandle ? findPort(getOutputPorts(sourceNode), sourceHandle) : undefined
    const targetPort =
      targetNode && targetHandle ? findPort(getInputPorts(targetNode), targetHandle) : undefined

    return {
      sourceNodeTitle: sourceNode?.title ?? selectedConnection.sourceNodeId,
      sourcePortLabel: formatConnectionPortLabel(
        sourcePort?.label,
        sourcePort?.dataType ?? selectedConnection.sourcePort,
      ),
      targetNodeTitle: targetNode?.title ?? selectedConnection.targetNodeId,
      targetPortLabel: formatConnectionPortLabel(
        targetPort?.label,
        targetPort?.dataType ?? selectedConnection.targetPort,
        targetPort?.required,
      ),
    }
  }, [nodeById, selectedConnection, workflow])

  const focusCanvasPanel = useCallback(() => {
    panelRef.current?.focus()
  }, [])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const safeChanges = changes.filter((change) => change.type !== 'remove')
    const next = applyNodeChanges<ReactFlowWorkflowNode>(
      safeChanges as NodeChange<ReactFlowWorkflowNode>[],
      nodesRef.current,
    )

    nodesRef.current = next
    setNodes(next)

    if (safeChanges.some((change) => change.type === 'position' && change.position)) {
      writeReactFlowPositions(pickWorkflowPositions(next))
    }
  }, [])

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onMoveNode(node.id, unscaleNodePosition(node.position))
    },
    [onMoveNode],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedConnectionId(edge.id)
      focusCanvasPanel()
    },
    [focusCanvasPanel],
  )

  const isValidConnection = useCallback(
    (connectionOrEdge: Connection | Edge): boolean => {
      const validation = explainConnectionAttempt(workflow, {
        sourceNodeId: connectionOrEdge.source,
        sourcePortId: connectionOrEdge.sourceHandle,
        targetNodeId: connectionOrEdge.target,
        targetPortId: connectionOrEdge.targetHandle,
        kind: 'data',
      })

      rejectedConnectionReasonRef.current = validation.valid ? null : validation.reason
      return validation.valid
    },
    [workflow],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const validation = explainConnectionAttempt(workflow, {
        sourceNodeId: connection.source,
        sourcePortId: connection.sourceHandle,
        targetNodeId: connection.target,
        targetPortId: connection.targetHandle,
        kind: 'data',
      })

      if (!validation.valid) {
        setConnectionNotice({
          tone: 'error',
          text: `接続できません: ${validation.reason ?? '不明な理由です。'}`,
        })
        return
      }

      const draft = toWorkflowConnectionDraft(workflow, connection, 'data')

      if (!draft) {
        setConnectionNotice({
          tone: 'error',
          text: '接続できません: ポート情報を解決できませんでした。',
        })
        return
      }

      const result = onCreateConnection(draft)
      if (result.ok) {
        rejectedConnectionReasonRef.current = null
        setConnectionNotice({ tone: 'success', text: '接続を作成しました。' })
        return
      }

      setConnectionNotice({
        tone: 'error',
        text: `接続できません: ${result.reason ?? '不明な理由です。'}`,
      })
    },
    [onCreateConnection, workflow],
  )

  const handleConnectStart = useCallback(() => {
    rejectedConnectionReasonRef.current = null
    setConnectionNotice(null)
  }, [])

  const handleConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid !== false) {
        return
      }

      setConnectionNotice({
        tone: 'error',
        text: `接続できません: ${
          rejectedConnectionReasonRef.current ?? '条件を満たすポート同士のみ接続できます。'
        }`,
      })
    },
    [],
  )

  const handleDeleteSelectedConnection = useCallback(
    (connectionId: string | null) => {
      if (!connectionId) {
        return
      }

      const connection = workflow.connections.find((item) => item.id === connectionId)
      const sourceTitle = connection
        ? nodeTitleById.get(connection.sourceNodeId) ?? connection.sourceNodeId
        : '接続元'
      const targetTitle = connection
        ? nodeTitleById.get(connection.targetNodeId) ?? connection.targetNodeId
        : '接続先'

      if (!window.confirm(`接続を削除しますか？\n${sourceTitle} → ${targetTitle}`)) {
        return
      }

      onDeleteConnection(connectionId)
      setSelectedConnectionId(null)
      setConnectionNotice({ tone: 'info', text: '接続を削除しました。' })
      focusCanvasPanel()
    },
    [focusCanvasPanel, nodeTitleById, onDeleteConnection, workflow.connections],
  )

  const handlePanelKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return
    }

    if (isEditableElement(event.target)) {
      return
    }

    event.preventDefault()

    if (effectiveSelectedConnectionId) {
      handleDeleteSelectedConnection(effectiveSelectedConnectionId)
      return
    }

    if (selectedNodeId) {
      onDeleteNode(selectedNodeId)
      return
    }

    setDeleteNotice(
      'ノード削除は現在未対応です。部品削除は今後のPhaseで実装します。接続は詳細カードから削除できます。',
    )
  }, [effectiveSelectedConnectionId, handleDeleteSelectedConnection, onDeleteNode, selectedNodeId])

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

  const handleNudgeSelectedNode = useCallback(
    (delta: { x: number; y: number }) => {
      const selectedNode = workflow.nodes.find((node) => node.id === selectedNodeId)
      if (!selectedNode) {
        return
      }

      onMoveNode(selectedNode.id, {
        x: selectedNode.position.x + delta.x,
        y: selectedNode.position.y + delta.y,
      })
    },
    [onMoveNode, selectedNodeId, workflow.nodes],
  )

  return (
    <main
      ref={panelRef}
      className="canvas-panel"
      aria-label="React Flowキャンバス"
      tabIndex={0}
      onKeyDownCapture={handlePanelKeyDown}
    >
      <div className="canvas-toolbar">
        <span>React Flow Canvas</span>
        <button
          type="button"
          className="icon-button"
          onClick={() => reactFlowInstance?.fitView({ padding: 0.12, duration: 250 })}
        >
          全体表示
        </button>
        <button type="button" className="icon-button" onClick={handleResetPositions}>
          位置をリセット
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => handleNudgeSelectedNode({ x: 40, y: 0 })}
          disabled={!selectedNodeId}
        >
          Move right
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => handleNudgeSelectedNode({ x: 0, y: 40 })}
          disabled={!selectedNodeId}
        >
          Move down
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
          onClick={() => handleDeleteSelectedConnection(effectiveSelectedConnectionId)}
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
            onNodeDragStop={handleNodeDragStop}
            onConnectStart={handleConnectStart}
            onConnect={handleConnect}
            onConnectEnd={handleConnectEnd}
            onEdgeClick={handleEdgeClick}
            onNodeClick={(_, node) => {
              onSelectNode(node.id)
              focusCanvasPanel()
            }}
            onPaneClick={() => {
              setSelectedConnectionId(null)
              focusCanvasPanel()
            }}
            isValidConnection={isValidConnection}
            deleteKeyCode={null}
          >
            <NodeMeasurer nodeIds={nodeIds} />
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>

          <section className="react-flow-help-card" aria-label="React Flow操作ヘルプ">
            <h3>操作ヘルプ</h3>
            <p>ドラッグ: ノード移動</p>
            <p>Handle接続: ポート同士を接続</p>
            <p>Edge選択: 接続詳細を表示</p>
            <p>Delete: ノード削除は未対応</p>
            <p>位置リセット: 保存位置を初期化</p>
          </section>

          <section
            className="connection-validation-card react-flow-validation-card"
            aria-label="接続情報"
          >
            <h3>接続情報</h3>
            {connectionNotice ? (
              <p
                className={
                  connectionNotice.tone === 'success'
                    ? 'success-text'
                    : connectionNotice.tone === 'info'
                      ? 'warning-text'
                      : 'error-text'
                }
              >
                {connectionNotice.text}
              </p>
            ) : null}
            {deleteNotice ? <p className="warning-text">{deleteNotice}</p> : null}

            {selectedConnection && selectedConnectionDetails ? (
              <div className="selected-connection-detail">
                <div className="selected-connection-header">
                  <strong>選択中の接続</strong>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => handleDeleteSelectedConnection(selectedConnection.id)}
                  >
                    接続を削除
                  </button>
                </div>
                <div className="selected-connection-grid">
                  <span>接続元ノード</span>
                  <strong>{selectedConnectionDetails.sourceNodeTitle}</strong>
                  <span>接続元ポート</span>
                  <strong>{selectedConnectionDetails.sourcePortLabel}</strong>
                  <span>接続先ノード</span>
                  <strong>{selectedConnectionDetails.targetNodeTitle}</strong>
                  <span>接続先ポート</span>
                  <strong>{selectedConnectionDetails.targetPortLabel}</strong>
                  <span>carries</span>
                  <strong>
                    {selectedConnection.carries.map((item) => formatDataTypeLabel(item)).join(', ')}
                  </strong>
                  <span>kind</span>
                  <strong>{connectionKindLabels[selectedConnection.kind]}</strong>
                  <span>status</span>
                  <strong>{connectionStatusLabels[selectedConnection.status]}</strong>
                  <span>validation result</span>
                  <strong
                    className={selectedConnectionValidation?.valid ? 'success-text' : 'error-text'}
                  >
                    {selectedConnectionValidation?.valid
                      ? '有効'
                      : selectedConnectionValidation?.reason ?? '未確認'}
                  </strong>
                </div>
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
