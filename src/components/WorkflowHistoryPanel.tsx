import type { SavedWorkflowSnapshot } from '../storage/localWorkflowHistory'

type WorkflowHistoryPanelProps = {
  snapshots: SavedWorkflowSnapshot[]
  onSaveSnapshot: () => void
  onLoadSnapshot: (id: string) => void
  onDeleteSnapshot: (id: string) => void
}

export function WorkflowHistoryPanel({
  snapshots,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
}: WorkflowHistoryPanelProps) {
  return (
    <section className="library-panel" aria-label="Workflow history">
      <div className="library-heading">
        <h3>Local History</h3>
        <button type="button" className="primary-button" onClick={onSaveSnapshot}>
          Save Snapshot
        </button>
      </div>
      {snapshots.length === 0 ? (
        <p className="muted">No local snapshots saved yet.</p>
      ) : (
        snapshots.map((snapshot) => (
          <div key={snapshot.id} className="library-row">
            <div>
              <strong>{snapshot.name}</strong>
              <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
            </div>
            <button type="button" className="icon-button" onClick={() => onLoadSnapshot(snapshot.id)}>
              Load
            </button>
            <button type="button" className="icon-button" onClick={() => onDeleteSnapshot(snapshot.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </section>
  )
}
