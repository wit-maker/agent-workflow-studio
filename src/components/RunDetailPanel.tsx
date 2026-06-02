import { useState, useMemo } from 'react'
import type {
  RunDetailFocusTarget,
  RunDetailMode,
  RunDetailSummary,
  StepEvidenceSummary,
} from '../domain/runDetail'
import { buildRunDetailReplayView, summarizeRunDetail } from '../domain/runDetail'
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
  const summary = useMemo(
    () => summarizeRunDetail(replay.selectedTrace, mode),
    [mode, replay.selectedTrace],
  )
  const sourceLabel =
    !replay.selectedTrace
      ? 'traceなし'
      : replay.selectedTrace.source === 'run-history'
        ? `durable audit snapshot${replay.selectedTrace.auditEventCount ? ` / events ${replay.selectedTrace.auditEventCount}` : ''}`
        : 'current runtime trace / completion時に audit 保存'

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
      </div>

      <RunDetailHeader
        summary={summary}
        runTrace={replay.selectedTrace}
        replaySummary={replay.replaySummary}
        focusTarget={replay.focusTarget}
        onSelectConnection={onSelectConnection}
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
