import type { EvaluationCriterion, EvaluationResult, EvaluationStatus } from './evaluation'
import type { ExecutionGraph } from './executionGraph'
import type { Workflow } from './workflow'

const PASS_THRESHOLD = 90
const REVIEW_THRESHOLD = 70

function pct(score: number, max: number): number {
  return max === 0 ? 100 : Math.round((score / max) * 100)
}

export function runLocalEvaluation(
  workflow: Workflow,
  executionGraph: ExecutionGraph | null,
  runId: string,
): EvaluationResult {
  const now = new Date().toISOString()
  const id = `eval-${runId}-${Date.now()}`

  const completedNodes = workflow.nodes.filter((node) => node.status === 'success')
  const failedNodes = workflow.nodes.filter((node) => node.status === 'failed')
  const reviewNodes = workflow.nodes.filter((node) => node.status === 'review_required')
  const retryCandidates = executionGraph?.retryCandidates ?? []
  const hasJapaneseContent =
    workflow.artifact.content.includes('実行') ||
    workflow.artifact.content.includes('成果物') ||
    workflow.artifact.content.includes('ローカル')
  const hasArtifactContent = workflow.artifact.content.length > 30

  const criteria: EvaluationCriterion[] = [
    {
      id: 'spec_match',
      label: '仕様一致',
      description: '成果物がワークフロー仕様に従って生成されているか',
      score: completedNodes.length > 0 ? 15 : 0,
      maxScore: 15,
      passed: completedNodes.length > 0,
      note:
        completedNodes.length > 0
          ? `${completedNodes.length} ノードが正常完了`
          : 'ノードが完了していません',
    },
    {
      id: 'artifact_completeness',
      label: '成果物完全性',
      description: '成果物が意味のある内容を持っているか',
      score: hasArtifactContent ? 20 : 5,
      maxScore: 20,
      passed: hasArtifactContent,
      note: hasArtifactContent ? '成果物コンテンツあり' : '成果物コンテンツが不十分です',
    },
    {
      id: 'no_errors',
      label: 'エラー有無',
      description: '失敗ノードがないか',
      score: failedNodes.length === 0 ? 20 : Math.max(0, 20 - failedNodes.length * 10),
      maxScore: 20,
      passed: failedNodes.length === 0,
      note:
        failedNodes.length === 0
          ? 'エラーなし'
          : `失敗ノード: ${failedNodes.map((node) => node.title).join(', ')}`,
    },
    {
      id: 'no_review_pending',
      label: '確認待ち有無',
      description: '未解決の確認待ちがないか',
      score: reviewNodes.length === 0 ? 15 : 5,
      maxScore: 15,
      passed: reviewNodes.length === 0,
      note: reviewNodes.length === 0 ? '確認待ちなし' : `確認待ち: ${reviewNodes.length} 件`,
    },
    {
      id: 'retry_candidates',
      label: '再試行候補',
      description: '再試行候補がないか',
      score: retryCandidates.length === 0 ? 10 : Math.max(0, 10 - retryCandidates.length * 5),
      maxScore: 10,
      passed: retryCandidates.length === 0,
      note:
        retryCandidates.length === 0
          ? '再試行候補なし'
          : `再試行候補: ${retryCandidates.length} 件`,
    },
    {
      id: 'japanese_ui',
      label: '日本語UI',
      description: '成果物のコンテンツが日本語優先になっているか',
      score: hasJapaneseContent ? 10 : 0,
      maxScore: 10,
      passed: hasJapaneseContent,
      note: hasJapaneseContent ? '日本語コンテンツあり' : '日本語コンテンツが検出されませんでした',
    },
    {
      id: 'reusability',
      label: '再利用性',
      description: 'ワークフローが再実行可能な状態か',
      score: workflow.nodes.length > 0 ? 10 : 0,
      maxScore: 10,
      passed: workflow.nodes.length > 0,
      note: `${workflow.nodes.length} ノード定義あり`,
    },
  ]

  const totalScore = criteria.reduce((sum, criterion) => sum + criterion.score, 0)
  const maxScore = criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0)
  const percentage = pct(totalScore, maxScore)

  let status: EvaluationStatus
  if (percentage >= PASS_THRESHOLD) {
    status = 'passed'
  } else if (percentage >= REVIEW_THRESHOLD) {
    status = 'needs_review'
  } else {
    status = 'failed'
  }

  const summary =
    status === 'passed'
      ? `評価スコア ${percentage}% — 全基準をクリアしました。`
      : status === 'needs_review'
        ? `評価スコア ${percentage}% — 一部基準に要確認項目があります。`
        : `評価スコア ${percentage}% — 品質基準を満たしていません。再作成を検討してください。`

  return {
    id,
    runId,
    status,
    totalScore,
    maxScore,
    criteria,
    summary,
    createdAt: now,
  }
}
