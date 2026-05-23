import type { WorkflowStatus } from '../domain/workflow'

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
      <div className="top-actions" aria-label="Workflow actions">
        <button type="button" className="icon-button" title="Save workflow">
          Save
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onRun}
          disabled={isRunning}
        >
          Run
        </button>
        <button type="button" className="icon-button" onClick={onStop} disabled={!isRunning}>
          Stop
        </button>
        <button type="button" className="icon-button" onClick={onReset} disabled={isRunning}>
          Reset
        </button>
        <button type="button" className="icon-button" onClick={onExportJson}>
          Export JSON
        </button>
        <label className="file-action">
          Import JSON
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
          Schedule
        </button>
      </div>
      <div className="status-cluster">
        <span className={`status-pill status-${status}`}>{status}</span>
        <span className="model-pill">GPT-5.5 recommended</span>
      </div>
    </header>
  )
}
