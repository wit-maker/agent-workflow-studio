import { evaluationStatusLabels } from '../domain/displayLabels'
import type { ArtifactVersion } from '../domain/evaluation'
import type { EvaluationResult } from '../domain/evaluation'

type ArtifactVersionHistoryProps = {
  versions: ArtifactVersion[]
  selectedVersionId?: string
  evaluation?: EvaluationResult
  onSelectVersion: (versionId: string) => void
}

export function ArtifactVersionHistory({
  versions,
  selectedVersionId,
  evaluation,
  onSelectVersion,
}: ArtifactVersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div className="version-history">
        <div className="panel-section-heading">
          <span>成果物バージョン履歴</span>
        </div>
        <p className="muted">
          バージョン履歴はありません。再作成を実行するとここに追加されます。
        </p>
      </div>
    )
  }

  const sorted = [...versions].sort((a, b) => b.version - a.version)

  return (
    <div className="version-history">
      <div className="panel-section-heading">
        <span>成果物バージョン履歴</span>
        <span className="muted">{versions.length} バージョン</span>
      </div>

      <ul className="version-list">
        {sorted.map((v) => {
          const isSelected = v.id === selectedVersionId
          const evalStatus =
            v.evaluationId && evaluation?.id === v.evaluationId
              ? evaluation.status
              : undefined

          return (
            <li
              key={v.id}
              className={`version-item ${isSelected ? 'version-selected' : ''}`}
            >
              <div className="version-header">
                <span className="version-number">v{v.version}</span>
                <span className="muted version-time">
                  {new Date(v.createdAt).toLocaleString('ja-JP')}
                </span>
                {evalStatus && (
                  <span className={`eval-badge-sm eval-${evalStatus}`}>
                    {evaluationStatusLabels[evalStatus]}
                  </span>
                )}
                {v.rebuildRequestId && (
                  <span className="rebuild-badge-sm">再作成版</span>
                )}
              </div>

              <p className="version-preview muted">
                {v.content.slice(0, 120)}
                {v.content.length > 120 ? '...' : ''}
              </p>

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => onSelectVersion(v.id)}
                disabled={isSelected}
              >
                {isSelected ? '表示中' : 'この版を表示'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
