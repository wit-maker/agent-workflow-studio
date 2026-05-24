import {
  artifactStatusLabels,
  metricLabels,
  statusLabels,
} from '../domain/displayLabels'
import type { ArtifactVersion, EvaluationResult, HumanReviewState, RebuildRequest, ReviewDecision } from '../domain/evaluation'
import type { ExecutionGraph } from '../domain/executionGraph'
import type { ConnectorJob } from '../domain/connectorQueue'
import type { Workflow } from '../domain/workflow'
import type { AppSettings } from '../storage/localAppSettings'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'
import type { SavedWorkflowSnapshot } from '../storage/localWorkflowHistory'
import { selectActiveQueueNodes, selectBottleneckNode } from '../state/workflowSelectors'
import { AgentConnectorPanel } from './AgentConnectorPanel'
import { ArtifactVersionHistory } from './ArtifactVersionHistory'
import { ConnectorQueuePanel } from './ConnectorQueuePanel'
import { ConnectorRoadmapPanel } from './ConnectorRoadmapPanel'
import { CredentialBoundaryPanel } from './CredentialBoundaryPanel'
import { ImportExportPanel } from './ImportExportPanel'
import { PersistencePanel } from './PersistencePanel'
import { StorageBoundaryPanel } from './StorageBoundaryPanel'
import { EvaluationPanel } from './EvaluationPanel'
import { ExecutionGraphPanel } from './ExecutionGraphPanel'
import { HumanReviewPanel } from './HumanReviewPanel'
import { RebuildPanel } from './RebuildPanel'
import { TemplateLibrary } from './TemplateLibrary'
import { WorkflowHistoryPanel } from './WorkflowHistoryPanel'

type BottomMonitorProps = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: ConnectorJob[]
  onRetryConnectorJob: (jobId: string) => void
  onMarkConnectorJobReviewed: (jobId: string) => void
  onSkipConnectorJob: (jobId: string) => void
  onCancelConnectorJob: (jobId: string) => void
  templates: SavedWorkflowTemplate[]
  snapshots: SavedWorkflowSnapshot[]
  onSaveTemplate: (input: {
    name: string
    description: string
    tags: string[]
    category?: string
  }) => SavedWorkflowTemplate
  onLoadTemplate: (id: string) => void
  onDuplicateTemplate: (id: string) => SavedWorkflowTemplate | null
  onDeleteTemplate: (id: string) => void
  onSaveSnapshot: () => void
  onLoadSnapshot: (id: string) => void
  onDeleteSnapshot: (id: string) => void
  onRetryExecutionStep: (stepId: string) => void
  onApproveReviewStep: (stepId: string) => void
  onReturnReviewStep: (stepId: string) => void
  onSkipReviewStep: (stepId: string) => void
  evaluation: EvaluationResult | undefined
  humanReview: HumanReviewState | undefined
  rebuildRequests: RebuildRequest[]
  artifactVersions: ArtifactVersion[]
  selectedArtifactVersionId: string | undefined
  canEvaluate: boolean
  isEvaluating: boolean
  onEvaluate: () => void
  onHumanReviewDecide: (decision: ReviewDecision, note: string) => void
  onRequestRebuild: (reason: string, instruction: string) => void
  onStartRebuild: (requestId: string) => void
  onCancelRebuild: (requestId: string) => void
  onSelectArtifactVersion: (versionId: string) => void
  onResetStorage: () => void
  settings: AppSettings
  onChangeActiveTab: (tab: string) => void
  onImportBundle: (bundle: {
    workflow: Workflow
    templates: import('../storage/localTemplates').SavedWorkflowTemplate[]
    settings?: AppSettings
  }) => void
}

type MonitorTab =
  | 'Logs'
  | 'Metrics'
  | 'Queue'
  | 'Output'
  | 'Execution'
  | 'Evaluation'
  | 'Agent'
  | 'Storage'
  | 'Roadmap'

function normalizeMonitorTab(value: string): MonitorTab {
  const validTabs: MonitorTab[] = [
    'Logs',
    'Metrics',
    'Queue',
    'Output',
    'Execution',
    'Evaluation',
    'Agent',
    'Storage',
    'Roadmap',
  ]

  return validTabs.includes(value as MonitorTab) ? (value as MonitorTab) : 'Logs'
}

