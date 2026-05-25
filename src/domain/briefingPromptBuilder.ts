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
    'あなたは AI ワークフローの状況アナリストです。',
    'Agent Workflow Studio の現在状態を日本語で短く説明してください。',
    '出力は What / Why / How / Next の 4 セクション構成にしてください。',
    '各セクションは 100 字以内を目安にし、Credential・API キー・個人情報・node.config・生 payload には触れないでください。',
    '',
    '# 収集モード',
    `- ${briefingInputModeLabels[input.mode]}`,
    '',
    '# ワークフロー状態',
    `- 名前: ${input.workflow.workflowName}`,
    `- ステータス: ${input.workflow.overallStatus}`,
    `- ノード数: ${input.workflow.nodeCount}`,
    `- 接続数: ${input.workflow.connectionCount}`,
    `- 失敗: ${statusCounts.failed} / 確認待ち: ${statusCounts.reviewRequired} / 停止: ${statusCounts.blocked} / 再試行候補: ${statusCounts.retryReady}`,
    '',
    '# 実行メトリクス',
    `- tokens: ${input.metrics.tokens}`,
    `- cost: ${input.metrics.cost.toFixed(3)}`,
    `- latencyMs: ${input.metrics.latencyMs}`,
    `- successRate: ${input.metrics.successRate}`,
    `- retryCount: ${input.metrics.retryCount}`,
    `- bottleneck: ${input.metrics.bottleneckNodeLabel ?? 'なし'}`,
    '',
    '# 実行グラフ',
    `- runId: ${input.execution.runId ?? 'なし'}`,
    `- stepCount: ${input.execution.stepCount}`,
    `- routeKinds: ${input.execution.routeKinds.join(', ') || 'なし'}`,
    '',
    '## ログ',
    formatLines(input.logEntries, '対象ログなし'),
    '',
    '## エラー・警告',
    formatLines(input.errorEntries, '重要なエラー・警告なし'),
    '',
    '## HUD シグナル',
    formatLines(input.hud.selectedSignals, '重要シグナルなし'),
    '',
    '## コネクター',
    formatLines(input.connectors.selectedEntries, '対象ジョブなし'),
    '',
    '## Run History',
    formatLines(input.runHistory.selectedRecords, '対象履歴なし'),
    '',
    `# 推定 severity: ${input.severity}`,
    `# 入力は${input.truncated ? '一部トリム済み' : '未トリム'}です`,
  ].join('\n')
}
