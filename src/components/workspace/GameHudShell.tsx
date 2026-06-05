import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  buildCentralHudView,
  buildFlowPressureProjection,
  buildHudDensityView,
  buildHudNotificationBundle,
  buildSemanticFocusPathView,
  buildZoomHudView,
  getNextHudDensityMode,
  type CentralHudView,
  type FlowPressureProjection,
  type HudDensityMode,
  type HudDensityView,
  type HudNotificationBundleView,
  type HudNotificationSessionState,
  type HudSnapshot,
  type SemanticFocusPathView,
  type ZoomHudView,
} from '../../domain/cognitiveHud'
import type { ConnectorJob } from '../../domain/connectorQueue'
import type {
  EvaluationResult,
  HumanReviewState,
  ReviewDecision,
} from '../../domain/evaluation'
import type { ExecutionGraph } from '../../domain/executionGraph'
import type { RunTrace } from '../../domain/runTrace'
import type { WorkflowRunRecord } from '../../domain/runHistory'
import type {
  AgentRole,
  ConnectionKind,
  Workflow,
  WorkflowConnection,
  WorkflowConnectionRuntimePolicy,
  WorkflowNode,
  WorkflowStatus,
} from '../../domain/workflow'
import type { ConnectionValidationResult } from '../../state/workflowSelectors'
import type { CanvasMode } from '../TopBar'
import { CanvasCommandHud } from './CanvasCommandHud'
import { CognitiveWorkflowCanvas } from './CognitiveWorkflowCanvas'
import { CriticalOverlay } from './CriticalOverlay'
import { DetailDrawerDock } from './DetailDrawerDock'
import { HudNotificationBundle } from './HudNotificationBundle'
import { WorkspaceLeftRail } from './WorkspaceLeftRail'
import { WorkspaceRightPanel } from './WorkspaceRightPanel'

export type GameHudShellProps = {
  workflow: Workflow
  workflowStatus: WorkflowStatus
  isRunning: boolean
  canvasMode: CanvasMode
  canUndo: boolean
  canRedo: boolean
  selectedNodeId: string
  selectedNode: WorkflowNode | undefined
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  connectionValidation: ConnectionValidationResult[]
  executionGraph: ExecutionGraph | null
  connectorJobs: ConnectorJob[]
  evaluation: EvaluationResult | undefined
  humanReview: HumanReviewState | undefined
  hudSnapshot: HudSnapshot
  runTrace: RunTrace | null
  runHistoryRecords: WorkflowRunRecord[]
  runHistoryCount: number
  selectedConnectionId: string | null
  selectedRunDetailRunId: string | null
  onRun: () => void
  onRunSelected: () => void
  onRunFromSelected: () => void
  onDryRun: () => void
  onValidate: () => void
  onStop: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  onChangeCanvasMode: (mode: CanvasMode) => void
  onSelectNode: (nodeId: string) => void
  onSelectConnectionId: (connectionId: string | null) => void
  onSelectRunDetailRunId: (runId: string | null) => void
  onOpenRunDetail: () => void
  onAddNode: (part: WorkflowNode) => void
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
  onUpdateConnectionRuntimePolicy: (
    connectionId: string,
    runtimePolicy: WorkflowConnectionRuntimePolicy | undefined,
  ) => void
  onCreateConnectionDraft: (draft: {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
    kind: ConnectionKind
  }) => { ok: boolean; reason: string | null }
  onDeleteConnection: (connectionId: string) => void
  onDeleteNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, position: WorkflowNode['position']) => void
  onResetReactFlowPositions: () => void
  onHumanReviewDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
  detailDrawerSlot: ReactNode
  flashSlot?: ReactNode
  confirmSlot?: ReactNode
}

