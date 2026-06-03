import { useState, useMemo } from 'react'
import type {
  RunDetailComparisonView,
  RunDetailDiffRow,
  RunDetailFocusTarget,
  RunDetailMode,
  RunDetailRuntimeTimelineView,
  RunDetailScopedDiffView,
  RunDetailStepEvidenceDiffGroup,
  RunDetailSummary,
  StepEvidenceSummary,
} from '../domain/runDetail'
import {
  buildRunComparisonView,
  buildRunDetailReplayView,
  buildRunDetailRuntimeTimelineView,
  summarizeRunDetail,
} from '../domain/runDetail'
import type { WorkflowRunRecord } from '../domain/runHistory'
import type { EvidenceSeverity } from '../domain/runStepEvidence'
import type { RunTrace } from '../domain/runTrace'
import type { WorkflowConnection } from '../domain/workflow'

const modeLabels: Record<RunDetailMode, string> = {
  all: '全証拠',
  'latest-run': '最新 Run のみ',
  'errors-only': 'エラーのみ',
}

const severityLabels: Record<EvidenceSeverity, string> = {
  info: 'info',
  warn: 'warn',
  error: 'error',
}

type RunDetailPanelProps = {
  runTrace: RunTrace | null
  runHistoryRecords: WorkflowRunRecord[]
  connections: WorkflowConnection[]
  selectedRunId: string | null
  focusedNodeId?: string | null
  focusedConnectionId?: string | null
  onSelectRunId: (runId: string | null) => void
  onSelectNode: (nodeId: string) => void
  onSelectConnection: (connectionId: string | null) => void
}

