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
    <section className="briefing-panel" aria-label="4D Text Briefing MVP">
      <div className="briefing-mock-banner" role="note">
        ⚠ 4D Text Briefing MVP / mock（実 AI API 未接続）
      </div>

      <div className="briefing-controls">
        <button
          type="button"
          className="primary-button"
          aria-label="状況ブリーフィングを生成"
          onClick={onGenerate}
          disabled={state.status === 'generating'}
        >
          {state.result ? '4D説明を再生成' : '4D説明を生成'}
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
          <p>4D Text Briefing MVP はまだ生成されていません。</p>
          <p className="muted">
            「4D説明を生成」を押してください。Run 後に生成すると状況の説明が見やすくなります。
          </p>
        </div>
      ) : null}

      {result ? (
        <article className="briefing-card">
          <header className="briefing-card-header">
            <div>
              <span className="briefing-eyebrow">4D Text Briefing MVP</span>
              <h3>4D 状況説明</h3>
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
            <BriefingSection title="Replay" body={result.replayCue} />
            <BriefingSection title="Voice" body={result.voiceScript} />
            <BriefingSection title="Avatar" body={`${result.avatarScript.emotion} / ${result.avatarScript.gesture}: ${result.avatarScript.line}`} />
            <BriefingSection title="Decision" body={result.humanDecisionPrompt} />
          </div>

          <section className="briefing-section briefing-timeline">
            <h4>Visual Timeline</h4>
            <ol>
              {result.visualTimeline.map((item) => (
                <li key={`${item.time}-${item.highlightNodeId ?? 'none'}`}>
                  <span>{item.time}s</span>
                  <strong>{item.highlightNodeId ?? 'workflow'}</strong>
                  <p>{item.caption}</p>
                </li>
              ))}
            </ol>
          </section>
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