export function BottomMonitor({
  workflow,
  executionGraph,
  connectorJobs,
  onRetryConnectorJob,
  onMarkConnectorJobReviewed,
  onSkipConnectorJob,
  onCancelConnectorJob,
  templates,
  snapshots,
  onSaveTemplate,
  onLoadTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  onRetryExecutionStep,
  onApproveReviewStep,
  onReturnReviewStep,
  onSkipReviewStep,
  evaluation,
  humanReview,
  rebuildRequests,
  artifactVersions,
  selectedArtifactVersionId,
  canEvaluate,
  isEvaluating,
  onEvaluate,
  onHumanReviewDecide,
  onRequestRebuild,
  onStartRebuild,
  onCancelRebuild,
  onSelectArtifactVersion,
  onResetStorage,
  settings,
  onChangeActiveTab,
  onImportBundle,
}: BottomMonitorProps) {
  const activeTab = normalizeMonitorTab(settings.activeTab)

  const tabLabels = {
    Logs: 'ログ',
    Metrics: 'メトリクス',
    Queue: 'キュー',
    Output: '出力',
    Execution: '実行グラフ',
    Evaluation: '評価',
    Agent: 'エージェント',
    Storage: 'ストレージ',
    Roadmap: 'Roadmap',
  } as const

  const bottleneck = selectBottleneckNode(workflow)
  const queueNodes = selectActiveQueueNodes(workflow)
  const reviewSteps =
    executionGraph?.steps.filter((step) => step.status === 'review_required') ?? []
  const retrySteps =
    executionGraph?.steps.filter((step) =>
      executionGraph.retryCandidates.includes(step.id),
    ) ?? []

  return (
    <footer className="bottom-monitor" aria-label="メトリクスとログ">
      <section className="monitor-tabs">
        {(['Logs', 'Metrics', 'Queue', 'Output', 'Execution', 'Evaluation', 'Agent', 'Storage', 'Roadmap'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => onChangeActiveTab(tab)}
          >
            {tabLabels[tab]}
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
          <div className="queue-panel">
            <section className="queue-action-card">
              <h4>コネクタージョブキュー</h4>
              <ConnectorQueuePanel
                jobs={connectorJobs}
                onRetryJob={onRetryConnectorJob}
                onMarkJobReviewed={onMarkConnectorJobReviewed}
                onSkipJob={onSkipConnectorJob}
                onCancelJob={onCancelConnectorJob}
              />
            </section>

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

            <div className="queue-actions-grid">
              <section className="queue-action-card">
                <h4>確認待ち</h4>
                {reviewSteps.length === 0 ? (
                  <p className="muted">確認待ちのステップはありません。</p>
                ) : (
                  reviewSteps.map((step) => (
                    <div key={step.id} className="queue-action-row">
                      <div>
                        <strong>{step.nodeTitle}</strong>
                        <span>{step.message ?? '確認待ちで停止しています。'}</span>
                      </div>
                      <div className="queue-action-buttons">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => onApproveReviewStep(step.id)}
                        >
                          承認して続行
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => onReturnReviewStep(step.id)}
                        >
                          差し戻し
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => onSkipReviewStep(step.id)}
                        >
                          スキップ
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section className="queue-action-card">
                <h4>再試行候補</h4>
                {retrySteps.length === 0 ? (
                  <p className="muted">再試行候補はありません。</p>
                ) : (
                  retrySteps.map((step) => (
                    <div key={step.id} className="queue-action-row">
                      <div>
                        <strong>{step.nodeTitle}</strong>
                        <span>{step.error ?? step.message ?? '再試行可能です。'}</span>
                      </div>
                      <div className="queue-action-buttons">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => onRetryExecutionStep(step.id)}
                        >
                          再試行
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'Output' ? (
          <div className="output-summary">
            <h3>{workflow.artifact.title}</h3>
            <p>状態: {artifactStatusLabels[workflow.artifact.status]}</p>
            <p>形式: {workflow.artifact.format}</p>
            <p>{workflow.artifact.content.slice(0, 260)}</p>
            <div className="library-grid">
              <TemplateLibrary
                templates={templates}
                currentWorkflowName={workflow.name}
                currentWorkflowDescription={workflow.description}
                onSaveTemplate={onSaveTemplate}
                onLoadTemplate={onLoadTemplate}
                onDuplicateTemplate={onDuplicateTemplate}
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

        {activeTab === 'Execution' ? (
          <div className="execution-tab-panel">
            <ExecutionGraphPanel executionGraph={executionGraph} />
          </div>
        ) : null}

        {activeTab === 'Evaluation' ? (
          <div className="evaluation-tab-panel">
            <EvaluationPanel
              evaluation={evaluation}
              canEvaluate={canEvaluate}
              isEvaluating={isEvaluating}
              onEvaluate={onEvaluate}
            />
            <HumanReviewPanel
              evaluation={evaluation}
              humanReview={humanReview}
              onDecide={onHumanReviewDecide}
              onRequestRebuild={onRequestRebuild}
            />
            <div className="eval-lower-panels">
              <RebuildPanel
                rebuildRequests={rebuildRequests}
                onStartRebuild={onStartRebuild}
                onCancelRebuild={onCancelRebuild}
              />
              <ArtifactVersionHistory
                versions={artifactVersions}
                selectedVersionId={selectedArtifactVersionId}
                onSelectVersion={onSelectArtifactVersion}
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'Agent' ? (
          <div className="agent-tab-panel">
            <AgentConnectorPanel />
            <CredentialBoundaryPanel />
          </div>
        ) : null}

        {activeTab === 'Storage' ? (
          <div className="storage-tab-panel">
            <StorageBoundaryPanel />
            <ImportExportPanel
              workflow={workflow}
              templates={templates}
              settings={settings}
              onImportBundle={onImportBundle}
            />
            <PersistencePanel onResetStorage={onResetStorage} />
          </div>
        ) : null}

        {activeTab === 'Roadmap' ? (
          <div className="roadmap-tab-panel">
            <ConnectorRoadmapPanel />
          </div>
        ) : null}
      </section>
    </footer>
  )
}
