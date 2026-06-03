import { MockBriefingAdapter } from '../../adapters/briefing/MockBriefingAdapter'
import { useBriefingGenerator } from '../../hooks/useBriefingGenerator'
import type { HudSnapshot } from '../../domain/cognitiveHud'
import type { ConnectorJob } from '../../domain/connectorQueue'
import type { ExecutionGraph } from '../../domain/executionGraph'
import type { WorkflowRunRecord } from '../../domain/runHistory'
import type { Workflow } from '../../domain/workflow'
import { BriefingPanel } from '../BriefingPanel'

/*
 * AssistantPanel
 *
 * Right panel mode — issue #34 redesign.
 *
 * Wraps the existing BriefingPanel as the human-facing surface of the
 * situation-explanation layer. Per Issue #31, the situation assistant is
 * the human-role expression of the situation-explanation layer, and 4D
 * Text Briefing (What/Why/How/Next) is ONE output channel among many
 * (text / audio / avatar / video / next-action). The other channels are
 * intentionally not implemented and are tracked in docs.
 */

const briefingAdapter = new MockBriefingAdapter()

type AssistantPanelProps = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: ConnectorJob[]
  hudSnapshot: HudSnapshot
  runHistoryRecords: WorkflowRunRecord[]
}

export function AssistantPanel({
  workflow,
  executionGraph,
  connectorJobs,
  hudSnapshot,
  runHistoryRecords,
}: AssistantPanelProps) {
  const briefing = useBriefingGenerator({
    workflow,
    executionGraph,
    connectorJobs,
    hudSnapshot,
    runHistoryRecords,
    adapter: briefingAdapter,
  })

  return (
    <section className="assistant-panel" aria-label="状況補佐官">
      <header className="assistant-header">
        <span className="eyebrow">状況補佐官</span>
        <h3>状況説明レイヤー / 人間向け表現</h3>
        <p className="muted">
          4D Text Briefing は出力チャネルの 1 つです。音声台本 / アバター台本 / 動画ハイライト指示 / 次アクションは mock 出力として生成し、実レンダラーは将来チャネルとして扱います。
        </p>
      </header>
      <BriefingPanel
        state={briefing.state}
        onGenerate={briefing.generate}
        onInputModeChange={briefing.setInputMode}
      />
    </section>
  )
}
