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
  type Viewport,
  type XYPosition,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildZoomHudView, type WorkflowGroupView, type ZoomHudView } from '../domain/cognitiveHud'
import {
  scaleNodePosition,
  toReactFlowEdges,
  toReactFlowNodes,
  toWorkflowConnectionDraft,
  unscaleNodePosition,
  type ReactFlowWorkflowNode,
} from '../domain/reactFlowAdapter'
import type { ConnectionKind, Workflow } from '../domain/workflow'
import {
  writeReactFlowPositions,
  type SavedReactFlowPositions,
} from '../storage/localCanvasState'
import {
  explainConnectionAttempt,
  type ConnectionValidationResult,
} from '../state/workflowSelectors'
import { ReactFlowNode } from './ReactFlowNode'
import { CanvasMiniMapHud } from './workspace/CanvasMiniMapHud'
import { WorkflowGroupLayer } from './workspace/WorkflowGroupLayer'

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
  selectedConnectionId: string | null
  connectionValidation: ConnectionValidationResult[]
  onSelectNode: (nodeId: string) => void
  onSelectConnectionId: (connectionId: string | null) => void
  miniMapVisible: boolean
  workflowGroups: WorkflowGroupView[]
  onZoomHudChange: (view: ZoomHudView) => void
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
  selectedConnectionId,
  connectionValidation,
  onSelectNode,
  onSelectConnectionId,
  miniMapVisible,
  workflowGroups,
  onZoomHudChange,
  onCreateConnection,
  onDeleteConnection,
  onDeleteNode,
  onMoveNode,
}: ReactFlowCanvasProps) {
  const invalidConnections = connectionValidation.filter((result) => !result.valid)
  const [nodes, setNodes] = useState<ReactFlowWorkflowNode[]>(() =>
    buildFlowNodes(workflow, {}, selectedNodeId),
  )
  const [connectionNotice, setConnectionNotice] = useState<CanvasNotice | null>(null)
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const nodesRef = useRef(nodes)
  const rejectedConnectionReasonRef = useRef<string | null>(null)
  const effectiveSelectedConnectionId =
    workflow.connections.find((connection) => connection.id === selectedConnectionId)?.id ?? null

  useEffect(() => {
    const next = buildFlowNodes(workflow, {}, selectedNodeId)
    nodesRef.current = next
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(next)
  }, [selectedNodeId, workflow])

  useEffect(() => {
    if (selectedConnectionId && !effectiveSelectedConnectionId) {
      onSelectConnectionId(null)
    }
  }, [effectiveSelectedConnectionId, onSelectConnectionId, selectedConnectionId])

  const nodeIds = useMemo(() => workflow.nodes.map((node) => node.id), [workflow.nodes])
  const nodeTitleById = useMemo(
    () => new Map(workflow.nodes.map((node) => [node.id, node.title])),
    [workflow.nodes],
  )
  const edges = useMemo(
    () => toReactFlowEdges(workflow, effectiveSelectedConnectionId ?? undefined),
    [effectiveSelectedConnectionId, workflow],
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
      onSelectConnectionId(edge.id)
      focusCanvasPanel()
    },
    [focusCanvasPanel, onSelectConnectionId],
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
      onSelectConnectionId(null)
      setConnectionNotice({ tone: 'info', text: '接続を削除しました。' })
      focusCanvasPanel()
    },
    [focusCanvasPanel, nodeTitleById, onDeleteConnection, onSelectConnectionId, workflow.connections],
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

  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      onZoomHudChange(buildZoomHudView(viewport.zoom))
    },
    [onZoomHudChange],
  )

  return (
    <main
      ref={panelRef}
      className="canvas-panel react-flow-canvas-panel"
      aria-label="React Flowキャンバス"
      tabIndex={0}
      onKeyDownCapture={handlePanelKeyDown}
    >
      <div className="canvas-scroll react-flow-canvas-body">
        <div className="react-flow-canvas-root">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            colorMode="dark"
            fitView
            minZoom={0.05}
            maxZoom={3.5}
            onInit={(instance) => {
              onZoomHudChange(buildZoomHudView(instance.getZoom()))
            }}
            onNodesChange={handleNodesChange}
            onNodeDragStop={handleNodeDragStop}
            onConnectStart={handleConnectStart}
            onConnect={handleConnect}
            onConnectEnd={handleConnectEnd}
            onViewportChange={handleViewportChange}
            onEdgeClick={handleEdgeClick}
            onNodeClick={(_, node) => {
              onSelectConnectionId(null)
              onSelectNode(node.id)
              focusCanvasPanel()
            }}
            onPaneClick={() => {
              onSelectConnectionId(null)
              focusCanvasPanel()
            }}
            isValidConnection={isValidConnection}
            deleteKeyCode={null}
          >
            <WorkflowGroupLayer workflow={workflow} groups={workflowGroups} />
            <NodeMeasurer nodeIds={nodeIds} />
            <Background color="rgba(125, 211, 252, 0.18)" gap={24} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
            {miniMapVisible ? <CanvasMiniMapHud /> : null}
          </ReactFlow>

          <section className="canvas-status-hud" aria-label="接続状態HUD">
            <strong className={invalidConnections.length === 0 ? 'valid-count' : 'invalid-count'}>
              {invalidConnections.length === 0
                ? `edges ${connectionValidation.length} ok`
                : `edges ${invalidConnections.length} invalid`}
            </strong>
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
          </section>
        </div>
      </div>
    </main>
  )
}
