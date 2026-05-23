import { useMemo } from 'react'
import type { ArtifactVersion } from '../domain/evaluation'

type ArtifactVersionHistoryProps = {
  versions: ArtifactVersion[]
  selectedVersionId: string | undefined
  onSelectVersion: (versionId: string) => void
}

export function ArtifactVersionHistory({
  versions,
  selectedVersionId,
  onSelectVersion,
}: ArtifactVersionHistoryProps) {
  const reversedVersions = useMemo(() => [...versions].reverse(), [versions])

  if (versions.length === 0) {
    return (
      <div className="artifact-version-history">
        <h3>成果物バージョン履歴</h3>
        <p className="muted">まだバージョンが保存されていません。</p>
      </div>
    )
  }

  return (
    <div className="artifact-version-history">
      <h3>成果物バージョン履歴</h3>
      <ul className="version-list">
        {reversedVersions.map((version) => {
          const isSelected = version.id === selectedVersionId
          return (
            <li
              key={version.id}
              className={`version-item ${isSelected ? 'version-item-selected' : ''}`}
            >
              <div className="version-item-meta">
                <span className="version-number">v{version.version}</span>
                <time className="version-created-at">
                  {new Date(version.createdAt).toLocaleString('ja-JP')}
                </time>
                {version.rebuildRequestId ? (
                  <span className="version-tag version-tag-rebuild">再作成</span>
                ) : null}
                {version.evaluationId ? (
                  <span className="version-tag version-tag-eval">評価済</span>
                ) : null}
              </div>
              <div className="version-preview">
                {version.content.slice(0, 80)}
                {version.content.length > 80 ? '…' : ''}
              </div>
              {!isSelected ? (
                <button
                  type="button"
                  className="icon-button btn-sm"
                  onClick={() => onSelectVersion(version.id)}
                >
                  このバージョンを表示
                </button>
              ) : (
                <span className="version-current-label">現在表示中</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
