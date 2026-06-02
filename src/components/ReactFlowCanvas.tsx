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
  type Viewport,
  type XYPosition,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildZoomHudView,
  type CanvasHudAnchor,
  type CanvasHudCollisionState,
  type CanvasHudPlacement,
  type CanvasHudSize,
  type EdgeRuntimeSemantics,
  type HudPriority,
  type SemanticFocusPathView,
  type WorkflowGroupView,
  type ZoomHudView,
} from '../domain/cognitiveHud'
import {
  scaleNodePosition,
  toReactFlowEdges,
  toReactFlowNodes,
  toWorkflowConnectionDraft,
  unscaleNodePosition,
  type ReactFlowFocusRole,
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
  semanticFocusPath: SemanticFocusPathView | null
  edgeRuntimeByConnectionId: ReadonlyMap<string, EdgeRuntimeSemantics>
  hudCollisionState: CanvasHudCollisionState
  onZoomHudChange: (view: ZoomHudView) => void
  onHudAnchorChange: (anchors: {
    node: CanvasHudAnchor | null
    edge: CanvasHudAnchor | null
  }) => void
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
type FocusPathState = {
  nodeRoles: Map<string, ReactFlowFocusRole>
  focusedConnectionIds: Set<string>
  dimUnfocused: boolean
  source: 'selection' | 'semantic' | 'none'
  priority: HudPriority
}
type HudRect = {
  x: number
  y: number
  width: number
  height: number
}
type ReservedHudRect = HudRect & {
  id: string
}
type HudPlacementCandidate = {
  placement: CanvasHudPlacement
  point: XYPosition
}
type PanelSize = {
  left: number
  top: number
  width: number
  height: number
}

const NODE_CARD_WIDTH = 260
const NODE_CARD_HEIGHT = 190
const FALLBACK_NODE_HUD_SIZE: CanvasHudSize = { width: 430, height: 440 }
const FALLBACK_EDGE_HUD_SIZE: CanvasHudSize = { width: 390, height: 360 }
const HUD_MARGIN = 18
const HUD_COLLISION_GAP = 12
const HUD_TOP_SAFE_ZONE = 96
const DRAWER_TOP = 72
const DRAWER_BOTTOM = 64
const PALETTE_DRAWER_WIDTH = 390
const DETAIL_DRAWER_WIDTH = 460
const CONSOLE_COLLAPSED_HEIGHT = 56
const CONSOLE_COLLAPSED_WIDTH = 440
const CONSOLE_EXPANDED_MAX_HEIGHT = 440
const CONSOLE_EXPANDED_HEIGHT_RATIO = 0.44
const MINI_MAP_WIDTH = 220
const MINI_MAP_HEIGHT = 138
const MINI_MAP_RIGHT = 18
const MINI_MAP_BOTTOM = 72
const NOTIFICATION_BUNDLE_WIDTH = 390
const NOTIFICATION_BUNDLE_HEIGHT = 360
const NOTIFICATION_BUNDLE_TOP = 66
const CANVAS_CONTROLS_WIDTH = 42
const CANVAS_CONTROLS_HEIGHT = 96

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
  focusPath: FocusPathState,
): ReactFlowWorkflowNode[] {
  return toReactFlowNodes(workflow, buildNodePositions(workflow, savedPositions)).map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
    className: `focus-node-${focusPath.nodeRoles.get(node.id) ?? 'normal'}`,
    data: {
      ...node.data,
      focusRole: focusPath.nodeRoles.get(node.id) ?? 'normal',
    },
  }))
}

