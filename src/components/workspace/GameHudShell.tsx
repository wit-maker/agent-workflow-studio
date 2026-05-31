import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { buildZoomHudView, type HudSnapshot, type ZoomHudView } from '../../domain/cognitiveHud'
import type { ConnectorJob } from '../../domain/connectorQueue'
import type {
  EvaluationResult,
  HumanReviewState,
  ReviewDecision,
} from '../../domain/evaluation'
import type { ExecutionGraph } from '../../domain/executionGraph'
import type { WorkflowRunRecord } from '../../domain/runHistory'
import type {
  AgentRole,
  ConnectionKind,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
  WorkflowStatus,
} from '../../domain/workflow'
import type { ConnectionValidationResult } from '../../state/workflowSelectors'
import type { CanvasMode } from '../TopBar'
import { CanvasCommandHud } from './CanvasCommandHud'
import { CognitiveWorkflowCanvas } from './CognitiveWorkflowCanvas'
import { CriticalOverlay } from './CriticalOverlay'
import { DetailDrawerDock } from './DetailDrawerDock'
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
  runHistoryRecords: WorkflowRunRecord[]
  runHistoryCount: number
  onRun: () => void
  onRunSelected: () => void
  onRunFromSelected: () => void
  onDryRun: () => void
  onStop: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  onChangeCanvasMode: (mode: CanvasMode) => void
  onSelectNode: (nodeId: string) => void
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [miniMapVisible, setMiniMapVisible] = useState(true)
  const [zoomHud, setZoomHud] = useState<ZoomHudView>(() => buildZoomHudView(1))

  const handleZoomChange = useCallback((next: ZoomHudView) => {
    setZoomHud((current) =>
      current.zoomPercent === next.zoomPercent && current.mode === next.mode ? current : next,
    )
  }, [])
  const hudSurfaceState = useMemo(
    () => ({
      paletteOpen,
      detailOpen,
      consoleOpen,
    }),
    [consoleOpen, detailOpen, paletteOpen],
  )

  const workspaceClassName = [
    'cognitive-workspace',
    'game-hud-workspace',
    zoomHud.className,
    paletteOpen ? 'palette-open' : '',
    detailOpen ? 'detail-open' : '',
    consoleOpen ? 'console-open' : '',
    miniMapVisible ? 'minimap-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={workspaceClassName}>
      <div className="game-hud-canvas-shell" aria-label="Game HUD 型ワークフロースタジオ">
        <CognitiveWorkflowCanvas
          workflow={props.workflow}
          canvasMode={props.canvasMode}
          selectedNodeId={props.selectedNodeId}
          selectedNode={props.selectedNode}
          connectionValidation={props.connectionValidation}
          hudSnapshot={props.hudSnapshot}
          miniMapVisible={miniMapVisible}
          hudSurfaceState={hudSurfaceState}
          onZoomHudChange={handleZoomChange}
          onOpenDetail={() => setDetailOpen(true)}
          onRunSelected={props.onRunSelected}
          onSelectNode={props.onSelectNode}
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
          runHistoryCount={props.runHistoryCount}
          zoomHud={zoomHud}
          paletteOpen={paletteOpen}
          detailOpen={detailOpen}
          miniMapVisible={miniMapVisible}
          consoleOpen={consoleOpen}
          onTogglePalette={() => setPaletteOpen((value) => !value)}
          onToggleDetail={() => setDetailOpen((value) => !value)}
          onToggleMiniMap={() => setMiniMapVisible((value) => !value)}
          onToggleConsole={() => setConsoleOpen((value) => !value)}
          onRun={props.onRun}
          onRunSelected={props.onRunSelected}
          onRunFromSelected={props.onRunFromSelected}
          onDryRun={props.onDryRun}
          onStop={props.onStop}
          onReset={props.onReset}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onExportJson={props.onExportJson}
          onImportJson={props.onImportJson}
          onChangeCanvasMode={props.onChangeCanvasMode}
          onResetPositions={props.onResetReactFlowPositions}
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

      <CriticalOverlay hudSnapshot={props.hudSnapshot} />
    </div>
  )
}
