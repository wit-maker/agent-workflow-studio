export type RoadmapPhase = 'phase-a' | 'phase-b' | 'phase-c' | 'phase-d'

export type RoadmapStatus =
  | 'available'        // 既に動作している
  | 'next'             // 次に実装するコネクター
  | 'short-term'       // 短期候補（Phase B）
  | 'mid-term'         // 中期候補（Phase C）
  | 'long-term'        // 長期候補（Phase D）
  | 'blocked'          // 前提条件待ち

export type ConnectorRoadmapEntry = {
  connectorId: string
  displayName: string
  phase: RoadmapPhase
  status: RoadmapStatus
  priority: number
  value: 1 | 2 | 3 | 4 | 5
  implementationDifficulty: 'lowest' | 'low' | 'medium' | 'high'
  credentialRisk: 'none' | 'low' | 'medium' | 'high'
  localFirst: boolean
  prerequisite?: string
  rationale: string
  nextAction: string
}

export const CONNECTOR_ROADMAP: ConnectorRoadmapEntry[] = [
  {
    connectorId: 'human-review',
    displayName: 'Human Review',
    phase: 'phase-a',
    status: 'available',
    priority: 1,
    value: 5,
    implementationDifficulty: 'low',
    credentialRisk: 'none',
    localFirst: true,
    rationale: 'API不要・ユーザーが完全制御・ワークフロー信頼性の核',
    nextAction: 'IRealConnectorAdapter を実装（ネットワーク不要）',
  },
  {
    connectorId: 'local-mock',
    displayName: 'Local Mock',
    phase: 'phase-a',
    status: 'available',
    priority: 2,
    value: 4,
    implementationDifficulty: 'lowest',
    credentialRisk: 'none',
    localFirst: true,
    rationale: '既にほぼ動作している・テストの基盤',
    nextAction: 'IRealConnectorAdapter に準拠させる',
  },
  {
    connectorId: 'claude-cli',
    displayName: 'Claude CLI',
    phase: 'phase-b',
    status: 'next',
    priority: 3,
    value: 5,
    implementationDifficulty: 'low',
    credentialRisk: 'low',
    localFirst: true,
    prerequisite: 'Tauri 導入または Local Proxy 設計',
    rationale: '最も高い value・local-first・credential リスクが低い',
    nextAction: 'Tauri 導入後に実装',
  },
  {
    connectorId: 'codex-cli',
    displayName: 'Codex CLI',
    phase: 'phase-b',
    status: 'short-term',
    priority: 4,
    value: 4,
    implementationDifficulty: 'low',
    credentialRisk: 'low',
    localFirst: true,
    prerequisite: 'Claude CLI 完了',
    rationale: 'Claude CLI と同等アーキテクチャ・設計を再利用できる',
    nextAction: 'Claude CLI 完了後に実装',
  },
  {
    connectorId: 'gemini-cli',
    displayName: 'Gemini CLI',
    phase: 'phase-b',
    status: 'short-term',
    priority: 5,
    value: 4,
    implementationDifficulty: 'medium',
    credentialRisk: 'low',
    localFirst: true,
    prerequisite: 'Codex CLI 完了',
    rationale: '大きなコンテキストウィンドウ・web search 内蔵',
    nextAction: 'Codex CLI 完了後に実装',
  },
  {
    connectorId: 'hermes-gateway',
    displayName: 'Hermes Gateway',
    phase: 'phase-c',
    status: 'mid-term',
    priority: 6,
    value: 3,
    implementationDifficulty: 'medium',
    credentialRisk: 'low',
    localFirst: true,
    prerequisite: 'Gemini CLI 完了・Hermesローカル起動',
    rationale: '複数モデルへのルーティングを抽象化できる',
    nextAction: 'Gemini CLI 完了後に設計',
  },
  {
    connectorId: 'grok-search',
    displayName: 'Grok / X Search',
    phase: 'phase-c',
    status: 'mid-term',
    priority: 7,
    value: 3,
    implementationDifficulty: 'medium',
    credentialRisk: 'low',
    localFirst: false,
    prerequisite: 'Hermes Gateway 完了',
    rationale: 'Web検索特化・Hermes経由で実装',
    nextAction: 'Hermes 完了後に実装',
  },
  {
    connectorId: 'direct-cloud-api',
    displayName: 'Direct Cloud APIs',
    phase: 'phase-d',
    status: 'long-term',
    priority: 8,
    value: 4,
    implementationDifficulty: 'high',
    credentialRisk: 'high',
    localFirst: false,
    prerequisite: 'Tauri + OS Keychain 導入',
    rationale: '最も機能が豊富だが credential リスクが最も高い',
    nextAction: 'Tauri + OS Keychain 導入後に検討',
  },
]

export function getNextConnector(): ConnectorRoadmapEntry | undefined {
  return CONNECTOR_ROADMAP.find((entry) => entry.status === 'next')
}

export function getConnectorsByPhase(phase: RoadmapPhase): ConnectorRoadmapEntry[] {
  return CONNECTOR_ROADMAP.filter((entry) => entry.phase === phase)
}
