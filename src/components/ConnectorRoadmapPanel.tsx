import { getAllConnectorReadiness } from '../domain/connectorReadiness'
import { getConnectorRoadmap, type ConnectorRoadmapStatus } from '../domain/connectorRoadmap'

const statusLabels: Record<ConnectorRoadmapStatus, string> = {
  'ready-next': 'Ready next',
  recommended: 'Recommended',
  blocked: 'Blocked',
  later: 'Later',
  'research-needed': 'Research',
}

function score(value: number) {
  return `${value}/5`
}

export function ConnectorRoadmapPanel() {
  const roadmap = getConnectorRoadmap()
  const readiness = getAllConnectorReadiness()

  return (
    <div className="connector-roadmap-panel">
      <div className="connector-roadmap-header">
        <div>
          <h4>Connector roadmap</h4>
          <p className="muted">
            Real API calls, credentials, Tauri, SQLite, Zustand, and OS Keychain are out of scope for this milestone.
          </p>
        </div>
        <span className="connector-badge roadmap">M20</span>
      </div>

      <table className="connector-roadmap-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Connector</th>
            <th>Status</th>
            <th>Value</th>
            <th>Difficulty</th>
            <th>Credential risk</th>
            <th>Local-first</th>
            <th>Rate limit</th>
            <th>User control</th>
            <th>Debug</th>
            <th>Reason</th>
            <th>Next requirement</th>
          </tr>
        </thead>
        <tbody>
          {roadmap.map((item) => (
            <tr key={item.id}>
              <td>{item.recommendedOrder}</td>
              <td>
                <strong>{item.label}</strong>
                <span className="roadmap-category">{item.category}</span>
              </td>
              <td>
                <span className={`connector-badge roadmap-${item.status}`}>
                  {statusLabels[item.status]}
                </span>
              </td>
              <td>{score(item.value)}</td>
              <td>{score(item.implementationDifficulty)}</td>
              <td>{score(item.credentialRisk)}</td>
              <td>{score(item.localFirstCompatibility)}</td>
              <td>{score(item.rateLimitRisk)}</td>
              <td>{score(item.userControl)}</td>
              <td>{score(item.debuggability)}</td>
              <td>{item.reason}</td>
              <td>{item.nextRequirement}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="connector-readiness-summary">
        <h4>Connector readiness</h4>
        <div className="readiness-grid">
          {readiness.map((item) => (
            <div key={item.connectorId} className="readiness-card">
              <strong>{item.connectorId}</strong>
              <span className="connector-badge mock">{item.mode}</span>
              <span>mock: {item.canRunMock ? 'yes' : 'no'}</span>
              <span>real: {item.canRunReal ? 'yes' : 'no'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
