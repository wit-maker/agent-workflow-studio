import { useState, type ReactNode } from 'react'

/*
 * DetailDrawerDock
 *
 * Bottom region — issue #34 redesign.
 *
 * Demotes the previous BottomMonitor from "main authoring surface" to a
 * collapsible Detail Dock. The existing BottomMonitor (with all its tabs)
 * is passed in as a child, but the dock itself is responsible for the
 * collapse / expand affordance so the bottom area no longer dominates
 * the workspace.
 *
 * Per Issue #34 / Issue #31: the tabs INSIDE the dock (認知HUD,
 * ブリーフィング, 実行詳細, etc.) are Detail Surfaces, NOT the cognitive
 * HUD or situation-assistant proper. Those concept-layer entry points
 * live in the right panel and the overlay layer.
 */

type DetailDrawerDockProps = {
  children: ReactNode
  initiallyCollapsed?: boolean
}

export function DetailDrawerDock({
  children,
  initiallyCollapsed = false,
}: DetailDrawerDockProps) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)

  return (
    <section
      className={`detail-drawer-dock ${collapsed ? 'collapsed' : 'expanded'}`}
      aria-label="詳細ドロワー"
    >
      <header className="detail-drawer-dock-header">
        <div className="detail-drawer-dock-title">
          <span className="eyebrow">Detail Drawers</span>
          <strong>詳細確認領域</strong>
          <span className="muted">
            （HUD Summary / Log / Metrics / Queue / Output / Run Detail / Briefing / Roadmap / Storage はここに格下げ）
          </span>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          {collapsed ? '詳細を開く' : '詳細を閉じる'}
        </button>
      </header>
      {collapsed ? null : <div className="detail-drawer-dock-body">{children}</div>}
    </section>
  )
}
