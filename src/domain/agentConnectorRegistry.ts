import type { AgentConnector } from './agentConnectors'

export const MOCK_CONNECTORS: AgentConnector[] = [
  {
    id: 'codex-mock',
    label: 'Codex Mock',
    provider: 'OpenAI',
    role: 'programmer_ai',
    capabilities: ['コード生成', 'コード補完', 'リファクタリング提案'],
    status: 'mock',
    isMock: true,
    requiresCredential: false,
    description:
      'OpenAI Codex のモックアダプターです。コード生成ノードに割り当て可能ですが、実APIは呼び出しません。',
  },
  {
    id: 'claude-mock',
    label: 'Claude Mock',
    provider: 'Anthropic',
    role: 'sub_leader_ai',
    capabilities: ['テキスト生成', '要約', '長文推論', 'コードレビュー'],
    status: 'mock',
    isMock: true,
    requiresCredential: false,
    description:
      'Anthropic Claude のモックアダプターです。汎用推論・要約ノードに割り当て可能ですが、実APIは呼び出しません。',
  },
  {
    id: 'gemini-mock',
    label: 'Gemini Mock',
    provider: 'Google',
    role: 'research_ai',
    capabilities: ['マルチモーダル処理', 'ドキュメント解析', '検索補完'],
    status: 'mock',
    isMock: true,
    requiresCredential: false,
    description:
      'Google Gemini のモックアダプターです。調査・ドキュメント処理ノードに割り当て可能ですが、実APIは呼び出しません。',
  },
  {
    id: 'hermes-mock',
    label: 'Hermes Mock',
    provider: 'NousResearch',
    role: 'lightwork_ai',
    capabilities: ['ツール呼び出し', '軽量分類', '高速処理'],
    status: 'mock',
    isMock: true,
    requiresCredential: false,
    description:
      'Hermes のモックアダプターです。軽量処理・ツール実行ノードに割り当て可能ですが、実APIは呼び出しません。',
  },
  {
    id: 'grok-mock',
    label: 'Grok / X Search Mock',
    provider: 'xAI',
    role: 'research_ai',
    capabilities: ['リアルタイム検索', 'SNS情報収集', 'トレンド分析'],
    status: 'mock',
    isMock: true,
    requiresCredential: false,
    description:
      'xAI Grok のモックアダプターです。検索・情報収集ノードに割り当て可能ですが、実APIは呼び出しません。',
  },
  {
    id: 'human-review',
    label: 'Human Review',
    provider: 'Manual',
    role: 'human_review',
    capabilities: ['人間確認', '承認・差し戻し', '最終判断'],
    status: 'mock',
    isMock: true,
    requiresCredential: false,
    description:
      '人間レビューアのモックアダプターです。確認ノード・承認ノードに割り当てられます。',
  },
]

export function getConnectorById(id: string): AgentConnector | undefined {
  return MOCK_CONNECTORS.find((c) => c.id === id)
}

export function getConnectorByRole(role: AgentConnector['role']): AgentConnector | undefined {
  return MOCK_CONNECTORS.find((c) => c.role === role)
}
