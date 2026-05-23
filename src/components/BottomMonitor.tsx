import { useState } from 'react'
import type { Workflow } from '../domain/workflow'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'
import type { SavedWorkflowSnapshot } from '../storage/localWorkflowHistory'
import { selectActiveQueueNodes, selectBottleneckNode } from '../state/workflowSelectors'
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
}

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
}: BottomMonitorProps) {
  const [activeTab, setActiveTab] = useState<'Logs' | 'Metrics' | 'Queue' | 'Output'>('Logs')
  const bottleneck = selectBottleneckNode(workflow)
  const queueNodes = selectActiveQueueNodes(workflow)

  return (
    <footer className="bottom-monitor" aria-label="Metrics and logs">
      <section className="monitor-tabs">
        {(['Logs', 'Metrics', 'Queue', 'Output'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
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
              <p className="muted">Run logs will appear here after the local mock run.</p>
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
              <span>Tokens</span>
              <strong>{workflow.metrics.tokens.toLocaleString()}</strong>
            </div>
            <div>
              <span>Cost</span>
              <strong>${workflow.metrics.cost.toFixed(3)}</strong>
            </div>
            <div>
              <span>Latency</span>
              <strong>{workflow.metrics.latencyMs} ms</strong>
            </div>
            <div>
              <span>Success</span>
              <strong>{workflow.metrics.successRate}%</strong>
            </div>
            <div>
              <span>Retry Count</span>
              <strong>{workflow.metrics.retryCount}</strong>
            </div>
            <div>
              <span>Bottleneck</span>
              <strong>{bottleneck?.title ?? 'None'}</strong>
            </div>
          </div>
        ) : null}
        {activeTab === 'Queue' ? (
          <div className="queue-list">
            {queueNodes.length === 0 ? (
              <p className="muted">No queued, running, failed, or review nodes.</p>
            ) : (
              queueNodes.map((node) => (
                <p key={node.id}>
                  <strong>{node.title}</strong>
                  <span>{node.status}</span>
                </p>
              ))
            )}
          </div>
        ) : null}
        {activeTab === 'Output' ? (
          <div className="output-summary">
            <h3>{workflow.artifact.title}</h3>
            <p>Status: {workflow.artifact.status}</p>
            <p>Format: {workflow.artifact.format}</p>
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
      </section>
    </footer>
  )
}
