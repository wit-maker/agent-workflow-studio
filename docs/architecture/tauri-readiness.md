# Tauri Readiness — 設計方針

## 概要

Agent Workflow Studio は現在 Web アプリ（Vite + React）として動作します。
将来、Tauri を使ったデスクトップ版への移行を可能にするため、保存責務を storage adapter に分離しています。

**現時点では Tauri は導入していません。** このドキュメントは将来の移行に向けた設計方針を記録するものです。

---

## 現在の実装

| 項目 | 実装 |
|---|---|
| 永続化方式 | `window.localStorage` |
| アダプター | `src/storage/storageAdapter.ts` → `localStorageAdapter` |
| インターフェース | `IStorageAdapter` |
| 保存対象 | workflow / templates / app settings / canvas positions |

---

## Tauri 導入の前提条件

以下がすべて成立した場合に Tauri 導入を検討します。

1. **デスクトップ配布ニーズ** — ユーザーが .exe / .dmg / .deb として使いたい場合
2. **ファイルサイズ超過** — localStorage の 5 MB 上限を超えるワークフローが生まれた場合
3. **ローカルファイル I/O ニーズ** — 外部ファイルとのやり取りが必要になった場合
4. **SQLite ニーズ** — テンプレート / ワークフローの全文検索・クエリが必要になった場合

---

## Tauri 移行時にやること

1. `src/storage/storageAdapter.ts` の `localStorageAdapter` を `tauriAdapter` に差し替える
2. `tauriAdapter` は `IStorageAdapter` を実装し、`@tauri-apps/api/fs` を使う
3. 既存の `localWorkflowState.ts` / `localAppSettings.ts` は localStorage 専用のまま残す
4. `storageAdapter.ts` のエクスポートを切り替えるだけで呼び出し側は変更不要

```typescript
// 差し替えはここ1行
export const storageAdapter: IStorageAdapter = tauriAdapter
```

---

## Credential 保存は対象外

**Credential（APIキー・トークン・パスワード）の保存はスコープ外です。**

理由：
- 現バージョンは実 API 接続を行わない（すべてモック）
- localStorage は暗号化されておらず、Credential 保存に適さない
- Tauri でも Keychain / SecretService 等の OS セキュアストレージが必要になる
- 実 API 接続の設計が確定するまで、Credential 設計は行わない

---

## SQLite 導入について

SQLite は Tauri 導入後のオプションです。現時点では JSON + localStorage で十分です。
SQLite が必要になるのは以下の場合に限定します：

- 数千件以上のテンプレートやスナップショットを扱う場合
- 全文検索・複雑なクエリが必要になった場合

---

## 関連ドキュメント

- [Storage Adapter Boundary](./storage-adapter-boundary.md)
- [initial-architecture.md](./initial-architecture.md)