export function RunDetailPanel({
  runTrace,
  runHistoryRecords,
  connections,
  selectedRunId,
  focusedNodeId,
  focusedConnectionId,
  onSelectRunId,
  onSelectNode,
  onSelectConnection,
}: RunDetailPanelProps) {
  const [mode, setMode] = useState<RunDetailMode>('all')
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareLeftRunId, setCompareLeftRunId] = useState<string | null>(null)
  const [compareRightRunId, setCompareRightRunId] = useState<string | null>(null)
  const replay = useMemo(
    () =>
      buildRunDetailReplayView({
        currentTrace: runTrace,
        runHistoryRecords,
        selectedRunId,
        focusNodeId: focusedNodeId,
        focusConnectionId: focusedConnectionId,
        connections,
      }),
    [connections, focusedConnectionId, focusedNodeId, runHistoryRecords, runTrace, selectedRunId],
  )
  const comparison = useMemo(
    () =>
      buildRunComparisonView({
        runHistoryRecords,
        leftRunId: compareLeftRunId ?? (replay.selectedSource === 'run-history' ? replay.selectedRunId : null),
        rightRunId: compareRightRunId,
        focusNodeId: focusedNodeId,
        focusConnectionId: focusedConnectionId,
        connections,
      }),
    [
      compareLeftRunId,
      compareRightRunId,
      connections,
      focusedConnectionId,
      focusedNodeId,
      replay.selectedRunId,
      replay.selectedSource,
      runHistoryRecords,
    ],
  )
  const summary = useMemo(
    () => summarizeRunDetail(replay.selectedTrace, mode),
    [mode, replay.selectedTrace],
  )
  const runtimeTimeline = useMemo(
    () =>
      buildRunDetailRuntimeTimelineView({
        trace: replay.selectedTrace,
        focusNodeId: focusedNodeId,
        focusConnectionId: focusedConnectionId,
      }),
    [focusedConnectionId, focusedNodeId, replay.selectedTrace],
  )
  const sourceLabel =
    !replay.selectedTrace
      ? 'traceなし'
      : replay.selectedTrace.source === 'run-history'
        ? `durable audit snapshot${replay.selectedTrace.auditEventCount ? ` / events ${replay.selectedTrace.auditEventCount}` : ''} / runtime ${replay.selectedTrace.runtimeEvents?.length ?? 0}`
        : `current runtime trace / runtime ${replay.selectedTrace.runtimeEvents?.length ?? 0} / completion時に audit 保存`

  return (
    <section className="run-detail-panel" aria-label="実行詳細">
      <div className="run-detail-mock-banner" role="note">
        ⚠ read-only replay — {sourceLabel} / 実 AI API 未接続
      </div>

      <div className="run-detail-controls">
        <label className="field-label run-detail-source-field">
          <span>Replay source</span>
          <select
            value={replay.selectedOptionId}
            onChange={(event) => onSelectRunId(event.target.value === 'current' ? null : event.target.value)}
          >
            {replay.options.map((option) => (
              <option key={option.id} value={option.id} disabled={option.disabled}>
                {option.label} / {option.meta}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label run-detail-mode-field">
          <span>表示モード</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as RunDetailMode)}
          >
            {(['all', 'latest-run', 'errors-only'] as const).map((m) => (
              <option key={m} value={m}>
                {modeLabels[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="run-detail-compare-toggle">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(event) => setCompareEnabled(event.target.checked)}
          />
          <span>Compare audits</span>
        </label>
      </div>

      <RunDetailHeader
        summary={summary}
        runTrace={replay.selectedTrace}
        replaySummary={replay.replaySummary}
        focusTarget={replay.focusTarget}
        onSelectConnection={onSelectConnection}
      />

      <RuntimeTimelinePanel timeline={runtimeTimeline} />

      <RunComparisonPanel
        enabled={compareEnabled}
        comparison={comparison}
        onSelectLeftRun={(runId) => {
          setCompareLeftRunId(runId)
          if (compareRightRunId === runId) {
            setCompareRightRunId(null)
          }
        }}
        onSelectRightRun={(runId) => setCompareRightRunId(runId)}
      />

      {summary.safetyWarnings.length > 0 ? (
        <div className="run-detail-safety-banner" role="alert">
          {summary.safetyWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {summary.stepEvidence.length === 0 ? (
        <div className="run-detail-empty-state">
          <p>表示できる evidence がありません。</p>
          <p className="muted">Run を実行するか、表示モードを変更してください。</p>
        </div>
      ) : (
        <div className="run-detail-step-list">
          {summary.stepEvidence.map((stepSummary) => (
            <StepEvidenceCard
              key={stepSummary.stepId ?? `run-level-${stepSummary.runId}`}
              stepSummary={stepSummary}
              focusTarget={replay.focusTarget}
              connections={connections}
              onSelectNode={onSelectNode}
              onSelectConnection={onSelectConnection}
            />
          ))}
        </div>
      )}
    </section>
  )
}

type RuntimeTimelinePanelProps = {
  timeline: RunDetailRuntimeTimelineView
}

function RuntimeTimelinePanel({ timeline }: RuntimeTimelinePanelProps) {
  return (
    <section className="run-detail-runtime-timeline" aria-label="Replay-ready runtime event timeline">
      <div className="run-detail-step-diff-heading">
        <div>
          <span className="run-detail-comparison-kicker">safe runtime metadata</span>
          <strong>Replay-ready timeline</strong>
        </div>
        <span>
          {timeline.eventCount} events / {timeline.focusedEventCount} focused
        </span>
      </div>
      <p>{timeline.replayHint}</p>
      <div className="run-detail-runtime-stats">
        <span>route {timeline.routeEventCount}</span>
        <span>edge {timeline.edgeEventCount}</span>
        <span>review {timeline.reviewEventCount}</span>
        <span>warn {timeline.warningEventCount}</span>
        <span>error {timeline.errorEventCount}</span>
      </div>
      {timeline.items.length > 0 ? (
        <ol className="run-detail-runtime-list">
          {timeline.items.map((item) => (
            <li
              key={item.id}
              className={`run-detail-runtime-item run-detail-runtime-${item.severity} ${item.focusMatched ? 'run-detail-runtime-focused' : ''}`}
            >
              <div className="run-detail-runtime-item-head">
                <span>#{item.order}</span>
                <strong>{item.title}</strong>
                <small>{item.createdAtLabel}</small>
              </div>
              <p>{item.summary}</p>
              <div className="run-detail-runtime-meta">
                <span>{item.eventKind}</span>
                <span>{item.routeKind}</span>
                <span>{item.severity}</span>
                {item.connectionId ? <span>edge {item.connectionId}</span> : null}
                {item.sourceNodeId ? <span>from {item.sourceNodeId}</span> : null}
                {item.targetNodeId ? <span>to {item.targetNodeId}</span> : null}
              </div>
              <small>{item.metadataSummary}</small>
            </li>
          ))}
        </ol>
      ) : (
        <div className="run-detail-step-diff-empty">
          safe runtime event はまだありません。
        </div>
      )}
    </section>
  )
}

type RunComparisonPanelProps = {
  enabled: boolean
  comparison: RunDetailComparisonView
  onSelectLeftRun: (runId: string) => void
  onSelectRightRun: (runId: string) => void
}

function RunComparisonPanel({
  enabled,
  comparison,
  onSelectLeftRun,
  onSelectRightRun,
}: RunComparisonPanelProps) {
  if (!enabled) return null

  return (
    <section className="run-detail-comparison" aria-label="Run Detail multi-run comparison">
      <div className="run-detail-comparison-header">
        <div>
          <span className="run-detail-comparison-kicker">safe audit summary only</span>
          <strong>Multi-run diff</strong>
        </div>
        <span className="run-detail-comparison-summary">{comparison.summary}</span>
      </div>

      <div className="run-detail-comparison-selectors">
        <label className="field-label run-detail-compare-field">
          <span>Base audit</span>
          <select
            value={comparison.leftOptionId}
            disabled={comparison.options.length < 2}
            onChange={(event) => onSelectLeftRun(event.target.value)}
          >
            {comparison.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} / {option.meta}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label run-detail-compare-field">
          <span>Compare audit</span>
          <select
            value={comparison.rightOptionId}
            disabled={comparison.options.length < 2}
            onChange={(event) => onSelectRightRun(event.target.value)}
          >
            {comparison.options.map((option) => (
              <option
                key={option.id}
                value={option.id}
                disabled={option.id === comparison.leftOptionId}
              >
                {option.label} / {option.meta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {comparison.warning ? (
        <p className="run-detail-comparison-warning">{comparison.warning}</p>
      ) : (
        <>
          <div className="run-detail-comparison-runs">
            <div>
              <span>Base</span>
              <strong>{comparison.leftRun?.label}</strong>
              <small>
                {comparison.leftRun?.startedAtLabel} / runtime {comparison.leftRun?.runtimeEventCount ?? 0}
              </small>
            </div>
            <div>
              <span>Compare</span>
              <strong>{comparison.rightRun?.label}</strong>
              <small>
                {comparison.rightRun?.startedAtLabel} / runtime {comparison.rightRun?.runtimeEventCount ?? 0}
              </small>
            </div>
          </div>

          <div className="run-detail-diff-table" role="table" aria-label="Run metadata diff">
            <div className="run-detail-diff-row run-detail-diff-heading" role="row">
              <span role="columnheader">Metric</span>
              <span role="columnheader">Base</span>
              <span role="columnheader">Compare</span>
              <span role="columnheader">Delta</span>
            </div>
            {comparison.rows.map((row) => (
              <div
                key={row.id}
                className={`run-detail-diff-row run-detail-diff-${row.severity}`}
                role="row"
              >
                <span role="cell">{row.label}</span>
                <span role="cell">{row.leftValue}</span>
                <span role="cell">{row.rightValue}</span>
                <strong role="cell">{row.deltaLabel}</strong>
              </div>
            ))}
          </div>

          <StepEvidenceDiffPanel groups={comparison.stepGroups} />
          <ScopedEvidenceDiffPanel scope={comparison.focusScope} />
        </>
      )}
    </section>
  )
}

type StepEvidenceDiffPanelProps = {
  groups: RunDetailStepEvidenceDiffGroup[]
}

function StepEvidenceDiffPanel({ groups }: StepEvidenceDiffPanelProps) {
  if (groups.length === 0) {
    return (
      <div className="run-detail-step-diff-empty">
        safe step evidence diff はありません。
      </div>
    )
  }

  return (
    <section className="run-detail-step-diff" aria-label="Step evidence diff">
      <div className="run-detail-step-diff-heading">
        <div>
          <span className="run-detail-comparison-kicker">safe step evidence grouping</span>
          <strong>Step evidence diff</strong>
        </div>
        <span>{groups.filter((group) => group.severity !== 'same').length} changed</span>
      </div>
      <div className="run-detail-step-diff-list">
        {groups.map((group) => (
          <StepEvidenceDiffCard key={group.id} group={group} compact={false} />
        ))}
      </div>
    </section>
  )
}

type ScopedEvidenceDiffPanelProps = {
  scope: RunDetailScopedDiffView
}

function ScopedEvidenceDiffPanel({ scope }: ScopedEvidenceDiffPanelProps) {
  return (
    <section className="run-detail-scoped-diff" aria-label="Focused node edge scoped diff">
      <div className="run-detail-step-diff-heading">
        <div>
          <span className="run-detail-comparison-kicker">focused node / edge scope</span>
          <strong>{scope.targetLabel}</strong>
        </div>
        <span>{scope.groups.length} group</span>
      </div>
      <p>{scope.summary}</p>
      <RouteMetadataDiffPanel rows={scope.routeMetadataRows} summaries={scope.routeEventSummaries} />
      {scope.groups.length > 0 ? (
        <div className="run-detail-step-diff-list">
          {scope.groups.map((group) => (
            <StepEvidenceDiffCard key={`scope-${group.id}`} group={group} compact />
          ))}
        </div>
      ) : null}
    </section>
  )
}

type RouteMetadataDiffPanelProps = {
  rows: RunDetailDiffRow[]
  summaries: string[]
}

function RouteMetadataDiffPanel({ rows, summaries }: RouteMetadataDiffPanelProps) {
  if (rows.length === 0 && summaries.length === 0) return null

  return (
    <section className="run-detail-route-metadata-diff" aria-label="Focused edge route metadata diff">
      <div className="run-detail-step-diff-heading">
        <div>
          <span className="run-detail-comparison-kicker">safe route-event metadata</span>
          <strong>Edge route metadata diff</strong>
        </div>
        <span>{rows.filter((row) => row.severity !== 'same').length} changed</span>
      </div>
      {rows.length > 0 ? (
        <div className="run-detail-diff-table" role="table" aria-label="Focused edge route metadata diff table">
          <div className="run-detail-diff-row run-detail-diff-heading" role="row">
            <span role="columnheader">Metadata</span>
            <span role="columnheader">Base</span>
            <span role="columnheader">Compare</span>
            <span role="columnheader">Delta</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className={`run-detail-diff-row run-detail-diff-${row.severity}`}
              role="row"
            >
              <span role="cell">{row.label}</span>
              <span role="cell">{row.leftValue}</span>
              <span role="cell">{row.rightValue}</span>
              <strong role="cell">{row.deltaLabel}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {summaries.length > 0 ? (
        <ul className="run-detail-route-event-summary">
          {summaries.map((summary, index) => (
            <li key={`route-summary-${index}`}>{summary}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

type StepEvidenceDiffCardProps = {
  group: RunDetailStepEvidenceDiffGroup
  compact: boolean
}

function StepEvidenceDiffCard({ group, compact }: StepEvidenceDiffCardProps) {
  return (
    <article className={`run-detail-step-diff-card run-detail-diff-${group.severity}`}>
      <div className="run-detail-step-diff-card-header">
        <div>
          <strong>{group.title}</strong>
          <span>{group.nodeId ?? 'run level'}</span>
        </div>
        <strong>{group.deltaLabel}</strong>
      </div>
      <div className="run-detail-step-diff-grid">
        <div>
          <span>Base</span>
          <strong>{group.leftStatus}</strong>
          <small>
            {group.leftEvidenceCount} evidence / {group.leftHighestSeverity}
          </small>
        </div>
        <div>
          <span>Compare</span>
          <strong>{group.rightStatus}</strong>
          <small>
            {group.rightEvidenceCount} evidence / {group.rightHighestSeverity}
          </small>
        </div>
      </div>
      <div className="run-detail-step-diff-kinds">
        <span>Base: {group.leftKinds.join(', ') || 'none'}</span>
        <span>Compare: {group.rightKinds.join(', ') || 'none'}</span>
      </div>
      {!compact && group.safeEvidence.length > 0 ? (
        <ul className="run-detail-step-diff-evidence">
          {group.safeEvidence.map((entry, index) => (
            <li key={`${group.id}-evidence-${index}`}>{entry}</li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

type RunDetailHeaderProps = {
  summary: RunDetailSummary
  runTrace: RunTrace | null
  replaySummary: string
  focusTarget: RunDetailFocusTarget
  onSelectConnection: (connectionId: string | null) => void
}

function RunDetailHeader({
  summary,
  runTrace,
  replaySummary,
  focusTarget,
  onSelectConnection,
}: RunDetailHeaderProps) {
  return (
    <div className="run-detail-header">
      <div className="run-detail-replay-line">
        <span>{replaySummary}</span>
        {focusTarget.type === 'connection' && focusTarget.connectionId ? (
          <button
            type="button"
            className="icon-button"
            onClick={() => onSelectConnection(focusTarget.connectionId)}
          >
            Focus edge
          </button>
        ) : null}
      </div>
      <div className="run-detail-stat-row">
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">Run ID</span>
          <strong className="run-detail-stat-value run-detail-run-id">
            {summary.runId ?? '—'}
          </strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">ステップ数</span>
          <strong className="run-detail-stat-value">{summary.stepCount}</strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">evidence 件数</span>
          <strong className="run-detail-stat-value">{summary.evidenceCount}</strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">除外件数</span>
          <strong
            className={`run-detail-stat-value${summary.excludedEvidenceCount > 0 ? ' run-detail-stat-warn' : ''}`}
          >
            {summary.excludedEvidenceCount}
          </strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">Trace source</span>
          <strong className="run-detail-stat-value">
            {runTrace?.source === 'run-history' ? 'Audit' : runTrace ? 'Current' : '—'}
          </strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">Audit events</span>
          <strong className="run-detail-stat-value">{runTrace?.auditEventCount ?? 0}</strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">Runtime events</span>
          <strong className="run-detail-stat-value">{runTrace?.runtimeEvents?.length ?? 0}</strong>
        </div>
        <div className="run-detail-stat">
          <span className="run-detail-stat-label">ブリーフィング参照証拠</span>
          <strong className="run-detail-stat-value">{summary.selectedEvidence.length} 件</strong>
        </div>
      </div>
    </div>
  )
}

type StepEvidenceCardProps = {
  stepSummary: StepEvidenceSummary
  focusTarget: RunDetailFocusTarget
  connections: WorkflowConnection[]
  onSelectNode: (nodeId: string) => void
  onSelectConnection: (connectionId: string | null) => void
}

function StepEvidenceCard({
  stepSummary,
  focusTarget,
  connections,
  onSelectNode,
  onSelectConnection,
}: StepEvidenceCardProps) {
  const severityClass = `run-detail-step-${stepSummary.highestSeverity}`
  const label = stepSummary.nodeTitle ?? stepSummary.stepId ?? stepSummary.runId
  const isFocused = !!stepSummary.nodeId && focusTarget.nodeIds.includes(stepSummary.nodeId)
  const relatedConnections = stepSummary.nodeId
    ? connections
        .filter(
          (connection) =>
            connection.sourceNodeId === stepSummary.nodeId ||
            connection.targetNodeId === stepSummary.nodeId,
        )
        .slice(0, 3)
    : []

  return (
    <div className={`run-detail-step-card ${severityClass} ${isFocused ? 'run-detail-step-focused' : ''}`}>
      <div className="run-detail-step-header">
        <div className="run-detail-step-meta">
          <strong className="run-detail-step-label">{label}</strong>
          {stepSummary.status ? (
            <span className="run-detail-step-status">{stepSummary.status}</span>
          ) : null}
        </div>
        <div className="run-detail-step-badges">
          <span
            className={`run-detail-severity-badge severity-${stepSummary.highestSeverity}`}
            aria-label={`重要度: ${severityLabels[stepSummary.highestSeverity]}`}
          >
            {severityLabels[stepSummary.highestSeverity]}
          </span>
          <span className="run-detail-evidence-count">{stepSummary.evidenceCount} 件</span>
        </div>
      </div>

      {stepSummary.nodeId || relatedConnections.length > 0 ? (
        <div className="run-detail-deep-link-row" aria-label="Run Detail deep links">
          {stepSummary.nodeId ? (
            <button
              type="button"
              className="hud-icon-button"
              onClick={() => onSelectNode(stepSummary.nodeId as string)}
              title="キャンバス上の node を選択"
            >
              Node
            </button>
          ) : null}
          {relatedConnections.map((connection) => (
            <button
              key={connection.id}
              type="button"
              className={`hud-icon-button ${focusTarget.connectionId === connection.id ? 'active' : ''}`}
              onClick={() => onSelectConnection(connection.id)}
              title={`${connection.sourceNodeId} -> ${connection.targetNodeId}`}
            >
              Edge
            </button>
          ))}
        </div>
      ) : null}

      <div className="run-detail-evidence-kinds">
        {stepSummary.evidenceKinds.map((kind) => (
          <span key={kind} className="run-detail-kind-tag">
            {kind}
          </span>
        ))}
      </div>

      <ul className="run-detail-entry-list">
        {stepSummary.entries.map((entry, i) => (
          <li key={i} className="run-detail-entry">
            {entry}
          </li>
        ))}
      </ul>
    </div>
  )
}
