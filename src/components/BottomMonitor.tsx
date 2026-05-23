import { useState } from 'react'
import {
  artifactStatusLabels,
  metricLabels,
  statusLabels,
} from '../domain/displayLabels'
import type { ArtifactVersion, EvaluationResult, HumanReviewState, RebuildRequest, ReviewDecision } from '../domain/evaluation'
import type { ExecutionGraph } from '../domain/executionGraph'
import type { Workflow } from '../domain/workflow'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'
import type { SavedWorkflowSnapshot } from '../storage/localWorkflowHistory'
import { selectActiveQueueNodes, selectBottleneckNode } from '../state/workflowSelectors'
import { ArtifactVersionHistory } from './ArtifactVersionHistory'
import { EvaluationPanel } from './EvaluationPanel'
import { ExecutionGraphPanel } from './ExecutionGraphPanel'
import { HumanReviewPanel } from './HumanReviewPanel'
import { RebuildPanel } from './RebuildPanel'
import { TemplateLibrary } from './TemplateLibrary'
import { WorkflowHistoryPanel } from './WorkflowHistoryPanel'

type BottomMonitorProps = {
  workflow: Workflow
  templates: SavedWorkflowTemplate[]
  snapshots: SavedWorkflowSnapshot[]
  onSaveTemplate: () => void
  onLoadTemplate: (id: string) => void
  onDeleteTemplate: (id: string) => void
  onSaveSnapshot: () => void
  onLoadSnapshot: (id: string) => void
  onDeleteSnapshot: (id: string) => void
  evaluation?: EvaluationResult
  humanReview?: HumanReviewState
  rebuildRequests: RebuildRequest[]
  artifactVersions: ArtifactVersion[]
  selectedArtifactVersionId?: string
  canEvaluate: boolean
  onEvaluate: () => void
  onHumanReviewDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
  onStartRebuild: (requestId: string) => void
  onCancelRebuild: (requestId: string) => void
  onSelectArtifactVersion: (versionId: string) => void
  executionGraph: ExecutionGraph | null
}

type Tab = 'Logs' | 'Metrics' | 'Queue' | 'Output' | 'Graph' | 'Evaluation'

export function BottomMonitor({
  workflow,
  templates,
  snapshots,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  evaluation,
  humanReview,
  rebuildRequests,
  artifactVersions,
  selectedArtifactVersionId,
  canEvaluate,
  onEvaluate,
  onHumanReviewDecide,
  onRequestRebuild,
  onStartRebuild,
  onCancelRebuild,
  onSelectArtifactVersion,
  executionGraph,
}: BottomMonitorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Logs')
  const tabLabels: Record<Tab, string> = {
    Logs: 'ログ',
    Metrics: 'メトリクス',
    Queue: 'キュー',
    Output: '出力',
    Graph: '実行グラフ',
    Evaluation: '評価',
  }
  const bottleneck = selectBottleneckNode(workflow)
  const queueNodes = selectActiveQueueNodes(workflow)

  return (
    <footer className="bottom-monitor" aria-label="メトリクスとログ">
      <section className="monitor-tabs">
        {(['Logs', 'Metrics', 'Queue', 'Output', 'Graph', 'Evaluation'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
            {tab === 'Evaluation' && evaluation && (
              <span className={`tab-badge tab-eval-${evaluation.status}`} />
            )}
          </button>
        ))}
        <div className="timeline">
          {workflow.nodes.map((node) => (
            <span key={node.id} className={`timeline-dot timeline-${node.status}`}>
              {node.title}
            </span>
          ))}
        </div>
      </section>
      <section className="monitor-panel">
        {activeTab === 'Logs' ? (
          <div className="log-list">
            {workflow.logs.length === 0 ? (
              <p className="muted">ローカルモック実行後にログがここへ表示されます。</p>
            ) : (
              workflow.logs.map((log) => (
                <p key={log.id} className={`log-${log.level}`}>
                  <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                  {log.message}
                </p>
              ))
            )}
          </div>
        ) : null}
        {activeTab === 'Metrics' ? (
          <div className="metric-strip">
            <div>
              <span>{metricLabels.tokens}</span>
              <strong>{workflow.metrics.tokens.toLocaleString()}</strong>
            </div>
            <div>
              <span>{metricLabels.cost}</span>
              <strong>${workflow.metrics.cost.toFixed(3)}</strong>
            </div>
            <div>
              <span>{metricLabels.latencyMs}</span>
              <strong>{workflow.metrics.latencyMs} ms</strong>
            </div>
            <div>
              <span>{metricLabels.successRate}</span>
              <strong>{workflow.metrics.successRate}%</strong>
            </div>
            <div>
              <span>{metricLabels.retryCount}</span>
              <strong>{workflow.metrics.retryCount}</strong>
            </div>
            <div>
              <span>{metricLabels.bottleneck}</span>
              <strong>{bottleneck?.title ?? 'なし'}</strong>
            </div>
          </div>
        ) : null}
        {activeTab === 'Queue' ? (
          <div className="queue-list">
            {queueNodes.length === 0 ? (
              <p className="muted">待機列・実行中・失敗・確認待ちのノードはありません。</p>
            ) : (
              queueNodes.map((node) => (
                <p key={node.id}>
                  <strong>{node.title}</strong>
                  <span>{statusLabels[node.status]}</span>
                </p>
              ))
            )}
          </div>
        ) : null}
        {activeTab === 'Output' ? (
          <div className="output-summary">
            <h3>{workflow.artifact.title}</h3>
            <p>状態: {artifactStatusLabels[workflow.artifact.status]}</p>
            <p>形式: {workflow.artifact.format}</p>
            <p>{workflow.artifact.content.slice(0, 220)}</p>
            <div className="library-grid">
              <TemplateLibrary
                templates={templates}
                onSaveTemplate={onSaveTemplate}
                onLoadTemplate={onLoadTemplate}
                onDeleteTemplate={onDeleteTemplate}
              />
              <WorkflowHistoryPanel
                snapshots={snapshots}
                onSaveSnapshot={onSaveSnapshot}
                onLoadSnapshot={onLoadSnapshot}
                onDeleteSnapshot={onDeleteSnapshot}
              />
            </div>
          </div>
        ) : null}
        {activeTab === 'Graph' ? (
          <div className="execution-graph-tab">
            <ExecutionGraphPanel executionGraph={executionGraph} />
          </div>
        ) : null}
        {activeTab === 'Evaluation' ? (
          <div className="evaluation-tab">
            <EvaluationPanel
              evaluation={evaluation}
              canEvaluate={canEvaluate}
              onEvaluate={onEvaluate}
            />
            <HumanReviewPanel
              humanReview={humanReview}
              evaluation={evaluation}
              onDecide={onHumanReviewDecide}
              onRequestRebuild={onRequestRebuild}
            />
            <RebuildPanel
              rebuildRequests={rebuildRequests}
              onStartRebuild={onStartRebuild}
              onCancelRebuild={onCancelRebuild}
            />
            <ArtifactVersionHistory
              versions={artifactVersions}
              selectedVersionId={selectedArtifactVersionId}
              evaluation={evaluation}
              onSelectVersion={onSelectArtifactVersion}
            />
          </div>
        ) : null}
      </section>
    </footer>
  )
}
