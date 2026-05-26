import type { CanvasMode } from '../TopBar'

/*
 * GlobalRunControl
 *
 * Top region — issue #34 redesign.
 * Consolidates Run / Dry / Stop / Reset / Undo / Redo / Save / Import / Export
 * into one operation control area. The right side intentionally stays sparse
 * so the adjacent CurrentStateStrip can carry execution status, not buttons.
 */

type GlobalRunControlProps = {
  workflowName: string
  isRunning: boolean
  canvasMode: CanvasMode
  canUndo: boolean
  canRedo: boolean
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
}

export function GlobalRunControl({
  workflowName,
  isRunning,
  canvasMode,
  canUndo,
  canRedo,
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
}: GlobalRunControlProps) {
  return (
    <div className="global-run-control" aria-label="ワークフロー実行コントロール">
      <div className="global-run-control-workflow">
        <span className="eyebrow">Agent Workflow Studio</span>
        <strong>{workflowName}</strong>
      </div>
      <div className="global-run-control-actions" aria-label="実行操作">
        <div className="global-run-control-group" aria-label="実行">
          <button
            type="button"
            className="primary-button"
            onClick={() => onRun()}
            disabled={isRunning}
          >
            実行
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onRunSelected}
            disabled={isRunning}
          >
            選択を実行
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onRunFromSelected}
            disabled={isRunning}
          >
            ここから実行
          </button>
          <button type="button" className="icon-button" onClick={onDryRun} disabled={isRunning}>
            ドライラン
          </button>
          <button type="button" className="icon-button" onClick={onStop} disabled={!isRunning}>
            停止
          </button>
        </div>
        <div className="global-run-control-group" aria-label="編集">
          <button type="button" className="icon-button" onClick={onReset} disabled={isRunning}>
            リセット
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onUndo}
            disabled={!canUndo || isRunning}
          >
            Undo
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onRedo}
            disabled={!canRedo || isRunning}
          >
            Redo
          </button>
        </div>
        <div className="global-run-control-group" aria-label="入出力">
          <button type="button" className="icon-button" onClick={onExportJson}>
            JSON書き出し
          </button>
          <label className="file-action">
            JSON読み込み
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
        </div>
        <div className="global-run-control-group" aria-label="表示">
          <span className="canvas-mode-label">Canvas</span>
          <div className="segmented-control compact" role="tablist" aria-label="Canvas表示モード">
            <button
              type="button"
              className={canvasMode === 'standard' ? 'active' : ''}
              onClick={() => onChangeCanvasMode('standard')}
            >
              標準
            </button>
            <button
              type="button"
              className={canvasMode === 'reactFlow' ? 'active' : ''}
              onClick={() => onChangeCanvasMode('reactFlow')}
            >
              React Flow
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
