import { ViewportPortal } from '@xyflow/react'
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

  return (
    <ViewportPortal>
      <div className="workflow-group-layer" aria-hidden="true">
        {groups.map((group) => {
          const positions = group.nodeIds
            .map((nodeId) => nodesById.get(nodeId))
            .filter((node) => node !== undefined)
            .map((node) => scaleNodePosition(node.position))

          if (positions.length === 0) {
            return null
          }

          const minX = Math.min(...positions.map((position) => position.x))
          const minY = Math.min(...positions.map((position) => position.y))
          const maxX = Math.max(...positions.map((position) => position.x + NODE_WIDTH))
          const maxY = Math.max(...positions.map((position) => position.y + NODE_HEIGHT))

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
