import { useMemo, useState } from 'react'
import { agentRoleLabels, formatDataTypeLabel, nodeCategoryLabels } from '../domain/displayLabels'
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
          <button
            key={part.id}
            type="button"
            className={`part-card ${part.id === selectedNodeId ? 'selected' : ''}`}
            onClick={() => onSelectNode(part.id)}
          >
            <span className="part-title">{part.title}</span>
            <span className="part-meta">
              {getCategoryLabel(part.category)} / {part.agentRole ? agentRoleLabels[part.agentRole] : '未割当'}
            </span>
            <span className="port-row">
              {part.inputTypes.map(formatDataTypeLabel).join(', ') || '開始'} から{' '}
              {part.outputTypes.map(formatDataTypeLabel).join(', ')}
            </span>
            <span className="part-card-actions">
              <span
                role="button"
                tabIndex={0}
                className="inline-mini-button"
                onClick={(event) => {
                  event.stopPropagation()
                  onAddNode(part)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return
                  }

                  event.preventDefault()
                  event.stopPropagation()
                  onAddNode(part)
                }}
              >
                Add node
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
