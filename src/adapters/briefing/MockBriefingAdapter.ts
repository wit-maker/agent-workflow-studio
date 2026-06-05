import type {
  BriefingInput,
  BriefingResult,
  BriefingSeverity,
} from '../../domain/briefing'
import { briefingInputModeLabels } from '../../domain/briefing'
import type { BriefingAdapter, BriefingGenerateRequest } from './BriefingAdapter'

const MOCK_DELAY_MS = 180

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

function truncateSentence(value: string, maxLength = 140): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`
}

function firstImportantEvidence(input: BriefingInput): string | null {
  return (
    input.runDetail.selectedEvidence.find(
      (evidence) =>
        evidence.includes('error') ||
        evidence.includes('warn') ||
        evidence.includes('failed') ||
        evidence.includes('review') ||
        evidence.includes('retry') ||
        evidence.includes('connector_error') ||
        evidence.includes('human_review'),
    ) ?? null
  )
}

function buildWhat(input: BriefingInput): string {
  const modeLabel = briefingInputModeLabels[input.mode]
  const nodeCount = input.workflow.nodeCount
  const review = input.workflow.statusCounts.reviewRequired
  const blocked = input.workflow.statusCounts.blocked
  const retry = input.execution.retryCandidates.length
  const logCount = input.logEntries.length
  const issueCount = input.errorEntries.length
  const evidenceCount = input.runDetail.selectedEvidence.length
  const historyCount = input.runHistory.selectedRecords.length

  if (input.severity === 'error') {
    return truncateSentence(
      `${modeLabel}では、参照ログ ${logCount} 件、重要根拠 ${issueCount} 件、step evidence ${evidenceCount} 件${historyCount > 0 ? `、履歴 ${historyCount} 件` : ''}から、失敗状態として扱う必要があります。`,
    )
  }

  if (input.severity === 'warn') {
    return truncateSentence(
      `${modeLabel}では、step evidence ${evidenceCount} 件を含む根拠から、確認待ち ${review} 件、停止 ${blocked} 件、再試行候補 ${retry} 件が見えています。`,
    )
  }

  return truncateSentence(
    `${modeLabel}では、参照ログ ${logCount} 件と step evidence ${evidenceCount} 件を見ても大きな問題はありません。${nodeCount} ノードは ${input.workflow.overallStatus} 状態です。`,
  )
}

function buildWhy(input: BriefingInput): string {
  const topEvidence = firstImportantEvidence(input)
  if (topEvidence) {
    return truncateSentence(
      `主な根拠は step-level evidence の「${topEvidence}」です。HUD は ${input.hud.priority} / ${input.hud.summary} を示しています。`,
    )
  }

  const topError = input.errorEntries[0]
  if (topError) {
    return truncateSentence(
      `主な根拠は「${topError}」です。HUD は ${input.hud.priority} / ${input.hud.summary} を示しています。`,
    )
  }

  if (input.connectors.reviewRequired > 0) {
    return truncateSentence(
      `connector job に確認待ちが ${input.connectors.reviewRequired} 件あり、HUD は ${input.hud.priority} を示しています。`,
    )
  }

  if (input.runHistory.selectedRecords[0]) {
    return truncateSentence(
      `参照履歴では「${input.runHistory.selectedRecords[0]}」があり、今回の判断材料に含まれています。`,
    )
  }

  if (input.runtimeReplay.latestSummary) {
    return truncateSentence(
      `runtime audit の最新イベントは「${input.runtimeReplay.latestSummary}」で、Run Detail の replay-ready timeline から確認できます。`,
    )
  }

  return truncateSentence(input.hud.summary)
}

function buildHow(input: BriefingInput): string {
  if (input.execution.retryCandidates.length > 0) {
    return truncateSentence(
      'キューまたは実行グラフで再試行候補を確認し、対象ノードを再実行できるか判断してください。',
    )
  }

  if (
    input.workflow.statusCounts.reviewRequired > 0 ||
    input.execution.reviewSteps.length > 0 ||
    input.connectors.reviewRequired > 0
  ) {
    return truncateSentence(
      '確認待ちの判断を先に行い、承認、差し戻し、スキップのどれで進めるかを決めてください。',
    )
  }

  if (input.severity === 'error') {
    return truncateSentence(
      'ログ、実行グラフ、step evidence を見て、失敗ノードまたは connector error の原因を切り分けてください。',
    )
  }

  if (input.hud.priority === 'watch' || input.hud.priority === 'alert') {
    return truncateSentence(input.hud.recommendedAction)
  }

  return '特別な対処は不要です。必要なら次の Run 条件だけを確認してください。'
}

function buildNext(input: BriefingInput): string {
  if (input.severity === 'error') {
    if (input.execution.retryCandidates[0]) {
      return truncateSentence(`最優先は ${input.execution.retryCandidates[0]} の再試行可否を判断することです。`)
    }

    if (input.execution.failedSteps[0]) {
      return truncateSentence(`最優先は ${input.execution.failedSteps[0]} の失敗理由を evidence とログで確認することです。`)
    }

    return '最優先は失敗ルートまたは connector error の原因確認です。'
  }

  if (input.severity === 'warn') {
    if (input.execution.reviewSteps[0]) {
      return truncateSentence(`最優先は ${input.execution.reviewSteps[0]} の確認待ち対応です。`)
    }

    return '最優先は確認待ち、停止中、再試行候補の有無を順に確認することです。'
  }

  return '次の Run を開始するか、成功パターンをテンプレート化して再利用準備を進めてください。'
}

function buildReplayCue(input: BriefingInput): string {
  const replay = input.runtimeReplay
  if (replay.eventCount === 0) {
    return 'runtime event はまだありません。Run 実行後に Run Detail の replay-ready timeline を確認してください。'
  }

  if (replay.reviewEventCount > 0) {
    return truncateSentence(
      `review route を含む runtime event が ${replay.reviewEventCount} 件あります。${replay.flowPressureLabel} として Human Review と Run Detail timeline を並べて確認してください。`,
      180,
    )
  }

  if (replay.errorEventCount > 0 || replay.warningEventCount > 0) {
    return truncateSentence(
      `runtime event は ${replay.eventCount} 件、warn ${replay.warningEventCount} / error ${replay.errorEventCount} / retry ${replay.retryEventCount} です。${replay.flowPressureSummary}`,
      180,
    )
  }

  return truncateSentence(
    `runtime event は ${replay.eventCount} 件です。${replay.flowPressureSummary} ${replay.templateHistoryHint}`,
    180,
  )
}

function normalizeSeverity(input: BriefingInput): BriefingSeverity {
  return input.severity
}

function buildVoiceScript(input: BriefingInput): string {
  if (input.severity === 'error') {
    return truncateSentence(
      `失敗状態を検出しました。HUDの優先度は ${input.hud.priority} です。まず失敗 step と retry 候補を確認してください。`,
      180,
    )
  }

  if (input.severity === 'warn') {
    return truncateSentence(
      `確認が必要な状態です。レビュー待ち、停止、再試行候補を順に確認し、次の判断を選んでください。`,
      180,
    )
  }

  return truncateSentence(
    `現在は大きな異常はありません。必要なら次の Run 条件とテンプレート候補を確認してください。`,
    180,
  )
}

function buildAvatarScript(input: BriefingInput): BriefingResult['avatarScript'] {
  const emotion = input.severity === 'error'
    ? 'urgent'
    : input.severity === 'warn'
      ? 'concerned'
      : 'calm'
  const gesture = input.severity === 'error'
    ? 'raise_warning'
    : input.severity === 'warn'
      ? 'point_to_focus'
      : 'standby'

  return {
    role: 'situation_officer',
    emotion,
    gesture,
    line: truncateSentence(buildNext(input), 140),
  }
}

function buildVisualTimeline(input: BriefingInput): BriefingResult['visualTimeline'] {
  const primaryNodeId =
    input.execution.failedSteps[0] ??
    input.execution.reviewSteps[0] ??
    input.execution.retryCandidates[0] ??
    input.workflow.visibleNodes[0] ??
    null

  return [
    {
      time: 0,
      highlightNodeId: input.workflow.visibleNodes[0] ?? primaryNodeId,
      caption: truncateSentence(`Workflow status is ${input.workflow.overallStatus}.`, 120),
    },
    {
      time: 3,
      highlightNodeId: primaryNodeId,
      caption: truncateSentence(input.hud.summary, 120),
    },
    {
      time: 6,
      highlightNodeId: primaryNodeId,
      caption: truncateSentence(buildNext(input), 120),
    },
  ]
}

function buildHumanDecisionPrompt(input: BriefingInput): string {
  if (input.execution.reviewSteps[0]) {
    return truncateSentence(`${input.execution.reviewSteps[0]} を Approve / Reject / Retry のどれで扱うか判断してください。`, 160)
  }

  if (input.execution.failedSteps[0]) {
    return truncateSentence(`${input.execution.failedSteps[0]} の失敗根拠を確認し、Retry か停止を選んでください。`, 160)
  }

  if (input.execution.retryCandidates[0]) {
    return truncateSentence(`${input.execution.retryCandidates[0]} を再試行するか、原因確認を優先するか判断してください。`, 160)
  }

  return '次の Run を開始するか、成功パターンをテンプレート化するか選んでください。'
}

export class MockBriefingAdapter implements BriefingAdapter {
  readonly name = 'mock'

  readonly isMock = true

  async generate(request: BriefingGenerateRequest): Promise<BriefingResult> {
    await wait(MOCK_DELAY_MS)

    return {
      what: buildWhat(request.input),
      why: buildWhy(request.input),
      how: buildHow(request.input),
      next: buildNext(request.input),
      replayCue: buildReplayCue(request.input),
      voiceScript: buildVoiceScript(request.input),
      avatarScript: buildAvatarScript(request.input),
      visualTimeline: buildVisualTimeline(request.input),
      humanDecisionPrompt: buildHumanDecisionPrompt(request.input),
      severity: normalizeSeverity(request.input),
      isMock: true,
      generatedAt: new Date().toISOString(),
    }
  }
}