function buildFocusPathState(
  workflow: Workflow,
  selectedNodeId: string,
  selectedConnectionId: string | null,
  semanticFocusPath: SemanticFocusPathView | null,
): FocusPathState {
  const nodeRoles = new Map<string, ReactFlowFocusRole>()
  const focusedConnectionIds = new Set<string>()
  const nodeIds = new Set(workflow.nodes.map((node) => node.id))
  const selectedConnection = selectedConnectionId
    ? workflow.connections.find((connection) => connection.id === selectedConnectionId)
    : undefined

  if (selectedConnection) {
    nodeRoles.set(selectedConnection.sourceNodeId, 'path')
    nodeRoles.set(selectedConnection.targetNodeId, 'path')
    focusedConnectionIds.add(selectedConnection.id)

    for (const node of workflow.nodes) {
      if (!nodeRoles.has(node.id)) {
        nodeRoles.set(node.id, 'dimmed')
      }
    }

    return {
      nodeRoles,
      focusedConnectionIds,
      dimUnfocused: true,
      source: 'selection',
      priority: 'watch',
    }
  }

  if (semanticFocusPath?.dimUnfocused && semanticFocusPath.nodeIds.length > 0) {
    const primaryNodeIds = new Set(
      semanticFocusPath.primaryNodeId ? [semanticFocusPath.primaryNodeId] : [],
    )
    for (const nodeId of semanticFocusPath.nodeIds) {
      if (nodeIds.has(nodeId)) {
        nodeRoles.set(nodeId, primaryNodeIds.has(nodeId) ? 'attention' : 'path')
      }
    }
    for (const connectionId of semanticFocusPath.connectionIds) {
      focusedConnectionIds.add(connectionId)
    }
    for (const node of workflow.nodes) {
      if (!nodeRoles.has(node.id)) {
        nodeRoles.set(node.id, 'dimmed')
      }
    }
    return {
      nodeRoles,
      focusedConnectionIds,
      dimUnfocused: true,
      source: 'semantic',
      priority: semanticFocusPath.priority,
    }
  }

  if (selectedNodeId && nodeIds.has(selectedNodeId)) {
    nodeRoles.set(selectedNodeId, 'selected')

    for (const connection of workflow.connections) {
      const touchesSelection =
        connection.sourceNodeId === selectedNodeId || connection.targetNodeId === selectedNodeId

      if (!touchesSelection) {
        continue
      }

      focusedConnectionIds.add(connection.id)
      const adjacentNodeId =
        connection.sourceNodeId === selectedNodeId
          ? connection.targetNodeId
          : connection.sourceNodeId

      if (!nodeRoles.has(adjacentNodeId)) {
        nodeRoles.set(adjacentNodeId, 'path')
      }
    }

    for (const node of workflow.nodes) {
      if (!nodeRoles.has(node.id)) {
        nodeRoles.set(node.id, 'dimmed')
      }
    }

    return {
      nodeRoles,
      focusedConnectionIds,
      dimUnfocused: true,
      source: 'selection',
      priority: 'watch',
    }
  }

  for (const node of workflow.nodes) {
    nodeRoles.set(node.id, 'normal')
  }

  return {
    nodeRoles,
    focusedConnectionIds,
    dimUnfocused: false,
    source: 'none',
    priority: 'normal',
  }
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

function resolveHudSize(
  measuredSize: CanvasHudSize | null,
  fallbackSize: CanvasHudSize,
  panelSize: PanelSize,
): CanvasHudSize {
  const candidate = measuredSize ?? fallbackSize
  return {
    width: Math.max(260, Math.min(candidate.width, panelSize.width - HUD_MARGIN * 2)),
    height: Math.max(180, Math.min(candidate.height, panelSize.height - HUD_TOP_SAFE_ZONE - HUD_MARGIN)),
  }
}

function toPanelSize(rect: DOMRect): PanelSize {
  const viewportWidth = typeof window === 'undefined' ? rect.width : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? rect.height : window.innerHeight
  const left = Math.max(0, -rect.left)
  const top = Math.max(0, -rect.top)

  return {
    left,
    top,
    width: Math.min(Math.max(0, rect.width - left), viewportWidth),
    height: Math.min(Math.max(0, rect.height - top), viewportHeight),
  }
}

function buildReservedHudRects(
  panelSize: PanelSize,
  hudCollisionState: CanvasHudCollisionState,
): ReservedHudRect[] {
  const drawerHeight = Math.max(0, panelSize.height - DRAWER_TOP - DRAWER_BOTTOM)
  const drawerMaxWidth = Math.max(0, panelSize.width - HUD_MARGIN * 2)
  const paletteWidth = Math.min(PALETTE_DRAWER_WIDTH, drawerMaxWidth)
  const detailWidth = Math.min(DETAIL_DRAWER_WIDTH, drawerMaxWidth)
  const consoleWidth = hudCollisionState.consoleOpen
    ? Math.max(0, panelSize.width - 28)
    : Math.min(CONSOLE_COLLAPSED_WIDTH, Math.max(0, panelSize.width - 28))
  const consoleHeight = hudCollisionState.consoleOpen
    ? Math.min(CONSOLE_EXPANDED_MAX_HEIGHT, panelSize.height * CONSOLE_EXPANDED_HEIGHT_RATIO)
    : CONSOLE_COLLAPSED_HEIGHT
  const controlsX = panelSize.left + Math.min(
    Math.max(0, panelSize.width - CANVAS_CONTROLS_WIDTH - HUD_MARGIN),
    Math.min(480, panelSize.width * 0.42),
  )
  const rects: ReservedHudRect[] = [
    {
      id: 'command-hud',
      x: panelSize.left,
      y: panelSize.top,
      width: panelSize.width,
      height: HUD_TOP_SAFE_ZONE,
    },
    {
      id: 'canvas-controls',
      x: controlsX,
      y: panelSize.top + Math.max(HUD_TOP_SAFE_ZONE, panelSize.height - MINI_MAP_BOTTOM - CANVAS_CONTROLS_HEIGHT),
      width: CANVAS_CONTROLS_WIDTH,
      height: CANVAS_CONTROLS_HEIGHT,
    },
    {
      id: hudCollisionState.consoleOpen ? 'console-expanded' : 'console-collapsed',
      x: hudCollisionState.consoleOpen
        ? panelSize.left + 14
        : panelSize.left + Math.max(14, panelSize.width - 14 - consoleWidth),
      y: panelSize.top + Math.max(HUD_TOP_SAFE_ZONE, panelSize.height - 12 - consoleHeight),
      width: consoleWidth,
      height: consoleHeight,
    },
  ]

  if (hudCollisionState.paletteOpen) {
    rects.push({
      id: 'palette-drawer',
      x: panelSize.left + 14,
      y: panelSize.top + DRAWER_TOP,
      width: paletteWidth,
      height: drawerHeight,
    })
  }

  if (hudCollisionState.detailOpen) {
    rects.push({
      id: 'detail-drawer',
      x: panelSize.left + Math.max(14, panelSize.width - 14 - detailWidth),
      y: panelSize.top + DRAWER_TOP,
      width: detailWidth,
      height: drawerHeight,
    })
  }

  if (hudCollisionState.miniMapVisible) {
    rects.push({
      id: 'minimap',
      x: panelSize.left + Math.max(14, panelSize.width - MINI_MAP_RIGHT - MINI_MAP_WIDTH),
      y: panelSize.top + Math.max(HUD_TOP_SAFE_ZONE, panelSize.height - MINI_MAP_BOTTOM - MINI_MAP_HEIGHT),
      width: MINI_MAP_WIDTH,
      height: MINI_MAP_HEIGHT,
    })
  }

  if (hudCollisionState.notificationOpen) {
    rects.push({
      id: 'notification-bundle',
      x: panelSize.left + 14,
      y: panelSize.top + NOTIFICATION_BUNDLE_TOP,
      width: Math.min(NOTIFICATION_BUNDLE_WIDTH, Math.max(0, panelSize.width - 28)),
      height: Math.min(NOTIFICATION_BUNDLE_HEIGHT, Math.max(0, panelSize.height - NOTIFICATION_BUNDLE_TOP - 18)),
    })
  }

  return rects
}

function reservedRectFromElement(
  panelRect: DOMRect,
  id: string,
  element: Element | null | undefined,
): ReservedHudRect | null {
  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  return {
    id,
    x: Math.round(rect.left - panelRect.left),
    y: Math.round(rect.top - panelRect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function mergeReservedRects(
  fallbackRects: ReservedHudRect[],
  measuredRects: Array<ReservedHudRect | null>,
): ReservedHudRect[] {
  const byId = new Map(fallbackRects.map((rect) => [rect.id, rect]))

  for (const rect of measuredRects) {
    if (rect) {
      byId.set(rect.id, rect)
    }
  }

  return [...byId.values()]
}

function resolveTopSafeY(panelSize: PanelSize, reservedRects: ReservedHudRect[]): number {
  const commandRect = reservedRects.find((rect) => rect.id === 'command-hud')
  return Math.max(
    panelSize.top + HUD_TOP_SAFE_ZONE,
    commandRect ? commandRect.y + commandRect.height + HUD_COLLISION_GAP : 0,
  )
}

function clampHudPoint(
  point: XYPosition,
  size: CanvasHudSize,
  panelSize: PanelSize,
  topSafeY: number,
): XYPosition {
  const minX = panelSize.left + HUD_MARGIN
  const minY = topSafeY
  const maxX = Math.max(minX, panelSize.left + panelSize.width - size.width - HUD_MARGIN)
  const maxY = Math.max(minY, panelSize.top + panelSize.height - size.height - HUD_MARGIN)

  return {
    x: Math.round(Math.min(Math.max(point.x, minX), maxX)),
    y: Math.round(Math.min(Math.max(point.y, minY), maxY)),
  }
}

function rectFromPoint(point: XYPosition, size: CanvasHudSize): HudRect {
  return {
    x: point.x,
    y: point.y,
    width: size.width,
    height: size.height,
  }
}

function inflateRect(rect: HudRect, gap: number): HudRect {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2,
  }
}

function overlapArea(a: HudRect, b: HudRect): number {
  const overlapWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const overlapHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return overlapWidth * overlapHeight
}

function resolveHudAnchorFromCandidates(
  candidates: HudPlacementCandidate[],
  size: CanvasHudSize,
  panelSize: PanelSize,
  reservedRects: ReservedHudRect[],
  source: CanvasHudAnchor['source'],
  topSafeY: number,
): CanvasHudAnchor | null {
  if (candidates.length === 0) {
    return null
  }

  const scored = candidates.map((candidate, index) => {
    const point = clampHudPoint(candidate.point, size, panelSize, topSafeY)
    const rect = rectFromPoint(point, size)
    const collisionIds = reservedRects
      .filter((reservedRect) => overlapArea(rect, inflateRect(reservedRect, HUD_COLLISION_GAP)) > 0)
      .map((reservedRect) => reservedRect.id)
    const totalOverlap = reservedRects.reduce(
      (sum, reservedRect) => sum + overlapArea(rect, inflateRect(reservedRect, HUD_COLLISION_GAP)),
      0,
    )
    const clampDistance = Math.hypot(point.x - candidate.point.x, point.y - candidate.point.y)

    return {
      point,
      placement: candidate.placement,
      collisionIds,
      score: totalOverlap * 1000 + collisionIds.length * 100000 + clampDistance + index * 10,
    }
  })

  scored.sort((a, b) => a.score - b.score)
  const best = scored[0]
  return {
    x: best.point.x,
    y: best.point.y,
    source,
    placement: best.placement,
    collisionIds: best.collisionIds,
  }
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
  semanticFocusPath,
  edgeRuntimeByConnectionId,
  hudCollisionState,
  onZoomHudChange,
  onHudAnchorChange,
  onCreateConnection,
  onDeleteConnection,
  onDeleteNode,
  onMoveNode,
}: ReactFlowCanvasProps) {
  const invalidConnections = connectionValidation.filter((result) => !result.valid)
  const initialFocusPath = buildFocusPathState(
    workflow,
    selectedNodeId,
    selectedConnectionId,
    semanticFocusPath,
  )
  const [nodes, setNodes] = useState<ReactFlowWorkflowNode[]>(() =>
    buildFlowNodes(workflow, {}, selectedNodeId, initialFocusPath),
  )
  const [connectionNotice, setConnectionNotice] = useState<CanvasNotice | null>(null)
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const flowInstanceRef = useRef<ReactFlowInstance<ReactFlowWorkflowNode, Edge> | null>(null)
  const nodesRef = useRef(nodes)
  const rejectedConnectionReasonRef = useRef<string | null>(null)
  const effectiveSelectedConnectionId =
    workflow.connections.find((connection) => connection.id === selectedConnectionId)?.id ?? null
  const focusPath = useMemo(
    () =>
      buildFocusPathState(
        workflow,
        selectedNodeId,
        effectiveSelectedConnectionId,
        semanticFocusPath,
      ),
    [effectiveSelectedConnectionId, selectedNodeId, semanticFocusPath, workflow],
  )

  useEffect(() => {
    const next = buildFlowNodes(workflow, {}, selectedNodeId, focusPath)
    nodesRef.current = next
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(next)
  }, [focusPath, selectedNodeId, workflow])

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
    () =>
      toReactFlowEdges(
        workflow,
        effectiveSelectedConnectionId ?? undefined,
        {
          focusedConnectionIds: focusPath.focusedConnectionIds,
          dimUnfocused: focusPath.dimUnfocused,
          source: focusPath.source,
          priority: focusPath.priority,
        },
        edgeRuntimeByConnectionId,
      ),
    [edgeRuntimeByConnectionId, effectiveSelectedConnectionId, focusPath, workflow],
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

  const buildCollisionRects = useCallback(
    (panelRect: DOMRect): ReservedHudRect[] => {
      const panelSize = toPanelSize(panelRect)
      const fallbackRects = buildReservedHudRects(panelSize, hudCollisionState)
      const shell = panelRef.current?.closest('.game-hud-canvas-shell') ?? document
      const minimapElement =
        shell.querySelector('.canvas-minimap-hud')?.closest('.react-flow__panel') ??
        shell.querySelector('.canvas-minimap-hud')
      const consoleId = hudCollisionState.consoleOpen ? 'console-expanded' : 'console-collapsed'

      return mergeReservedRects(fallbackRects, [
        reservedRectFromElement(panelRect, 'command-hud', shell.querySelector('.canvas-command-hud')),
        reservedRectFromElement(panelRect, 'canvas-controls', shell.querySelector('.react-flow__controls')),
        reservedRectFromElement(panelRect, consoleId, shell.querySelector('.detail-drawer-dock')),
        reservedRectFromElement(panelRect, 'palette-drawer', shell.querySelector('.game-hud-palette-drawer.open')),
        reservedRectFromElement(panelRect, 'detail-drawer', shell.querySelector('.game-hud-detail-drawer.open')),
        reservedRectFromElement(panelRect, 'minimap', minimapElement),
        reservedRectFromElement(panelRect, 'notification-bundle', shell.querySelector('.hud-notification-bundle.open')),
      ])
    },
    [hudCollisionState],
  )

  const readNodePanelRect = useCallback((nodeId: string, panelRect: DOMRect): HudRect | null => {
    const escapedId = escapeCssSelectorValue(nodeId)
    const element = panelRef.current?.querySelector(`.react-flow__node[data-id="${escapedId}"]`)
    return reservedRectFromElement(panelRect, `node:${nodeId}`, element)
  }, [])

  const flowPointToPanelPoint = useCallback((flowPosition: XYPosition): XYPosition | null => {
    const instance = flowInstanceRef.current
    const panelRect = panelRef.current?.getBoundingClientRect()
    if (!instance || !panelRect) {
      return null
    }

    const screenPoint = instance.flowToScreenPosition(flowPosition)
    return {
      x: screenPoint.x - panelRect.left,
      y: screenPoint.y - panelRect.top,
    }
  }, [])

  const resolveNodeHudAnchor = useCallback(
    (nodeId: string): CanvasHudAnchor | null => {
      const selectedNode = nodesRef.current.find((node) => node.id === nodeId)
      const panelRect = panelRef.current?.getBoundingClientRect()
      if (!selectedNode || !panelRect) {
        return null
      }

      const panelSize = toPanelSize(panelRect)
      const hudSize = resolveHudSize(
        hudCollisionState.nodeHudSize,
        FALLBACK_NODE_HUD_SIZE,
        panelSize,
      )
      const reservedRects = buildCollisionRects(panelRect)
      const topSafeY = resolveTopSafeY(panelSize, reservedRects)
      const visualNodeRect = readNodePanelRect(nodeId, panelRect)
      const nodeTopLeft = visualNodeRect
        ? { x: visualNodeRect.x, y: visualNodeRect.y }
        : flowPointToPanelPoint(selectedNode.position)
      const nodeTopRight = visualNodeRect
        ? { x: visualNodeRect.x + visualNodeRect.width, y: visualNodeRect.y }
        : flowPointToPanelPoint({
            x: selectedNode.position.x + NODE_CARD_WIDTH,
            y: selectedNode.position.y,
          })
      const nodeBottomLeft = visualNodeRect
        ? { x: visualNodeRect.x, y: visualNodeRect.y + visualNodeRect.height }
        : flowPointToPanelPoint({
            x: selectedNode.position.x,
            y: selectedNode.position.y + NODE_CARD_HEIGHT,
          })

      if (!nodeTopLeft || !nodeTopRight || !nodeBottomLeft) {
        return null
      }

      const nodeCenterX = (nodeTopLeft.x + nodeTopRight.x) / 2
      const rightCandidate: HudPlacementCandidate = {
        placement: 'right',
        point: { x: nodeTopRight.x + HUD_MARGIN, y: nodeTopLeft.y + 4 },
      }
      const leftCandidate: HudPlacementCandidate = {
        placement: 'left',
        point: { x: nodeTopLeft.x - hudSize.width - HUD_MARGIN, y: nodeTopLeft.y + 4 },
      }
      const belowCandidate: HudPlacementCandidate = {
        placement: 'below',
        point: {
          x: nodeCenterX - hudSize.width / 2,
          y: nodeBottomLeft.y + HUD_MARGIN,
        },
      }
      const aboveCandidate: HudPlacementCandidate = {
        placement: 'above',
        point: {
          x: nodeCenterX - hudSize.width / 2,
          y: nodeTopLeft.y - hudSize.height - HUD_MARGIN,
        },
      }
      const topSafeCandidate: HudPlacementCandidate = {
        placement: 'top-safe',
        point: {
          x: nodeCenterX - hudSize.width / 2,
          y: topSafeY,
        },
      }
      const fallbackCandidate: HudPlacementCandidate = {
        placement: 'fallback',
        point: {
          x: panelSize.left + panelSize.width - hudSize.width - HUD_MARGIN,
          y: topSafeY,
        },
      }
      const baseCandidates = [
        rightCandidate,
        leftCandidate,
        belowCandidate,
        aboveCandidate,
        topSafeCandidate,
        fallbackCandidate,
      ]
      const zoom = flowInstanceRef.current?.getZoom() ?? 1
      const candidates = zoom < 0.75
        ? [
            topSafeCandidate,
            rightCandidate,
            leftCandidate,
            belowCandidate,
            aboveCandidate,
            fallbackCandidate,
          ]
        : baseCandidates

      return resolveHudAnchorFromCandidates(
        candidates,
        hudSize,
        panelSize,
        reservedRects,
        'node',
        topSafeY,
      )
    },
    [buildCollisionRects, flowPointToPanelPoint, hudCollisionState, readNodePanelRect],
  )

  const resolveEdgeHudAnchor = useCallback(
    (connectionId: string): CanvasHudAnchor | null => {
      const connection = workflow.connections.find((item) => item.id === connectionId)
      if (!connection) {
        return null
      }

      const sourceNode = nodesRef.current.find((node) => node.id === connection.sourceNodeId)
      const targetNode = nodesRef.current.find((node) => node.id === connection.targetNodeId)
      const panelRect = panelRef.current?.getBoundingClientRect()
      if (!sourceNode || !targetNode || !panelRect) {
        return null
      }

      const panelSize = toPanelSize(panelRect)
      const hudSize = resolveHudSize(
        hudCollisionState.edgeHudSize,
        FALLBACK_EDGE_HUD_SIZE,
        panelSize,
      )
      const reservedRects = buildCollisionRects(panelRect)
      const topSafeY = resolveTopSafeY(panelSize, reservedRects)
      const sourceVisualRect = readNodePanelRect(sourceNode.id, panelRect)
      const targetVisualRect = readNodePanelRect(targetNode.id, panelRect)
      const sourceCenter = sourceVisualRect
        ? {
            x: sourceVisualRect.x + sourceVisualRect.width / 2,
            y: sourceVisualRect.y + sourceVisualRect.height / 2,
          }
        : flowPointToPanelPoint({
            x: sourceNode.position.x + NODE_CARD_WIDTH / 2,
            y: sourceNode.position.y + NODE_CARD_HEIGHT / 2,
          })
      const targetCenter = targetVisualRect
        ? {
            x: targetVisualRect.x + targetVisualRect.width / 2,
            y: targetVisualRect.y + targetVisualRect.height / 2,
          }
        : flowPointToPanelPoint({
            x: targetNode.position.x + NODE_CARD_WIDTH / 2,
            y: targetNode.position.y + NODE_CARD_HEIGHT / 2,
          })

      if (!sourceCenter || !targetCenter) {
        return null
      }

      const midpoint = {
        x: (sourceCenter.x + targetCenter.x) / 2,
        y: (sourceCenter.y + targetCenter.y) / 2,
      }
      const candidates: HudPlacementCandidate[] = [
        {
          placement: 'right',
          point: { x: midpoint.x + HUD_MARGIN, y: midpoint.y - hudSize.height / 2 },
        },
        {
          placement: 'left',
          point: { x: midpoint.x - hudSize.width - HUD_MARGIN, y: midpoint.y - hudSize.height / 2 },
        },
        {
          placement: 'below',
          point: { x: midpoint.x - hudSize.width / 2, y: midpoint.y + HUD_MARGIN },
        },
        {
          placement: 'above',
          point: { x: midpoint.x - hudSize.width / 2, y: midpoint.y - hudSize.height - HUD_MARGIN },
        },
        {
          placement: 'top-safe',
          point: { x: midpoint.x - hudSize.width / 2, y: topSafeY },
        },
        {
          placement: 'fallback',
          point: {
            x: panelSize.left + panelSize.width - hudSize.width - HUD_MARGIN,
            y: topSafeY,
          },
        },
      ]

      return resolveHudAnchorFromCandidates(
        candidates,
        hudSize,
        panelSize,
        reservedRects,
        'edge',
        topSafeY,
      )
    },
    [buildCollisionRects, flowPointToPanelPoint, hudCollisionState, readNodePanelRect, workflow.connections],
  )

  const updateHudAnchors = useCallback(() => {
    const edgeAnchor = effectiveSelectedConnectionId
      ? resolveEdgeHudAnchor(effectiveSelectedConnectionId)
      : null
    const nodeAnchor = edgeAnchor ? null : resolveNodeHudAnchor(selectedNodeId)

    onHudAnchorChange({
      node: nodeAnchor,
      edge: edgeAnchor,
    })
  }, [
    effectiveSelectedConnectionId,
    onHudAnchorChange,
    resolveEdgeHudAnchor,
    resolveNodeHudAnchor,
    selectedNodeId,
  ])

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateHudAnchors)
    const settleTimer = window.setTimeout(updateHudAnchors, 80)
    const measurementTimer = window.setTimeout(updateHudAnchors, 240)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(measurementTimer)
    }
  }, [updateHudAnchors])

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
      window.requestAnimationFrame(updateHudAnchors)
    }
  }, [updateHudAnchors])

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onMoveNode(node.id, unscaleNodePosition(node.position))
      window.requestAnimationFrame(updateHudAnchors)
    },
    [onMoveNode, updateHudAnchors],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      onSelectConnectionId(edge.id)
      focusCanvasPanel()
      window.requestAnimationFrame(updateHudAnchors)
    },
    [focusCanvasPanel, onSelectConnectionId, updateHudAnchors],
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
      window.requestAnimationFrame(updateHudAnchors)
    },
    [onZoomHudChange, updateHudAnchors],
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
              flowInstanceRef.current = instance
              onZoomHudChange(buildZoomHudView(instance.getZoom()))
              window.requestAnimationFrame(updateHudAnchors)
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
