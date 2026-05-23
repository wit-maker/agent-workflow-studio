import type { WorkflowStatus } from '../domain/workflow'
import { workflowStatusLabels } from '../domain/displayLabels'

type TopBarProps = {
  workflowName: string
  status: WorkflowStatus
  isRunning: boolean
  onRun: () => void
  onStop: () => void
  onReset: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
}

export function TopBar({
  workflowName,
  status,
  isRunning,
  onRun,
  onStop,
  onReset,
  onExportJson,
  onImportJson,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="project-switcher">
        <span className="eyebrow">Agent Workflow Studio</span>
        <strong>{workflowName}</strong>
      </div>
      <div className="top-actions" aria-label="ワークフロー操作">
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
