import type {
  CentralHudView,
  HudDensityView,
  HudNotificationBundleView,
  HudSnapshot,
  ZoomHudView,
} from '../../domain/cognitiveHud'
import { hudPriorityLabels } from '../../domain/cognitiveHud'
import { workflowStatusLabels } from '../../domain/displayLabels'
import type { RunTrace } from '../../domain/runTrace'
import type { WorkflowStatus } from '../../domain/workflow'
import type { CanvasMode } from '../TopBar'

type CanvasCommandHudProps = {
  workflowName: string
  workflowStatus: WorkflowStatus
  isRunning: boolean
  canvasMode: CanvasMode
  canUndo: boolean
  canRedo: boolean
  hudSnapshot: HudSnapshot
  centralHudView: CentralHudView | null
  runTrace: RunTrace | null
  runHistoryCount: number
  hudDensity: HudDensityView
  notificationBundle: HudNotificationBundleView
  zoomHud: ZoomHudView
  paletteOpen: boolean
  detailOpen: boolean
  miniMapVisible: boolean
  consoleOpen: boolean
  notificationOpen: boolean
  onTogglePalette: () => void
  onToggleDetail: () => void
  onToggleMiniMap: () => void
  onToggleConsole: () => void
  onToggleNotification: () => void
  onCycleHudDensity: () => void
  onOpenRunDetail: () => void
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
  onResetPositions: () => void
}

