import { getInputPorts, getOutputPorts } from './portRules'
import type { ConnectionKind, Workflow } from './workflow'

// Scratch統合原則 第1・第2原則の操作フィードバック:
// 接続ドラッグ中に「どのポートなら嵌まるか」を session-only の
// safe projection として導出する。判定自体は呼び出し側から注入される
// shared validator (state/workflowSelectors の explainConnectionAttempt) を使い、
// このモジュールはロジックを複製しない。

export type SnapHandleType = 'source' | 'target'

export type SnapNodeRole = 'source' | 'compatible' | 'incompatible'

export type SnapPortState = {
  portId: string
  label: string
  compatible: boolean
  reason: string | null
}

export type ConnectionSnapAttempt = {
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
  kind: ConnectionKind
}

export type ConnectionSnapGuidance = {
  sourceNodeId: string
  sourcePortId: string
  handleType: SnapHandleType
  nodeRoles: Record<string, SnapNodeRole>
  portStates: Record<string, Record<string, SnapPortState>>
  compatiblePortCount: number
  compatibleNodeCount: number
  incompatibleNodeCount: number
  firstReason: string | null
  hudSummary: string
}

export function buildConnectionSnapGuidance(options: {
  workflow: Workflow
  source: { nodeId: string; portId: string | null | undefined; handleType: SnapHandleType }
  validateAttempt: (attempt: ConnectionSnapAttempt) => { valid: boolean; reason?: string | null }
}): ConnectionSnapGuidance | null {
  const { workflow, source, validateAttempt } = options
  if (!source.portId) {
    return null
  }
  const sourceNode = workflow.nodes.find((node) => node.id === source.nodeId)
  if (!sourceNode) {
    return null
  }

  const nodeRoles: Record<string, SnapNodeRole> = { [source.nodeId]: 'source' }
  const portStates: Record<string, Record<string, SnapPortState>> = {}
  let compatiblePortCount = 0
  let compatibleNodeCount = 0
  let incompatibleNodeCount = 0
  let firstReason: string | null = null

  for (const node of workflow.nodes) {
    if (node.id === source.nodeId) {
      continue
    }

    // source handle からのドラッグは相手の入力ポートへ、
    // target handle からのドラッグは相手の出力ポートから受ける。
    const candidatePorts = source.handleType === 'source' ? getInputPorts(node) : getOutputPorts(node)
    const nodePortStates: Record<string, SnapPortState> = {}
    let nodeHasCompatiblePort = false

    for (const port of candidatePorts) {
      const attempt: ConnectionSnapAttempt =
        source.handleType === 'source'
          ? {
              sourceNodeId: source.nodeId,
              sourcePortId: source.portId,
              targetNodeId: node.id,
              targetPortId: port.id,
              kind: 'data',
            }
          : {
              sourceNodeId: node.id,
              sourcePortId: port.id,
              targetNodeId: source.nodeId,
              targetPortId: source.portId,
              kind: 'data',
            }
      const result = validateAttempt(attempt)
      const reason = result.valid ? null : (result.reason ?? null)
      nodePortStates[port.id] = {
        portId: port.id,
        label: port.label,
        compatible: result.valid,
        reason,
      }
      if (result.valid) {
        nodeHasCompatiblePort = true
        compatiblePortCount += 1
      } else if (!firstReason && reason) {
        firstReason = reason
      }
    }

    portStates[node.id] = nodePortStates
    if (nodeHasCompatiblePort) {
      nodeRoles[node.id] = 'compatible'
      compatibleNodeCount += 1
    } else {
      nodeRoles[node.id] = 'incompatible'
      incompatibleNodeCount += 1
    }
  }

  return {
    sourceNodeId: source.nodeId,
    sourcePortId: source.portId,
    handleType: source.handleType,
    nodeRoles,
    portStates,
    compatiblePortCount,
    compatibleNodeCount,
    incompatibleNodeCount,
    firstReason,
    hudSummary: `snap誘導: 互換ポート ${compatiblePortCount} 件 / 互換ノード ${compatibleNodeCount} / 非互換ノード ${incompatibleNodeCount}`,
  }
}
