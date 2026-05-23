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
    <section className="library-panel" aria-label="ワークフロー履歴">
      <div className="library-heading">
        <h3>ワークフロー履歴</h3>
        <button type="button" className="primary-button" onClick={onSaveSnapshot}>
          スナップショット保存
        </button>
      </div>
      {snapshots.length === 0 ? (
        <p className="muted">ローカル保存された履歴はまだありません。</p>
      ) : (
        snapshots.map((snapshot) => (
          <div key={snapshot.id} className="library-row">
            <div>
              <strong>{snapshot.name}</strong>
              <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
            </div>
            <button type="button" className="icon-button" onClick={() => onLoadSnapshot(snapshot.id)}>
              読込
            </button>
            <button type="button" className="icon-button" onClick={() => onDeleteSnapshot(snapshot.id)}>
              削除
            </button>
          </div>
        ))
      )}
    </section>
  )
}
