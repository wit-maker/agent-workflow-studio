// 部品の自己記述性 — PartsPalette / NodeCard / ReactFlowNode の型バッジ・役割色を
// 単一のトーン規約に揃えるための共有マッピング。
// トーン語彙とその配色は既存の workflow-group フレーム (buildWorkflowGroups /
// .workflow-group-* CSS) と揃えており、グループ枠の縁取り色とノード上の
// バッジ色が一致するようにしている。

import type { AgentRole, NodeCategory } from './workflow'

export type NodeVisualTone = 'input' | 'transform' | 'execute' | 'check' | 'output'

const categoryToneMap: Record<NodeCategory, NodeVisualTone> = {
  trigger: 'input',
  input: 'input',
  transform: 'transform',
  branch: 'transform',
  execute: 'execute',
  check: 'check',
  aggregate: 'check',
  safety: 'check',
  hud: 'check',
  output: 'output',
  record: 'output',
  template: 'output',
  observe: 'output',
  improve: 'output',
}

export function categoryToTone(category: string): NodeVisualTone {
  return (categoryToneMap as Record<string, NodeVisualTone>)[category] ?? 'execute'
}

export type AgentRoleTone = NodeVisualTone | 'neutral'

const agentRoleToneMap: Record<AgentRole, AgentRoleTone> = {
  human: 'neutral',
  dev_leader_ai: 'execute',
  sub_leader_ai: 'execute',
  programmer_ai: 'transform',
  designer_ai: 'transform',
  research_ai: 'input',
  qa_ai: 'check',
  security_ai: 'check',
  recorder_ai: 'output',
  lightwork_ai: 'output',
}

export function agentRoleTone(role: AgentRole | undefined): AgentRoleTone {
  if (!role) {
    return 'neutral'
  }
  return agentRoleToneMap[role] ?? 'neutral'
}
