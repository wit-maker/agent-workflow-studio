# ポートモデル MVP

Last updated: 2026-05-23

## Phase 5 の目的

inputTypes / outputTypes の文字列配列ベースの簡易接続を、明示的な Port オブジェクトモデルへ移行する。

- Port に ID・方向・データ型・required フラグ・ラベルを持たせる
- 接続検証を Port ID ベースに強化する
- 旧 `inputTypes` / `outputTypes` との後方互換を維持する
- Import / Export 互換性を損なわない

---

## ポートモデル

```ts
export type WorkflowPortDirection = 'input' | 'output'

export type WorkflowPort = {
  id: string                      // 安定したポートID (例: "Text-in", "Context-out")
  label: string                   // 表示ラベル (dataType 文字列)
  direction: WorkflowPortDirection
  dataType: WorkflowDataType      // 実際に流れるデータ型
  required: boolean               // 未接続で警告を出すかどうか
  description?: string
}
```

### WorkflowNode への追加

```ts
inputPorts?: WorkflowPort[]   // 省略時は inputTypes から自動生成
outputPorts?: WorkflowPort[]  // 省略時は outputTypes から自動生成
```

### WorkflowConnection への追加

```ts
sourcePortId?: string   // 接続元ポートID
targetPortId?: string   // 接続先ポートID
```

---

## required / optional の判定ルール

既存の `inputTypes` から自動生成する場合のヒューリスティック:

| 入力型の数 | 判定 |
|---|---|
| 0 個 | 入力ポートなし（開始ノード） |
| 1 個 | index 0 → required |
| 2 個以上 | すべて optional |

複数入力型は「いずれかを受け取る」代替入力として扱い、false警告を避ける。

`inputPorts` を明示的に設定した場合は、そちらの `required` フラグが優先される。

---

## 旧 inputTypes / outputTypes との互換

`src/domain/portRules.ts` の `getInputPorts` / `getOutputPorts` が fallback を担う:

```ts
getInputPorts(node)
// → node.inputPorts が存在する場合はそれを返す
// → ない場合は node.inputTypes から仮ポートを生成して返す
```

旧形式の接続（`sourcePort` / `targetPort` フィールド）も `isPortConnected` が検出できる:

```ts
// 以下の順に接続済みかチェック
if (conn.sourcePortId === port.id) return true   // 新形式
if (conn.sourcePort === port.dataType) return true // 旧形式
if (conn.carries.includes(port.dataType)) return true // carries フォールバック
```

---

## 接続検証

`validateConnection` (workflowSelectors.ts) に追加されたチェック:

1. `sourcePortId` が設定されている場合、source の outputPorts に存在するか
2. `targetPortId` が設定されている場合、target の inputPorts に存在するか
3. 両方設定されている場合、source port の dataType が target port の dataType へ送れるか (`canCarryToInput`)

既存の型ベース検証（`carries` チェック、`compatibleTypes` チェック）は維持される。

### ConnectionValidationSeverity

`connectionRules.ts` から export:

```ts
export type ConnectionValidationSeverity = 'info' | 'warn' | 'error'
```

---

## schemaVersion

`Workflow` 型に追加:

```ts
schemaVersion?: '1.0' | '1.1'
```

- Phase 5 以前の JSON: `schemaVersion` なし or `'1.0'`
- Phase 5 以降の JSON: `'1.1'` を含む

---

## Import / Export 互換性

- `inputPorts` / `outputPorts` はオプションフィールドのため、旧 JSON は import 時にそのまま読み込める
- `getInputPorts` / `getOutputPorts` が実行時に自動補完するため、旧 JSON でもポート表示・接続検証が動作する
- 新しく作成した接続は `sourcePortId` / `targetPortId` を含む
- 旧接続（`sourcePort` / `targetPort`）は削除せず残す

---

## MVP 外の範囲

以下は Phase 5 では実施しない:

- React Flow 導入
- Zustand 導入
- 実 API 接続
- Credential 保存
- ポートへのドラッグ&ドロップ接続
- ポート位置の視覚的表示（React Flow の仕事）
- Zod による厳密なスキーマ検証
- ポートの動的追加・削除 UI

---

## 次フェーズ候補

1. React Flow 導入 — ポートをノード上にドットで表示し、ドラッグ接続を実現
2. テンプレート再利用 UX 強化 — ポート情報をテンプレートメタデータに含める
3. Zod スキーマ導入 — import 時の厳密検証
4. ポート別のデータフロー可視化
