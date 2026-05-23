import type { Workflow } from '../domain/workflow'

type BottomMonitorProps = {
  workflow: Workflow
}

export function BottomMonitor({ workflow }: BottomMonitorProps) {
  const bottleneck = workflow.nodes.find(
    (node) => node.id === workflow.metrics.bottleneckNodeId,
  )

  return (
    <footer className="bottom-monitor" aria-label="Metrics and logs">
      <section className="metric-strip">
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
          <span>Bottleneck</span>
          <strong>{bottleneck?.title ?? 'None'}</strong>
        </div>
      </section>
      <section className="log-panel">
        <div className="timeline">
          {workflow.nodes.map((node) => (
            <span key={node.id} className={`timeline-dot timeline-${node.status}`}>
              {node.title}
            </span>
          ))}
        </div>
        <div className="log-list">
          {workflow.logs.length === 0 ? (
            <p className="muted">Run logs will appear here after the local mock run.</p>
          ) : (
            workflow.logs.slice(-8).map((log) => (
              <p key={log.id} className={`log-${log.level}`}>
                <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                {log.message}
              </p>
            ))
          )}
        </div>
      </section>
    </footer>
  )
}
