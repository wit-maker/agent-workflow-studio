# Credential Safety Boundary

## 現在の方針（M14時点）

現時点では **Credential 値をいかなる場所にも保存しない**。

Agent Workflow Studio はローカルモックモードで動作しており、実 API への接続は行わない。
Credential 入力欄の本格実装も行わない。

## 保存しない場所（禁止事項）

以下のいずれの場所にも Credential 値を保存してはならない:

- React state
- localStorage / sessionStorage
- IndexedDB
- JSON ファイル
- `.env` ファイル（自動生成禁止）
- run log
- metrics
- template
- workflow JSON のエクスポート
- browser console

## 現在の connector ステータス

すべての connector は `isMock: true` であり、実 API を呼び出さない。
`requiresCredential` フラグは将来の接続準備のための情報として保持するのみ。

接続ステータス: `mock` — 実 API 未接続

## 将来の候補（設計メモのみ、未実装）

実 API 接続が必要になった際の安全な保存候補:

1. **OS Keychain** — macOS Keychain / Windows Credential Manager
2. **Tauri secure storage** — Tauri プラグインによるネイティブキーストア
3. **環境変数** — ユーザーが実行環境に設定する `API_KEY` 等
4. **ユーザー提供ランタイムシークレット** — 起動時にのみ渡すメモリ内シークレット

## 禁止事項（将来も含む）

- `.env` の自動生成・自動書き込み
- API key の localStorage 永続化
- connector 設定 JSON への secret 書き込み
- run log への secret 出力
- template への credential 情報埋め込み

## 実 API 接続前に必要な次ステップ

1. Credential を扱う adapter 境界（`ICredentialStore` interface）の設計
2. OS Keychain または Tauri secure storage の実装選定
3. Credential を UI に渡す前の暗号化・マスキング方針の決定
4. Credential 漏洩テストの追加
5. `CredentialBoundaryPanel` の表示内容を実装状況に応じて更新

## 関連ファイル

- `src/domain/credentialPolicy.ts` — 安全境界の型定義
- `src/components/CredentialBoundaryPanel.tsx` — UI 表示コンポーネント
- `src/domain/agentConnectorRegistry.ts` — mock connector 一覧
- `docs/architecture/tauri-readiness.md` — Tauri 移行準備設計
