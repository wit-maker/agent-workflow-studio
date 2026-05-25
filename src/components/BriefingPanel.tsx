import type { BriefingInputMode, BriefingState } from '../domain/briefing'
import { briefingInputModeLabels } from '../domain/briefing'

type BriefingPanelProps = {
  state: BriefingState
  onGenerate: () => void
  onInputModeChange: (mode: BriefingInputMode) => void
}

const severityLabels = {
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return '未生成'
  }

  return new Date(value).toLocaleString('ja-JP')
}

export function BriefingPanel({
  state,
  onGenerate,
  onInputModeChange,
}: BriefingPanelProps) {
  const result = state.result

  return (
    <section className="briefing-panel" aria-label="状況ブリーフィング">
      <div className="briefing-mock-banner" role="note">
        ⚠ mock モード（実 AI API 未接続）
      </div>

      <div className="briefing-controls">
        <button
          type="button"
          className="primary-button"
          aria-label="状況ブリーフィングを生成"
          onClick={onGenerate}
          disabled={state.status === 'generating'}
        >
          {state.result ? 'ブリーフィングを再生成' : 'ブリーフィングを生成'}
        </button>

        <label className="field-label briefing-mode-field">
          <span>入力ソース</span>
          <select
            value={state.inputMode}
            onChange={(event) =>
              onInputModeChange(event.target.value as BriefingInputMode)
            }
          >
            {(['all', 'latest-run', 'errors-only'] as const).map((mode) => (
              <option key={mode} value={mode}>
                {briefingInputModeLabels[mode]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.status === 'error' && state.error ? (
        <div className="briefing-error-banner" role="alert">
          ブリーフィング生成に失敗しました: {state.error}
        </div>
      ) : null}

      {state.status === 'generating' ? (
        <div className="briefing-generating" role="status" aria-label="生成中">
          <span className="briefing-spinner" aria-hidden="true" />
          <span>生成中...</span>
        </div>
      ) : null}

      {!result && state.status !== 'generating' ? (
        <div className="briefing-empty-state">
          <p>ブリーフィングはまだ生成されていません。</p>
          <p className="muted">
            「ブリーフィングを生成」を押してください。Run 後に生成すると状況の説明が見やすくなります。
          </p>
        </div>
      ) : null}

      {result ? (
        <article className="briefing-card">
          <header className="briefing-card-header">
            <div>
              <span className="briefing-eyebrow">ブリーフィング</span>
              <h3>📋 4D 状況説明</h3>
            </div>
            <div className="briefing-meta">
              <span
                className={`briefing-severity-badge severity-${result.severity}`}
                aria-label={`重要度: ${severityLabels[result.severity]}`}
              >
                {severityLabels[result.severity]}
              </span>
              <time>{formatGeneratedAt(state.generatedAt)}</time>
            </div>
          </header>

          <div className="briefing-sections">
            <BriefingSection title="What" body={result.what} />
            <BriefingSection title="Why" body={result.why} />
            <BriefingSection title="How" body={result.how} />
            <BriefingSection title="Next" body={result.next} />
          </div>
        </article>
      ) : null}
    </section>
  )
}

type BriefingSectionProps = {
  title: string
  body: string
}

function BriefingSection({ title, body }: BriefingSectionProps) {
  return (
    <section className="briefing-section">
      <h4>{title}</h4>
      <p>{body}</p>
    </section>
  )
}
