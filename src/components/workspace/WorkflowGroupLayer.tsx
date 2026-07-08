import { useStore, ViewportPortal } from '@xyflow/react'
import type { WorkflowGroupView } from '../../domain/cognitiveHud'
import { scaleNodePosition } from '../../domain/reactFlowAdapter'
import type { Workflow } from '../../domain/workflow'

type WorkflowGroupLayerProps = {
  workflow: Workflow
  groups: WorkflowGroupView[]
}

const NODE_WIDTH = 260
const NODE_HEIGHT = 190
const GROUP_PADDING = 44

export function WorkflowGroupLayer({ workflow, groups }: WorkflowGroupLayerProps) {
  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]))
  // React Flow measures each node's real rendered size (ResizeObserver-backed);
  // zoom-mode toggles node content (overview/map vs. detail/deep), so the group
  // frame must track the measured size instead of the fixed NODE_WIDTH/HEIGHT
  // fallback, or an expanded card can overflow the frame.
  const measuredById = useStore((state) => state.nodeLookup)

  return (
    <ViewportPortal>
      <div className="workflow-group-layer" aria-hidden="true">
        {groups.map((group) => {
          const sizedPositions = group.nodeIds
            .map((nodeId) => nodesById.get(nodeId))
            .filter((node): node is NonNullable<typeof node> => node !== undefined)
            .map((node) => {
              const measured = measuredById?.get(node.id)?.measured
              return {
                position: scaleNodePosition(node.position),
                width: measured?.width ?? NODE_WIDTH,
                height: measured?.height ?? NODE_HEIGHT,
              }
            })

          if (sizedPositions.length === 0) {
            return null
          }

          const minX = Math.min(...sizedPositions.map(({ position }) => position.x))
          const minY = Math.min(...sizedPositions.map(({ position }) => position.y))
          const maxX = Math.max(...sizedPositions.map(({ position, width }) => position.x + width))
          const maxY = Math.max(...sizedPositions.map(({ position, height }) => position.y + height))

          return (
            <section
              key={group.id}
              className={`workflow-group workflow-group-${group.tone}`}
              style={{
                left: minX - GROUP_PADDING,
                top: minY - GROUP_PADDING,
                width: maxX - minX + GROUP_PADDING * 2,
                height: maxY - minY + GROUP_PADDING * 2,
              }}
            >
              <span>{group.title}</span>
            </section>
          )
        })}
      </div>
    </ViewportPortal>
  )
}
