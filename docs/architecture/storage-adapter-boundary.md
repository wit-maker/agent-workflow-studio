# Storage Adapter Boundary — 設計仕様

## 概要

`src/storage/storageAdapter.ts` が定義する `IStorageAdapter` は、アプリのロジックと永続化実装を分離する境界です。

---

## インターフェース仕様

```typescript
interface IStorageAdapter {
  loadWorkflow(): Workflow | null
  saveWorkflow(workflow: Workflow): void
  loadTemplates(): SavedWorkflowTemplate[]
  saveTemplate(input: ...): SavedWorkflowTemplate
  deleteTemplate(id: string): SavedWorkflowTemplate[]
  loadSettings(): AppSettings
  saveSettings(settings: Partial<AppSettings>): void
  clearAll(): void
}
```

### 各メソッドの責務

| メソッド | 説明 |
|---|---|
| `loadWorkflow` | 最後に保存されたワークフローを返す。未保存なら null。 |
| `saveWorkflow` | 現在のワークフローを保存する。実行中は呼ばない（AppShell が制御）。 |
| `loadTemplates` | テンプレート一覧を返す。 |
| `saveTemplate` | テンプレートを保存し、保存済みテンプレートを返す。 |
| `deleteTemplate` | テンプレートを削除し、残りのテンプレート一覧を返す。 |
| `loadSettings` | UIの設定（キャンバスモード・アクティブタブ）を返す。 |
| `saveSettings` | 設定の一部を上書き保存する。 |
| `clearAll` | ストレージ全体をクリアする（リセット操作）。 |

---

## 現在の実装 — localStorage Adapter

ファイル: `src/storage/storageAdapter.ts`

```
IStorageAdapter
    └── localStorageAdapter
            ├── loadCurrentWorkflow / saveCurrentWorkflow     → localWorkflowState.ts
            ├── listWorkflowTemplates / saveWorkflowTemplate  → localTemplates.ts
            ├── loadAppSettings / saveAppSettings             → localAppSettings.ts
            └── clearReactFlowPositions                       → localCanvasState.ts
```

---

## 将来の実装 — Tauri Adapter（未導入）

```
IStorageAdapter
    └── tauriAdapter
            ├── @tauri-apps/api/fs    （ファイル読み書き）
            └── @tauri-apps/api/path  （ユーザーデータディレクトリ）
```

保存先イメージ（Tauri 導入後）：

```
%APPDATA%/agent-workflow-studio/
    workflow.json
    templates/
        *.json
    settings.json
```

---

## スコープ外

- Credential（APIキー・トークン）の保存 — 実 API 接続設計が確定するまで対象外
- SQLite — テンプレートが数千件規模になった場合に検討
- クラウド同期 — 将来オプション、現在のスコープ外

---

## 変更のガイドライン

- 呼び出し元（`AppShell.tsx` 等）は `storageAdapter` 経由でのみ保存・復元する
- `localWorkflowState.ts` / `localAppSettings.ts` 等の個別モジュールを直接呼ぶのは `localStorageAdapter` 内だけにする
- 新しい保存対象が増えたら `IStorageAdapter` にメソッドを追加し、全 adapter で実装する

---

## 関連ドキュメント

- [tauri-readiness.md](./tauri-readiness.md)
- [initial-architecture.md](./initial-architecture.md)
