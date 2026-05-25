import type { BriefingInput } from './briefing'
import { briefingInputModeLabels } from './briefing'

function formatLines(lines: readonly string[], emptyText: string): string {
  if (lines.length === 0) {
    return `- ${emptyText}`
  }

  return lines.map((line) => `- ${line}`).join('\n')
}

export function buildBriefingPrompt(input: BriefingInput): string {
  const statusCounts = input.workflow.statusCounts

  return [
    'あなたは Agent Workflow Studio の Situation Assistant です。',
    '現在のワークフロー状況を日本語で短く説明してください。',
    '出力は What / Why / How / Next の 4D 構造にしてください。',
    'credential、API key、token、password、node.config、raw payload、prompt body は扱わないでください。',
    '',
    '# Input Mode',
    `- ${briefingInputModeLabels[input.mode]}`,
    '',
    '# Workflow Summary',
    `- name: ${input.workflow.workflowName}`,
    `- status: ${input.workflow.overallStatus}`,
    `- nodes: ${input.workflow.nodeCount}`,
    `- connections: ${input.workflow.connectionCount}`,
    `- failed: ${statusCounts.failed} / review_required: ${statusCounts.reviewRequired} / blocked: ${statusCounts.blocked} / retry_ready: ${statusCounts.retryReady}`,
    '',
    '# Metrics',
    `- tokens: ${input.metrics.tokens}`,
    `- cost: ${input.metrics.cost.toFixed(3)}`,
    `- latencyMs: ${input.metrics.latencyMs}`,
    `- successRate: ${input.metrics.successRate}`,
    `- retryCount: ${input.metrics.retryCount}`,
    `- bottleneck: ${input.metrics.bottleneckNodeLabel ?? 'none'}`,
    '',
    '# Execution Graph',
    `- runId: ${input.execution.runId ?? 'none'}`,
    `- stepCount: ${input.execution.stepCount}`,
    `- routeKinds: ${input.execution.routeKinds.join(', ') || 'none'}`,
    '',
    '# Run Detail Evidence',
    `- evidenceCount: ${input.runDetail.evidenceCount}`,
    `- excludedEvidenceCount: ${input.runDetail.excludedEvidenceCount}`,
    formatLines(input.runDetail.selectedEvidence, '対象 evidence なし'),
    '',
    '# Safety Warnings',
    formatLines(input.runDetail.safetyWarnings, '安全警告なし'),
    '',
    '## Logs',
    formatLines(input.logEntries, '対象ログなし'),
    '',
    '## Errors / Warnings',
    formatLines(input.errorEntries, '重要なエラーまたは警告なし'),
    '',
    '## HUD Signals',
    formatLines(input.hud.selectedSignals, '重要シグナルなし'),
    '',
    '## Connectors',
    formatLines(input.connectors.selectedEntries, '対象ジョブなし'),
    '',
    '## Run History',
    formatLines(input.runHistory.selectedRecords, '対象履歴なし'),
    '',
    `# severity: ${input.severity}`,
    `# input: ${input.truncated ? 'truncated' : 'not truncated'}`,
  ].join('\n')
}
