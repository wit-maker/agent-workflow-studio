# Alpha Foundation — M9〜M12 実装ノート

## 概要

M9〜M12 は「ローカルα版の土台」を完成させるマイルストーンです。
実 API 接続・Tauri 導入・Zustand 移行は行わず、既存実装の延長として最小限に積み上げました。

---

## M9: Mock Agent Connector Architecture

### 追加ファイル

| ファイル | 役割 |
|---|---|
| `src/domain/agentConnectors.ts` | `AgentConnector` 型定義（id / label / provider / role / capabilities / status / isMock / requiresCredential / description） |
| `src/domain/agentConnectorRegistry.ts` | 6 種の mock connector 定数（`MOCK_CONNECTORS`）と検索関数 |
| `src/domain/agentExecution.ts` | ノードの `agentRole` から connector を解決し、実行ログ文字列を生成する関数群 |
| `src/components/AgentConnectorPanel.tsx` | BottomMonitor「エージェント」タブに表示するパネル |

### Mock Connectors

| ID | Label | Provider | Role |
|---|---|---|---|
| `codex-mock` | Codex Mock | OpenAI | programmer_ai |
| `claude-mock` | Claude Mock | Anthropic | sub_leader_ai |
| `gemini-mock` | Gemini Mock | Google | research_ai |
| `hermes-mock` | Hermes Mock | NousResearch | lightwork_ai |
| `grok-mock` | Grok / X Search Mock | xAI | research_ai |
| `human-review` | Human Review | Manual | human_review |

### 統合箇所

- `AppShell.tsx` の `executeNodeStep` に `appendLog` を追加し、実行ログにコネクター名を記録
- `BottomMonitor.tsx` に「エージェント」タブを追加

### 制約（意図的）

- 実 API 呼び出しなし
- Credential 入力欄なし
- すべての connector が `isMock: true`

---

## M10: Local Persistence Foundation

### 追加ファイル

| ファイル | 役割 |
|---|---|
| `src/storage/storageKeys.ts` | 全 localStorage キーの集中管理レジストリ |
| `src/storage/localWorkflowState.ts` | 現在のワークフローの保存・復元・削除（破損データは安全に廃棄） |
| `src/storage/localAppSettings.ts` | UI設定（canvasMode / activeTab）の保存・復元 |
| `src/components/PersistencePanel.tsx` | BottomMonitor「ストレージ」タブ — 各キーのサイズ・状態確認、リセットUI |

### 保存対象

| 対象 | キー | 実装状況 |
|---|---|---|
| 現在のワークフロー | `agent-workflow-studio.workflow.current.v1` | 実装済み（auto-save on state change） |
| テンプレート | `agent-workflow-studio.templates.v1` | 既存実装（変更なし） |
| React Flow 位置情報 | `agent-workflow-studio:react-flow-positions` | 既存実装（変更なし） |
| キャンバスモード | `agent-workflow-studio:canvas-mode` | 既存実装（変更なし） |
| 履歴スナップショット | `agent-workflow-studio.snapshots.v1` | 既存実装（変更なし） |
| アプリ設定 | `agent-workflow-studio.app-settings.v1` | 実装済み（reset 対象） |
| agent connector mock settings | — | コネクターは常に mock / ユーザー設定なし |

### 動作仕様

- ワークフロー変更時（`isRunning === false` の間）に自動保存
- アプリ起動時に localStorage から復元（なければ sample workflow）
- reset 時は `clearCurrentWorkflow` / `clearAppSettings` / `clearReactFlowPositions` を呼ぶ
- JSON parse 失敗時は `null` を返しフォールバック

---

## M11: Tauri Readiness Design

### 追加ファイル

| ファイル | 役割 |
|---|---|
| `src/storage/storageAdapter.ts` | `IStorageAdapter` interface + `localStorageAdapter` 実装 + `storageAdapter` エクスポート |
| `docs/architecture/tauri-readiness.md` | Tauri 導入条件・移行方針・Credential スコープ外明記 |
| `docs/architecture/storage-adapter-boundary.md` | `IStorageAdapter` 仕様・各 adapter 実装マップ |

### IStorageAdapter メソッド

- `loadWorkflow` / `saveWorkflow`
- `loadTemplates` / `saveTemplate` / `deleteTemplate`
- `loadSettings` / `saveSettings`
- `clearAll`

### 差し替え方法

```typescript
// storageAdapter.ts の1行だけ変更
export const storageAdapter: IStorageAdapter = tauriAdapter
```

---

## M12: Alpha Integration QA

→ QA 結果は `PROJECT_STATE.md` の「M9〜M12 Alpha Integration QA」セクションに記録。

---

## 未実装（意図的スコープ外）

- Tauri 導入
- SQLite
- Zustand
- 実 API 接続
- Credential 保存・入力UI
- `storageAdapter` の全呼び出し元への全面移行（`AppShell` は既存ストレージ関数を直接使用。adapter 経由化は Tauri 移行時に実施）

---

## 関連ドキュメント

- [tauri-readiness.md](../architecture/tauri-readiness.md)
- [storage-adapter-boundary.md](../architecture/storage-adapter-boundary.md)
- [LOCAL_RUN_ENGINE_M8.md](./LOCAL_RUN_ENGINE_M8.md)
