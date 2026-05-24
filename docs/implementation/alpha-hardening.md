# Alpha Hardening — M13〜M16

## 実装内容

### M13: Connector Execution Queue

- `src/domain/connectorQueue.ts` — `ConnectorJob` 型・ステータス定義
- `src/domain/connectorExecutionPlanner.ts` — ノード実行からジョブを生成
- `src/components/ConnectorQueuePanel.tsx` — キュー表示 UI (BottomMonitor キュータブ)
- `src/components/RecoveryPanel.tsx` — ジョブ単位の回復アクション UI
- `src/components/AppShell.tsx` — `connectorJobs` state、実行ループ内でジョブ status 更新
- run log に `[job: <id>] <connector> / <status> — <nodeTitle>` 形式でジョブ情報を記録

### M14: Credential Safety Boundary

- `src/domain/credentialPolicy.ts` — `ConnectorCredentialPolicy` 型定義
- `src/components/CredentialBoundaryPanel.tsx` — Credential 安全境界 UI (Agent タブ内)
- `docs/architecture/credential-safety-boundary.md` — 保存禁止方針・将来候補・禁止事項

### M15: Error Recovery / Retry

- `src/domain/retryPolicy.ts` — `RetryPolicy` 型・`DEFAULT_RETRY_POLICY` (最大3回)・`canRetry()`
- `src/domain/recoveryActions.ts` — 純関数: `retryConnectorJob` / `markJobReviewed` / `skipConnectorJob` / `cancelConnectorJob`
- `src/components/AppShell.tsx` — 4つの回復ハンドラー (retry/markReviewed/skip/cancel)、metrics の retryCount 更新、回復ログ記録
- RecoveryPanel は failed・review_required・queued ジョブに対して自動表示

### M16: Alpha Hardening QA

- ブラウザ QA 実施（詳細は下記）
- `PROJECT_STATE.md` 更新
- `README.md` 更新
- 本ドキュメント作成

---

## QA シナリオ

| No | シナリオ | 結果 | 備考 |
|---:|---|---|---|
| 1 | アプリ起動 | ✅ | 12 ノード復元 |
| 2 | ノード追加 | - | ヘッドレスブラウザ制限により未実施 |
| 3 | ノード編集 | - | ヘッドレスブラウザ制限により未実施 |
| 4 | connector 割当確認 | ✅ | Agent タブ: 6 mock コネクター表示 |
| 5 | Run Selected | - | Run All で代替確認 |
| 6 | Connector Queue 確認 | ✅ | 12 ジョブ生成、待機/実行中/失敗/成功 表示 |
| 7 | Run All | ✅ | 全ノード実行、ジョブ status 追跡 |
| 8 | mock connector log 確認 | ✅ | `[job: cjob-...]` 形式でログに記録 |
| 9 | failed / review_required 表示確認 | ✅ | チェックノードで両ステータス確認 |
| 10 | retry 実行 | ✅ | 失敗ジョブを再試行、retryCount=1 → 成功 |
| 11 | reviewed 化 | ✅ | review_required → 成功（確認済みにする）|
| 12 | template 保存 | ✅ | localStorage に保存確認 |
| 13 | reload | ✅ | ページリロード後も状態維持 |
| 14 | workflow 復元 | ✅ | 12 ノードの workflow 復元確認 |
| 15 | queue / logs / metrics の保存範囲確認 | ✅ | 下記「persistence scope」参照 |
| 16 | storage reset | ✅ | 確認ダイアログ → リセット実行 |
| 17 | build / lint | ✅ | 両方パス |

---

## Persistence Scope

| 対象 | 保存 | 復元 | 備考 |
|---|---|---|---|
| workflow | ✅ | ✅ | `agent-workflow-studio.workflow.current.v1` |
| templates | ✅ | ✅ | `agent-workflow-studio.templates.v1` |
| run logs | ❌ | ❌ | React state のみ（リロードで消える） |
| connector queue | ❌ | ❌ | React state のみ（リロードで消える） |
| metrics | ❌ | ❌ | workflow state 内に含まれるが run 後はリセット |
| credential values | ❌ | ❌ | 保存しない（安全境界） |

---

## Recovery Behavior

- `retryConnectorJob`: failed なジョブを mock 成功に変換、retryCount++。maxRetries (3) 到達後は再試行不可。
- `markJobReviewed`: review_required なジョブを成功に変換。
- `skipConnectorJob`: failed / review_required なジョブを skipped に変換。
- `cancelConnectorJob`: queued なジョブを cancelled に変換。
- 各回復アクションは workflow run log にも記録される。
- retry 時は `workflow.metrics.retryCount` を +1 更新。

---

## Not Included

- 実 API 接続
- Credential 保存（OS Keychain / Tauri / env / localStorage）
- `.env` 生成
- Tauri 導入
- SQLite 導入
- Zustand 導入
- Codex / Hermes / Grok live integration
- UI 全面作り直し
- 既存 run engine / persistence の大規模変更

---

## Next Steps (M17〜M20 候補)

1. Tauri 導入準備（IStorageAdapter → Tauri FS adapter 実装）
2. ファイルシステム保存（workflow JSON をローカルファイルに書き出し）
3. 実 API 接続設計（Credential 管理 / OS Keychain アダプター）
4. コネクター実装順序決定（Claude → Codex → Gemini の順序案）
