# Real Connector Adapter Design

## 目的

実API接続の前に、real connector adapter の共通 interface を確定する。

**今回は実APIを呼ばない。Credentialも保存しない。.envも作らない。**

---

## 設計原則

1. **Mock first** — `canRunReal: false` の間は必ずローカルモックで実行する
2. **Readiness check** — 実行前に `getReadiness()` を呼び、`canRunReal` が true のときのみ real 実行
3. **No credential in browser** — API key はブラウザに保存しない。OS環境変数またはローカルCLI経由
4. **Interface-first** — real adapter を実装する前に interface を確定する

---

## 型の全体像

```
ConnectorRequest ──→ IRealConnectorAdapter.execute() ──→ ConnectorResponse
                              │
                         getReadiness()
                              │
                         ConnectorReadiness
                         ├── mode: 'mock' | 'real-ready' | 'not-configured'
                         ├── canRunMock: boolean
                         ├── canRunReal: boolean
                         ├── missingRequirements: string[]
                         └── warnings: string[]
```

---

## ConnectorMode 状態遷移

```
not-configured ──(設定完了)──→ real-ready
      │                              │
      └──→ mock (常に利用可能)  ←───┘
```

- `not-configured`: APIキー未設定、CLIミッシング等
- `real-ready`: 全必要条件が揃っており、実API呼び出し可能
- `mock`: ローカルモックのみ（デフォルト状態）

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `src/domain/connectorRequest.ts` | Request 型と factory |
| `src/domain/connectorResponse.ts` | Response 型と factory |
| `src/domain/connectorError.ts` | Error 型と error code 定義 |
| `src/domain/connectorReadiness.ts` | Readiness 型・ConnectorProfile・既知コネクター一覧 |
| `src/domain/realConnectorAdapter.ts` | `IRealConnectorAdapter` interface と `BaseRealConnectorAdapter` |

---

## ConnectorError code 分類

| code | retryable | 説明 |
|---|---|---|
| `timeout` | ✓ | タイムアウト |
| `rate_limit` | ✓ | レート制限（retryAfterMs あり） |
| `network_error` | ✓ | ネットワーク障害 |
| `model_unavailable` | ✓ | モデルが一時的に利用不可 |
| `auth_failed` | ✗ | 認証失敗（設定変更が必要） |
| `not_configured` | ✗ | 接続未設定 |
| `quota_exceeded` | ✗ | クォータ超過 |
| `invalid_response` | ✗ | レスポンスフォーマット不正 |
| `input_too_large` | ✗ | 入力トークン超過 |
| `unknown` | ✗ | 不明なエラー |

---

## 既知コネクタープロファイル

| connectorId | CLI必要 | APIキー必要 | ブラウザ自動化 |
|---|---|---|---|
| human-review | ✗ | ✗ | ✗ |
| local-mock | ✗ | ✗ | ✗ |
| claude-cli | ✓ | ✗ | ✗ |
| codex-cli | ✓ | ✗ | ✗ |
| gemini-cli | ✓ | ✗ | ✗ |
| hermes-gateway | ✓ | ✗ | ✗ |
| grok-search | ✓ | ✗ | ✗ |

---

## 実装制約（現時点）

- `IRealConnectorAdapter.execute()` を実際に呼ぶコードはまだ存在しない
- 既存の `agentConnectors.ts` はこの interface に準拠していないが、将来的に近づける
- `BaseRealConnectorAdapter` の `execute()` は readiness チェックを内包しているため、サブクラスは `executeInternal()` のみ実装すればよい

---

## 次のステップ

Connector実装順序は `connector-implementation-order.md` を参照。
