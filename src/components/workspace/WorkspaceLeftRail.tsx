import { useState } from 'react'
import { PartsPalette } from '../PartsPalette'
import type { WorkflowNode } from '../../domain/workflow'

/*
 * WorkspaceLeftRail
 *
 * Left region — issue #34 redesign.
 *
 * Three intended sections per Issue #34:
 *   - Components: re-uses the existing PartsPalette
 *   - Workflow Library: scaffold tab (existing TemplateLibrary still
 *     reachable from the Detail Drawer until promoted here)
 *   - Templates: scaffold tab (same — surface stays read-only WIP)
 *
 * This phase keeps Components fully wired and the other two as marked
 * placeholders so the structure is in place for follow-up phases without
 * duplicating storage or template logic.
 */

type LeftRailTab = 'components' | 'library' | 'templates'

type WorkspaceLeftRailProps = {
  parts: WorkflowNode[]
  selectedNodeId: string
  onSelectNode: (nodeId: string) => void
  onAddNode: (part: WorkflowNode) => void
}

export function WorkspaceLeftRail({
  parts,
  selectedNodeId,
  onSelectNode,
  onAddNode,
}: WorkspaceLeftRailProps) {
  const [tab, setTab] = useState<LeftRailTab>('components')

  return (
    <aside className="workspace-left-rail" aria-label="左レール">
      <nav className="left-rail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'components'}
          className={tab === 'components' ? 'active' : ''}
          onClick={() => setTab('components')}
        >
          部品
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'library'}
          className={tab === 'library' ? 'active' : ''}
          onClick={() => setTab('library')}
        >
          ワークフロー
          <span className="wip-badge" aria-label="未実装">WIP</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'templates'}
          className={tab === 'templates' ? 'active' : ''}
          onClick={() => setTab('templates')}
        >
          テンプレート
          <span className="wip-badge" aria-label="未実装">WIP</span>
        </button>
      </nav>

      <div className="left-rail-body">
        {tab === 'components' ? (
          <PartsPalette
            parts={parts}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onAddNode={onAddNode}
          />
        ) : null}
        {tab === 'library' ? (
          <div className="left-rail-placeholder">
            <p className="muted">
              ワークフローライブラリは次フェーズで Detail Drawer から昇格します。現状は
              「出力」 Detail Drawer 内の保存スナップショット一覧を参照してください。
            </p>
          </div>
        ) : null}
        {tab === 'templates' ? (
          <div className="left-rail-placeholder">
            <p className="muted">
              テンプレートタブは次フェーズで Detail Drawer から昇格します。現状は
              「出力」 Detail Drawer 内のテンプレート一覧を参照してください。
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
