import type { WorkflowStatus } from '../domain/workflow'
import { workflowStatusLabels } from '../domain/displayLabels'

export type CanvasMode = 'standard' | 'reactFlow'

type TopBarProps = {
  workflowName: string
  status: WorkflowStatus
  isRunning: boolean
  canvasMode: CanvasMode
  onRun: () => void
  onStop: () => void
  onReset: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  onChangeCanvasMode: (mode: CanvasMode) => void
}

export function TopBar({
  workflowName,
  status,
  isRunning,
  canvasMode,
  onRun,
  onStop,
  onReset,
  onExportJson,
  onImportJson,
  onChangeCanvasMode,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="project-switcher">
        <span className="eyebrow">Agent Workflow Studio</span>
        <strong>{workflowName}</strong>
      </div>
      <div className="top-actions" aria-label="ワークフロー操作">
        <div className="canvas-mode-switch" aria-label="キャンバス表示モード">
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
        <button type="button" className="icon-button" title="ワークフロー保存">
          保存
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onRun}
          disabled={isRunning}
        >
          実行
        </button>
        <button type="button" className="icon-button" onClick={onStop} disabled={!isRunning}>
          停止
        </button>
        <button type="button" className="icon-button" onClick={onReset} disabled={isRunning}>
          リセット
        </button>
        <button type="button" className="icon-button" onClick={onExportJson}>
          JSONを書き出し
        </button>
        <label className="file-action">
          JSONを読み込み
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
        <button type="button" className="icon-button" disabled>
          スケジュール
        </button>
      </div>
      <div className="status-cluster">
        <span className={`status-pill status-${status}`}>{workflowStatusLabels[status]}</span>
        <span className="model-pill">推奨: GPT-5.4 high / GPT-5.5 high</span>
      </div>
    </header>
  )
}
