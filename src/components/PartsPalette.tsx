import { useEffect, useMemo, useState } from 'react'
import { agentRoleLabels, formatDataTypeLabel, nodeCategoryLabels } from '../domain/displayLabels'
import { agentRoleTone, categoryToTone } from '../domain/nodeVisuals'
import type { NodeCategory, WorkflowNode } from '../domain/workflow'

const ALL_LABEL = 'すべて'

function getCategoryLabel(category: string): string {
  return nodeCategoryLabels[category as NodeCategory] ?? category
}

type PartsPaletteProps = {
  parts: WorkflowNode[]
  selectedNodeId: string
  onSelectNode: (nodeId: string) => void
  onAddNode: (part: WorkflowNode) => void
}

export function PartsPalette({
  parts,
  selectedNodeId,
  onSelectNode,
  onAddNode,
}: PartsPaletteProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL_LABEL)
  const [operationNotice, setOperationNotice] = useState<string | null>(null)

  const categories = useMemo(
    () => [ALL_LABEL, ...Array.from(new Set(parts.map((part) => part.category)))],
    [parts],
  )

  const filteredParts = parts.filter((part) => {
    const categoryLabel = getCategoryLabel(part.category)
    const text = `${part.title} ${categoryLabel} ${part.description}`.toLowerCase()
    return (
      (category === ALL_LABEL || part.category === category) &&
      text.includes(query.trim().toLowerCase())
    )
  })

  useEffect(() => {
    if (!operationNotice) return

    const timer = window.setTimeout(() => setOperationNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [operationNotice])

  function handleSelectPart(partId: string): void {
    onSelectNode(partId)
  }

  function handleAddPart(part: WorkflowNode): void {
    onAddNode(part)
    setOperationNotice(`追加しました: ${part.title}。互換ポートを接続して Validate / Run で確認できます。`)
  }

  return (
    <aside className="parts-palette" aria-label="MVP部品パレット">
      <div className="panel-heading">
        <span className="eyebrow">部品</span>
        <h2>MVPパレット</h2>
      </div>
      <input
        className="search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="部品を検索"
        aria-label="部品を検索"
      />
      <div className="segmented-control" aria-label="部品カテゴリ">
        {categories.slice(0, 6).map((item) => (
          <button
            key={item}
            type="button"
            className={item === category ? 'active' : ''}
            onClick={() => setCategory(item)}
          >
            {item === ALL_LABEL ? ALL_LABEL : getCategoryLabel(item)}
          </button>
        ))}
      </div>
      <div className="part-list">
        {filteredParts.map((part) => (
          <article
            key={part.id}
            role="button"
            tabIndex={0}
            className={`part-card ${part.id === selectedNodeId ? 'selected' : ''}`}
            aria-label={`${part.title} を選択`}
            onClick={() => handleSelectPart(part.id)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') {
                return
              }

              event.preventDefault()
              handleSelectPart(part.id)
            }}
          >
            <span className="part-title">{part.title}</span>
            <span className="part-meta">
              <span className={`node-type-badge node-type-badge-${categoryToTone(part.category)}`}>
                {getCategoryLabel(part.category)}
              </span>{' '}
              /{' '}
              <span className={`node-role-chip-${agentRoleTone(part.agentRole)}`}>
                {part.agentRole ? agentRoleLabels[part.agentRole] : '未割当'}
              </span>
            </span>
            <span className="port-row">
              {part.inputTypes.map(formatDataTypeLabel).join(', ') || '開始'} から{' '}
              {part.outputTypes.map(formatDataTypeLabel).join(', ')}
            </span>
            <span className="part-card-actions">
              <button
                type="button"
                className="inline-mini-button"
                aria-label={`${part.title} をキャンバスに追加`}
                onClick={(event) => {
                  event.stopPropagation()
                  handleAddPart(part)
                }}
              >
                Add node
              </button>
            </span>
          </article>
        ))}
      </div>
      {operationNotice ? (
        <p className="parts-operation-notice" role="status">
          {operationNotice}
        </p>
      ) : null}
    </aside>
  )
}
