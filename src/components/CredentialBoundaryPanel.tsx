import { MOCK_CONNECTORS } from '../domain/agentConnectorRegistry'
import { buildCredentialPolicy } from '../domain/credentialPolicy'

const credentialModeLabels = {
  'mock': 'mock',
  'real-ready': '実接続準備中',
  'not-configured': '未設定',
} as const

export function CredentialBoundaryPanel() {
  const policies = MOCK_CONNECTORS.map((c) =>
    buildCredentialPolicy(c.id, c.label, c.requiresCredential),
  )

  return (
    <div className="credential-boundary-panel">
      <div className="credential-notice">
        <strong>Credential 安全境界</strong>
        <p>
          現在はモックモードです。Credential値はどこにも保存されていません。
          実API接続・Credential保存は未実装です。
        </p>
      </div>

      <table className="credential-table">
        <thead>
          <tr>
            <th>コネクター</th>
            <th>モード</th>
            <th>Credential 要否</th>
            <th>保存状態</th>
            <th>接続ステータス</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.connectorId}>
              <td>{policy.connectorLabel}</td>
              <td>
                <span className="connector-badge mock">
                  {credentialModeLabels[policy.connectionStatus]}
                </span>
              </td>
              <td>{policy.requiresCredential ? 'あり' : 'なし'}</td>
              <td>
                <span className="credential-storage-badge not-implemented">未実装</span>
              </td>
              <td className="credential-safe-step">{policy.safeNextStep}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="credential-footer">
        <p className="muted">
          Credential値はUI state・localStorage・テンプレート・ログ・メトリクスへ保存されません。
          将来候補: OS Keychain / Tauri secure storage / 環境変数 / ユーザー提供ランタイムシークレット。
        </p>
      </div>
    </div>
  )
}
