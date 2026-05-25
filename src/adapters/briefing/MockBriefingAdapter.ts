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

function normalizeSeverity(input: BriefingInput): BriefingSeverity {
  return input.severity
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
      severity: normalizeSeverity(request.input),
      isMock: true,
      generatedAt: new Date().toISOString(),
    }
  }
}