export function GameHudShell(props: GameHudShellProps) {
  const { onOpenRunDetail } = props
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [miniMapVisible, setMiniMapVisible] = useState(true)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationSessionState, setNotificationSessionState] = useState<HudNotificationSessionState>({})
  const [hudDensityMode, setHudDensityMode] = useState<HudDensityMode>('balanced')
  const [zoomHud, setZoomHud] = useState<ZoomHudView>(() => buildZoomHudView(1))
  const hudDensity = useMemo<HudDensityView>(
    () => buildHudDensityView(hudDensityMode),
    [hudDensityMode],
  )
  const flowPressure = useMemo<FlowPressureProjection>(
    () => buildFlowPressureProjection({ runTrace: props.runTrace }),
    [props.runTrace],
  )

  const handleZoomChange = useCallback((next: ZoomHudView) => {
    setZoomHud((current) =>
      current.zoomPercent === next.zoomPercent && current.mode === next.mode ? current : next,
    )
  }, [])
  const togglePalette = useCallback(() => {
    setPaletteOpen((value) => !value)
    setDetailOpen(false)
    setNotificationOpen(false)
  }, [])
  const toggleDetail = useCallback(() => {
    setDetailOpen((value) => !value)
    setPaletteOpen(false)
    setNotificationOpen(false)
  }, [])
  const toggleNotification = useCallback(() => {
    setNotificationOpen((value) => {
      const next = !value
      if (next) {
        setPaletteOpen(false)
        setDetailOpen(false)
      }
      return next
    })
  }, [])
  const cycleHudDensity = useCallback(() => {
    setHudDensityMode((current) => getNextHudDensityMode(current))
  }, [])
  const markNotificationRead = useCallback((notificationId: string) => {
    setNotificationSessionState((current) => ({
      ...current,
      [notificationId]: {
        ...current[notificationId],
        read: true,
      },
    }))
  }, [])
  const acknowledgeNotification = useCallback((notificationId: string) => {
    setNotificationSessionState((current) => ({
      ...current,
      [notificationId]: {
        ...current[notificationId],
        read: true,
        acknowledged: true,
      },
    }))
  }, [])
  const toggleNotificationPinned = useCallback((notificationId: string) => {
    setNotificationSessionState((current) => ({
      ...current,
      [notificationId]: {
        ...current[notificationId],
        pinned: current[notificationId]?.pinned !== true,
      },
    }))
  }, [])
  const openRunDetail = useCallback(() => {
    setConsoleOpen(true)
    onOpenRunDetail()
  }, [onOpenRunDetail])
  const hudSurfaceState = useMemo(
    () => ({
      paletteOpen,
      detailOpen,
      consoleOpen,
      notificationOpen,
    }),
    [consoleOpen, detailOpen, notificationOpen, paletteOpen],
  )
  const semanticFocusPath = useMemo<SemanticFocusPathView | null>(
    () =>
      buildSemanticFocusPathView({
        workflow: props.workflow,
        hudSnapshot: props.hudSnapshot,
        executionGraph: props.executionGraph,
        connectionValidation: props.connectionValidation,
        runTrace: props.runTrace,
        evaluation: props.evaluation,
        humanReview: props.humanReview,
      }),
    [
      props.connectionValidation,
      props.evaluation,
      props.executionGraph,
      props.hudSnapshot,
      props.humanReview,
      props.runTrace,
      props.workflow,
    ],
  )
  const centralHudView = useMemo<CentralHudView | null>(
    () =>
      buildCentralHudView({
        hudSnapshot: props.hudSnapshot,
        semanticFocusPath,
        flowPressure,
      }),
    [flowPressure, props.hudSnapshot, semanticFocusPath],
  )
  const notificationBundle = useMemo<HudNotificationBundleView>(
    () =>
      buildHudNotificationBundle({
        hudSnapshot: props.hudSnapshot,
        centralHudView,
        runTrace: props.runTrace,
        runHistoryRecords: props.runHistoryRecords,
        flowPressure,
        densityMode: hudDensityMode,
        notificationSessionState,
      }),
    [
      centralHudView,
      flowPressure,
      hudDensityMode,
      notificationSessionState,
      props.hudSnapshot,
      props.runHistoryRecords,
      props.runTrace,
    ],
  )

  const workspaceClassName = [
    'cognitive-workspace',
    'game-hud-workspace',
    zoomHud.className,
    hudDensity.className,
    semanticFocusPath ? `semantic-focus-${semanticFocusPath.source}` : '',
    paletteOpen ? 'palette-open' : '',
    detailOpen ? 'detail-open' : '',
    consoleOpen ? 'console-open' : '',
    miniMapVisible ? 'minimap-open' : '',
    notificationOpen ? 'notification-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={workspaceClassName}>
      <div className="game-hud-canvas-shell" aria-label="Game HUD 型ワークフロースタジオ">
        <CognitiveWorkflowCanvas
          workflow={props.workflow}
          canvasMode={props.canvasMode}
          selectedNodeId={props.selectedNodeId}
          selectedNode={props.selectedNode}
          selectedConnectionId={props.selectedConnectionId}
          connectionValidation={props.connectionValidation}
          executionGraph={props.executionGraph}
          hudSnapshot={props.hudSnapshot}
          runTrace={props.runTrace}
          semanticFocusPath={semanticFocusPath}
          centralHudView={centralHudView}
          miniMapVisible={miniMapVisible}
          hudSurfaceState={hudSurfaceState}
          onZoomHudChange={handleZoomChange}
          onOpenDetail={() => setDetailOpen(true)}
          onOpenRunDetail={openRunDetail}
          onRunSelected={props.onRunSelected}
          onSelectNode={props.onSelectNode}
          onSelectConnectionId={props.onSelectConnectionId}
          onCreateConnection={props.onCreateConnectionDraft}
          onDeleteConnection={props.onDeleteConnection}
          onDeleteNode={props.onDeleteNode}
          onMoveNode={props.onMoveNode}
        />

        <CanvasCommandHud
          workflowName={props.workflow.name}
          workflowStatus={props.workflowStatus}
          isRunning={props.isRunning}
          canvasMode={props.canvasMode}
          canUndo={props.canUndo}
          canRedo={props.canRedo}
          hudSnapshot={props.hudSnapshot}
          centralHudView={centralHudView}
          runTrace={props.runTrace}
          runHistoryCount={props.runHistoryCount}
          hudDensity={hudDensity}
          flowPressure={flowPressure}
          notificationBundle={notificationBundle}
          zoomHud={zoomHud}
          paletteOpen={paletteOpen}
          detailOpen={detailOpen}
          miniMapVisible={miniMapVisible}
          consoleOpen={consoleOpen}
          notificationOpen={notificationOpen}
          onTogglePalette={togglePalette}
          onToggleDetail={toggleDetail}
          onToggleMiniMap={() => setMiniMapVisible((value) => !value)}
          onToggleConsole={() => setConsoleOpen((value) => !value)}
          onToggleNotification={toggleNotification}
          onCycleHudDensity={cycleHudDensity}
          onOpenRunDetail={openRunDetail}
          onRun={props.onRun}
          onRunSelected={props.onRunSelected}
          onRunFromSelected={props.onRunFromSelected}
          onDryRun={props.onDryRun}
          onValidate={props.onValidate}
          onStop={props.onStop}
          onReset={props.onReset}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onExportJson={props.onExportJson}
          onImportJson={props.onImportJson}
          onChangeCanvasMode={props.onChangeCanvasMode}
          onResetPositions={props.onResetReactFlowPositions}
        />

        <HudNotificationBundle
          view={notificationBundle}
          open={notificationOpen}
          onClose={() => setNotificationOpen(false)}
          onSelectNode={(nodeId) => {
            props.onSelectNode(nodeId)
            setNotificationOpen(false)
          }}
          onSelectRun={(runId) => {
            props.onSelectRunDetailRunId(runId)
            openRunDetail()
            setNotificationOpen(false)
          }}
          onMarkNotificationRead={markNotificationRead}
          onAcknowledgeNotification={acknowledgeNotification}
          onToggleNotificationPinned={toggleNotificationPinned}
          onCycleHudDensity={cycleHudDensity}
        />

        <div className="game-hud-alert-stack" aria-live="polite">
          {props.flashSlot}
          {props.confirmSlot}
        </div>

        <aside
          className={`game-hud-drawer game-hud-palette-drawer ${paletteOpen ? 'open' : ''}`}
          aria-label="パレットHUD"
          aria-hidden={!paletteOpen}
        >
          <header className="game-hud-drawer-header">
            <span className="eyebrow">Palette HUD</span>
            <button type="button" className="hud-icon-button" onClick={() => setPaletteOpen(false)}>
              Close
            </button>
          </header>
          <WorkspaceLeftRail
            parts={props.workflow.nodes}
            selectedNodeId={props.selectedNodeId}
            onSelectNode={props.onSelectNode}
            onAddNode={props.onAddNode}
          />
        </aside>

        <aside
          className={`game-hud-drawer game-hud-detail-drawer ${detailOpen ? 'open' : ''}`}
          aria-label="詳細HUD"
          aria-hidden={!detailOpen}
        >
          <header className="game-hud-drawer-header">
            <span className="eyebrow">Detail HUD</span>
            <button type="button" className="hud-icon-button" onClick={() => setDetailOpen(false)}>
              Close
            </button>
          </header>
          <WorkspaceRightPanel
            selectedNode={props.selectedNode}
            nodes={props.nodes}
            connections={props.connections}
            connectionValidation={props.connectionValidation}
            workflow={props.workflow}
            executionGraph={props.executionGraph}
            connectorJobs={props.connectorJobs}
            hudSnapshot={props.hudSnapshot}
            runHistoryRecords={props.runHistoryRecords}
            evaluation={props.evaluation}
            humanReview={props.humanReview}
            onSaveNode={props.onSaveNode}
            onCreateConnection={props.onCreateConnection}
            onUpdateConnectionRuntimePolicy={props.onUpdateConnectionRuntimePolicy}
            onDeleteConnection={props.onDeleteConnection}
            onDeleteNode={props.onDeleteNode}
            onMoveNode={props.onMoveNode}
            onHumanReviewDecide={props.onHumanReviewDecide}
            onRequestRebuild={props.onRequestRebuild}
          />
        </aside>

        <DetailDrawerDock
          collapsed={!consoleOpen}
          onCollapsedChange={(collapsed) => setConsoleOpen(!collapsed)}
        >
          {props.detailDrawerSlot}
        </DetailDrawerDock>
      </div>

      <CriticalOverlay hudSnapshot={props.hudSnapshot} centralHudView={centralHudView} />
    </div>
  )
}
