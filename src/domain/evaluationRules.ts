import type { Workflow, WorkflowArtifact } from './workflow'
import type { EvaluationCriterion, EvaluationResult, EvaluationStatus } from './evaluation'

function makeCriterion(
  id: string,
  label: string,
  description: string,
  score: number,
  maxScore: number,
  note?: string,
): EvaluationCriterion {
  return {
    id,
    label,
    description,
    score,
    maxScore,
    passed: score >= maxScore * 0.7,
    note,
  }
}

export function runMockEvaluation(
  workflow: Workflow,
  artifact: WorkflowArtifact,
  runId: string,
  checkOutcome: 'PASS' | 'REVIEW' | 'FAIL',
): EvaluationResult {
  const failedNodes = workflow.nodes.filter((n) => n.status === 'failed')
  const reviewNodes = workflow.nodes.filter((n) => n.status === 'review_required')
  const totalRetries = workflow.nodes.reduce((sum, n) => sum + (n.metrics?.retryCount ?? 0), 0)
  const hasArtifact = artifact.content.trim().length > 0 && artifact.status !== 'draft'

  // 仕様一致
  const specScore =
    checkOutcome === 'PASS' ? 20 : checkOutcome === 'REVIEW' ? 14 : 8
  const specNote =
    checkOutcome === 'REVIEW'
      ? '確認待ちノードがあるため一部減点'
      : checkOutcome === 'FAIL'
        ? '失敗ノードがあり仕様不一致の可能性があります'
        : undefined

  // 成果物の完全性
  const completenessScore = hasArtifact ? 20 : artifact.status === 'draft' ? 10 : 14
  const completenessNote = !hasArtifact ? '成果物が下書き状態または空です' : undefined

  // エラー状態の有無
  const errorScore = failedNodes.length === 0 ? 15 : Math.max(0, 15 - failedNodes.length * 5)
  const errorNote =
    failedNodes.length > 0
      ? `失敗ノード: ${failedNodes.map((n) => n.title).join(', ')}`
      : undefined

  // 確認待ちの有無
  const reviewScore =
    reviewNodes.length === 0 ? 15 : Math.max(0, 15 - reviewNodes.length * 5)
  const reviewNote =
    reviewNodes.length > 0
      ? `確認待ちノード: ${reviewNodes.map((n) => n.title).join(', ')}`
      : undefined

  // 再試行候補の有無
  const retryScore = totalRetries === 0 ? 10 : Math.max(0, 10 - totalRetries * 2)
  const retryNote = totalRetries > 0 ? `再試行回数合計: ${totalRetries}` : undefined

  // 日本語UI方針
  const langScore = 10

  // 再利用可能性
  const reusabilityScore = checkOutcome === 'PASS' ? 10 : 6

  const criteria: EvaluationCriterion[] = [
    makeCriterion('spec', '仕様一致', '期待する出力と仕様に合致しているか', specScore, 20, specNote),
    makeCriterion(
      'completeness',
      '成果物の完全性',
      '成果物が完成状態にあるか',
      completenessScore,
      20,
      completenessNote,
    ),
    makeCriterion(
      'no_error',
      'エラー状態の有無',
      '実行中にエラーノードが発生していないか',
      errorScore,
      15,
      errorNote,
    ),
    makeCriterion(
      'no_review',
      '確認待ちの有無',
      '確認待ち状態のノードがないか',
      reviewScore,
      15,
      reviewNote,
    ),
    makeCriterion(
      'no_retry',
      '再試行候補の有無',
      '再試行が不要な安定した実行か',
      retryScore,
      10,
      retryNote,
    ),
    makeCriterion('lang', '日本語UI方針', 'UI文言が日本語化されているか', langScore, 10),
    makeCriterion(
      'reusability',
      '再利用可能性',
      '他のワークフローに転用しやすい構成か',
      reusabilityScore,
      10,
    ),
  ]

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0)
  const maxScore = criteria.reduce((sum, c) => sum + c.maxScore, 0)
  const pct = (totalScore / maxScore) * 100

  let status: EvaluationStatus
  if (pct >= 90) {
    status = 'passed'
  } else if (pct >= 70) {
    status = 'needs_review'
  } else {
    status = 'failed'
  }

  const summaryLines: string[] = []
  if (status === 'passed') {
    summaryLines.push('全項目が基準を満たしており、承認可能な成果物です。')
  } else if (status === 'needs_review') {
    summaryLines.push('一部の基準を下回っています。Human Review を推奨します。')
  } else {
    summaryLines.push('複数の基準が未達です。再作成または修正が必要です。')
  }
  if (failedNodes.length > 0) {
    summaryLines.push(`失敗ノードが ${failedNodes.length} 件あります。`)
  }
  if (reviewNodes.length > 0) {
    summaryLines.push(`確認待ちノードが ${reviewNodes.length} 件あります。`)
  }

  return {
    id: `eval-${Date.now()}`,
    runId,
    status,
    totalScore,
    maxScore,
    criteria,
    summary: summaryLines.join(' '),
    createdAt: new Date().toISOString(),
  }
}
