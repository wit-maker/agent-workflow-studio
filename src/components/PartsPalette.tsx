import { useMemo, useState } from 'react'
import { agentRoleLabels, type WorkflowNode } from '../domain/workflow'

type PartsPaletteProps = {
  parts: WorkflowNode[]
  selectedNodeId: string
  onSelectNode: (nodeId: string) => void
}

export function PartsPalette({ parts, selectedNodeId, onSelectNode }: PartsPaletteProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(parts.map((part) => part.category)))],
    [parts],
  )

  const filteredParts = parts.filter((part) => {
    const text = `${part.title} ${part.category} ${part.description}`.toLowerCase()
    return (
      (category === 'All' || part.category === category) &&
      text.includes(query.trim().toLowerCase())
    )
  })

  return (
    <aside className="parts-palette" aria-label="MVP parts palette">
      <div className="panel-heading">
        <span className="eyebrow">Parts</span>
        <h2>MVP Palette</h2>
      </div>
      <input
        className="search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search parts"
        aria-label="Search parts"
      />
      <div className="segmented-control" aria-label="Part categories">
        {categories.slice(0, 6).map((item) => (
          <button
            key={item}
            type="button"
            className={item === category ? 'active' : ''}
            onClick={() => setCategory(item)}
          >
            {item}
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
              {part.category} / {part.agentRole ? agentRoleLabels[part.agentRole] : 'Unassigned'}
            </span>
            <span className="port-row">
              {part.inputTypes.join(', ') || 'Start'} to {part.outputTypes.join(', ')}
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
