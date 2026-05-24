import { useState } from 'react'
import { MOCK_CONNECTORS } from '../domain/agentConnectorRegistry'
import type { AgentConnector } from '../domain/agentConnectors'

const roleLabels: Record<AgentConnector['role'], string> = {
  human_review: '人間レビュー',
  human: '人間',
  dev_leader_ai: 'リーダーAI',
  sub_leader_ai: 'サブリーダーAI',
  programmer_ai: 'プログラマーAI',
  designer_ai: 'デザイナーAI',
  research_ai: '調査AI',
  qa_ai: 'QA AI',
  security_ai: 'セキュリティAI',
  recorder_ai: '記録AI',
  lightwork_ai: '軽量処理AI',
}

export function AgentConnectorPanel() {
  const [selected, setSelected] = useState<string | null>(null)
  const selectedConnector = MOCK_CONNECTORS.find((c) => c.id === selected)

  return (
    <div className="agent-connector-panel">
      <div className="connector-notice">
        <strong>⚠ モック接続中 — 実APIは未接続です</strong>
        <p>
          以下のコネクターはすべて mock adapter です。実行時に外部APIへのリクエストは行いません。
          実API接続・Credential設定は現在のスコープ外です。
        </p>
      </div>

      <div className="connector-list">
        {MOCK_CONNECTORS.map((connector) => (
          <button
            key={connector.id}
            type="button"
            className={`connector-item${selected === connector.id ? ' selected' : ''}`}
            onClick={() => setSelected(selected === connector.id ? null : connector.id)}
          >
            <span className="connector-label">{connector.label}</span>
            <span className="connector-provider">{connector.provider}</span>
            <span className="connector-badge mock">mock</span>
          </button>
        ))}
      </div>

      {selectedConnector ? (
        <div className="connector-detail">
          <h4>{selectedConnector.label}</h4>
          <dl>
            <dt>プロバイダー</dt>
            <dd>{selectedConnector.provider}</dd>
            <dt>ロール</dt>
            <dd>{roleLabels[selectedConnector.role]}</dd>
            <dt>ケイパビリティ</dt>
            <dd>{selectedConnector.capabilities.join(' / ')}</dd>
            <dt>ステータス</dt>
            <dd>
              <span className="connector-badge mock">mock — 実API未接続</span>
            </dd>
            <dt>説明</dt>
            <dd>{selectedConnector.description}</dd>
          </dl>
        </div>
      ) : (
        <p className="muted">コネクターを選択すると詳細が表示されます。</p>
      )}
    </div>
  )
}
