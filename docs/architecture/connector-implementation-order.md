# Connector Implementation Order

## 目的

Codex / Claude / Gemini / Hermes / Grok/X Search / Human Review の実装順序と条件を決める。

**今回は実装を開始しない。順序決定まで。**

---

## 比較軸

| 軸 | 説明 |
|---|---|
| **value** | ワークフロー全体に与える価値。代替が効かないほど高い |
| **implementation difficulty** | 接続コスト（CLI/API key/ブラウザ自動化） |
| **credential risk** | API key をブラウザに渡すリスク |
| **local-first compatibility** | ローカルのみで動くか |
| **rate-limit risk** | レート制限にぶつかる頻度 |
| **user control** | ユーザーが実行を制御しやすいか |
| **debuggability** | 失敗時に原因を特定しやすいか |

---

## コネクター比較表

| コネクター | value | 難易度 | credential risk | local-first | rate-limit | user control | debuggability |
|---|---|---|---|---|---|---|---|
| Human Review | ★★★★★ | 低 | なし | ✓ | なし | 完全 | 高 |
| Local Mock | ★★★★ | 最低 | なし | ✓ | なし | 完全 | 高 |
| Claude CLI | ★★★★★ | 低〜中 | 低（CLIに委譲） | ✓ | 中 | 高 | 高 |
| Codex CLI | ★★★★ | 低〜中 | 低（CLIに委譲） | ✓ | 中 | 高 | 高 |
| Gemini CLI | ★★★★ | 低〜中 | 低（CLIに委譲） | ✓ | 中 | 高 | 高 |
| Hermes Gateway | ★★★ | 中 | 低（ローカル） | ✓ | 低 | 中 | 中 |
| Grok/X Search | ★★★ | 中〜高 | 低（Hermes経由） | 条件付き | 中 | 中 | 中 |
| Direct Cloud APIs | ★★★★ | 高 | 高 | ✗ | 高 | 低 | 低 |

---

## 実装順序（決定）

### Phase A: 即時実装候補（次のマイルストーンで実装開始可）

**1位: Human Review**
- 理由: API不要、ユーザーが完全制御、ワークフローの信頼性の核
- 現状: UIは既存（HumanReviewPanel）、adapter interface のみ残
- 次のアクション: IRealConnectorAdapter を実装（ネットワーク不要）

**2位: Local Mock / Manual Connector**
- 理由: 既にほぼ動作している、テストの基盤
- 現状: `agentConnectors.ts` に実装済み、interface適合のみ
- 次のアクション: IRealConnectorAdapter に準拠させる

### Phase B: CLI経由接続（短期）

**3位: Claude CLI adapter**
- 理由: 最も価値が高く、local-first で credential リスクが低い
- 前提条件: `claude` コマンドがローカルにインストール済み
- 接続方式: Tauri shell コマンド または ブラウザ側 fetch → local proxy
- 次のアクション: Tauri 導入後に実装

**4位: Codex CLI adapter**
- 理由: Claude CLIと同等のアーキテクチャ、設計を再利用できる
- 前提条件: `codex` コマンドがローカルにインストール済み
- 次のアクション: Claude CLI 完了後に実装

**5位: Gemini CLI adapter**
- 理由: 大きなコンテキストウィンドウ、web search 内蔵
- 前提条件: `gemini` コマンドがローカルにインストール済み
- 次のアクション: Codex CLI 完了後に実装

### Phase C: Gateway経由（中期）

**6位: Hermes Gateway**
- 理由: 複数モデルへのルーティングを抽象化できる
- 前提条件: Hermes がローカルで起動していること
- 次のアクション: Gemini CLI 完了後に設計

**7位: Grok / X Search**
- 理由: Web検索特化、Hermes経由で実装
- 前提条件: Hermes が動作していること
- 次のアクション: Hermes 完了後に実装

### Phase D: 直接クラウドAPI（長期 / 慎重に）

**8位: Direct Cloud APIs（OpenAI / Anthropic / Google）**
- 理由: 最も機能が豊富だが credential リスクが最も高い
- 前提条件: OS Keychain またはサーバーサイドプロキシの実装
- 次のアクション: Tauri + OS Keychain 導入後に検討

---

## 「次に本当に実装するコネクター」

### **Claude CLI adapter**

理由:
- 最も高い value
- local-first で credential がブラウザに入らない
- Human Review と Local Mock はすでに動作しているため
- Claude CLI は既にユーザーの手元にある可能性が高い

前提タスク:
- Tauri 導入（M21以降の候補）
- または Local Proxy サーバーの設計

---

## 実装しないこと（この段階では）

- 実API接続
- API key の入力・保存
- OS Keychain
- .env ファイルの作成
- Direct Cloud API の呼び出し