export function CanvasCommandHud({
  workflowName,
  workflowStatus,
  isRunning,
  canvasMode,
  canUndo,
  canRedo,
  hudSnapshot,
  centralHudView,
  runTrace,
  runHistoryCount,
  hudDensity,
  notificationBundle,
  zoomHud,
  paletteOpen,
  detailOpen,
  miniMapVisible,
  consoleOpen,
  notificationOpen,
  onTogglePalette,
  onToggleDetail,
  onToggleMiniMap,
  onToggleConsole,
  onToggleNotification,
  onCycleHudDensity,
  onOpenRunDetail,
  onRun,
  onRunSelected,
  onRunFromSelected,
  onDryRun,
  onStop,
  onReset,
  onUndo,
  onRedo,
  onExportJson,
  onImportJson,
  onChangeCanvasMode,
  onResetPositions,
}: CanvasCommandHudProps) {
  return (
    <section className="canvas-command-hud" aria-label="最小常時HUD">
      <div className="canvas-command-hud-status" aria-label="現在状態">
        <span className={`hud-light hud-light-${hudSnapshot.priority}`} aria-hidden="true" />
        <strong title={workflowName}>{workflowName}</strong>
        <span className={`status-pill status-${workflowStatus}`} title="実行状態">
          {workflowStatusLabels[workflowStatus]}
          {isRunning ? ' / running' : ''}
        </span>
        <span className="mini-hud-chip" title={hudSnapshot.recommendedAction}>
          L{hudSnapshot.alertLevel} {hudPriorityLabels[hudSnapshot.priority]}
        </span>
        {centralHudView ? (
          <span className={`mini-hud-chip mini-hud-chip-${centralHudView.variant}`} title={centralHudView.nextAction}>
            ATTN {centralHudView.sourceLabel}
          </span>
        ) : null}
        <span className="mini-hud-chip" title={zoomHud.description}>
          {zoomHud.label} {zoomHud.zoomPercent}%
        </span>
        <span className="mini-hud-chip" title="ユーザー明示により GPT-5.5 high として継続">
          GPT-5.5 high
        </span>
        <span className="mini-hud-chip" title="mock-only / credential value storageなし">
          safe / mock / history {runHistoryCount}
        </span>
        <span
          className="mini-hud-chip"
          title={runTrace?.source === 'run-history' ? '最新の durable audit snapshot を参照中' : '現在の runtime trace を参照中'}
        >
          {runTrace?.source === 'run-history' ? 'audit' : 'trace'} {runTrace?.auditEventCount ?? 0}
        </span>
        <span className="mini-hud-chip" title={hudDensity.description}>
          HUD {hudDensity.label}
        </span>
      </div>

      <div className="canvas-command-hud-actions" aria-label="キャンバス操作">
        <button type="button" className="hud-icon-button primary" onClick={onRun} disabled={isRunning} title="実行">
          Run
        </button>
        <button type="button" className="hud-icon-button" onClick={onRunSelected} disabled={isRunning} title="選択を実行">
          Sel
        </button>
        <button type="button" className="hud-icon-button" onClick={onRunFromSelected} disabled={isRunning} title="ここから実行">
          From
        </button>
        <button type="button" className="hud-icon-button" onClick={onDryRun} disabled={isRunning} title="ドライラン">
          Dry
        </button>
        <button type="button" className="hud-icon-button danger" onClick={onStop} disabled={!isRunning} title="停止">
          Stop
        </button>
        <button type="button" className="hud-icon-button" onClick={onUndo} disabled={!canUndo || isRunning} title="Undo">
          U
        </button>
        <button type="button" className="hud-icon-button" onClick={onRedo} disabled={!canRedo || isRunning} title="Redo">
          R
        </button>
        <button type="button" className="hud-icon-button" onClick={onReset} disabled={isRunning} title="ワークフローをリセット">
          Reset
        </button>
        <button type="button" className="hud-icon-button" onClick={onResetPositions} title="React Flow 位置をリセット">
          Pos
        </button>
        <button type="button" className="hud-icon-button" onClick={onExportJson} title="JSON書き出し">
          Exp
        </button>
        <label className="hud-icon-button hud-file-action" title="JSON読み込み">
          Imp
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onImportJson(file)
                event.target.value = ''
              }
            }}
          />
        </label>
        <button
          type="button"
          className={`hud-icon-button ${canvasMode === 'reactFlow' ? 'active' : ''}`}
          onClick={() => onChangeCanvasMode(canvasMode === 'reactFlow' ? 'standard' : 'reactFlow')}
          title="Canvas表示モード切替"
        >
          {canvasMode === 'reactFlow' ? 'RF' : 'Std'}
        </button>
        <button
          type="button"
          className={`hud-icon-button ${paletteOpen ? 'active' : ''}`}
          onClick={onTogglePalette}
          aria-pressed={paletteOpen}
          title="パレット表示切替"
        >
          P
        </button>
        <button
          type="button"
          className={`hud-icon-button ${detailOpen ? 'active' : ''}`}
          onClick={onToggleDetail}
          aria-pressed={detailOpen}
          title="詳細表示切替"
        >
          D
        </button>
        <button
          type="button"
          className={`hud-icon-button ${miniMapVisible ? 'active' : ''}`}
          onClick={onToggleMiniMap}
          aria-pressed={miniMapVisible}
          title="ミニマップ表示切替"
        >
          M
        </button>
        <button
          type="button"
          className={`hud-icon-button ${consoleOpen ? 'active' : ''}`}
          onClick={onToggleConsole}
          aria-pressed={consoleOpen}
          title="コンソール表示切替"
        >
          C
        </button>
        <button
          type="button"
          className={`hud-icon-button ${notificationOpen ? 'active' : ''}`}
          onClick={onToggleNotification}
          aria-pressed={notificationOpen}
          title={`通知/履歴HUD表示切替: ${notificationBundle.notificationItems.length}件`}
        >
          N{notificationBundle.notificationItems.length}
        </button>
        <button
          type="button"
          className="hud-icon-button"
          onClick={onOpenRunDetail}
          title="Run Detail / audit replay を開く"
        >
          T
        </button>
        <button
          type="button"
          className="hud-icon-button"
          onClick={onCycleHudDensity}
          title={`HUD密度切替: ${hudDensity.label}`}
        >
          {hudDensity.shortLabel}
        </button>
      </div>
    </section>
  )
}
