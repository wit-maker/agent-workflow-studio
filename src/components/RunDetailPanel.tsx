import { useState, useMemo } from 'react'
import type { RunDetailMode, RunDetailSummary, StepEvidenceSummary } from '../domain/runDetail'
import { summarizeRunDetail } from '../domain/runDetail'
import type { EvidenceSeverity } from '../domain/runStepEvidence'
import type { RunTrace } from '../domain/runTrace'

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
}

export function RunDetailPanel({ runTrace }: RunDetailPanelProps) {
  const [mode, setMode] = useState<RunDetailMode>('all')
  const summary = useMemo(() => summarizeRunDetail(runTrace, mode), [runTrace, mode])
  const sourceLabel =
    !runTrace
      ? 'traceなし'
      : runTrace.source === 'run-history'
      ? `durable audit snapshot${runTrace.auditEventCount ? ` / events ${runTrace.auditEventCount}` : ''}`
      : 'current runtime trace / completion時に audit 保存'

  return (
    <section className="run-detail-panel" aria-label="実行詳細">
      <div className="run-detail-mock-banner" role="note">
        ⚠ read-only — {sourceLabel} / 実 AI API 未接続
      </div>

      <div className="run-detail-controls">
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

      <RunDetailHeader summary={summary} runTrace={runTrace} />

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
            <StepEvidenceCard key={stepSummary.stepId ?? `run-level-${stepSummary.runId}`} stepSummary={stepSummary} />
          ))}
        </div>
      )}
    </section>
  )
}

type RunDetailHeaderProps = {
  summary: RunDetailSummary
  runTrace: RunTrace | null
}

function RunDetailHeader({ summary, runTrace }: RunDetailHeaderProps) {
  return (
    <div className="run-detail-header">
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
}

function StepEvidenceCard({ stepSummary }: StepEvidenceCardProps) {
  const severityClass = `run-detail-step-${stepSummary.highestSeverity}`
  const label = stepSummary.nodeTitle ?? stepSummary.stepId ?? stepSummary.runId

  return (
    <div className={`run-detail-step-card ${severityClass}`}>
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
