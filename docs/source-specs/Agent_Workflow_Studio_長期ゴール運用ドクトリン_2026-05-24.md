# Agent Workflow Studio 長期ゴール運用ドクトリン

作成日: 2026-05-24

## 1. 目的

Agent Workflow Studio の長期ゴールを、日々のCodex / Claude Code作業に落とし込むための運用ドクトリン。

この文書は、機能要望リストではなく、AI coding agentが判断に迷ったときの上位原則である。

## 2. 長期ゴール

```text
Agent Workflow Studio は、複数AIエージェントを安全に編成し、
AI作業を設計・実行・観測・検査・改善・再利用できる、
ローカル優先のAIワークフロー作業OSである。
```

## 3. MVPの位置づけ

現在のMVPは完成形ではない。最大構想の入口である。

MVPを理由に以下をしてはいけない。

- 長期Goalを縮小する
- 安全ゲートを外す
- Source of Truthを曖昧にする
- その場の便利機能を優先してデータモデルを壊す
- 実行ログ、観測、再利用を後回しにしすぎる

## 4. 判断基準

すべての実装判断は、次の問いで判定する。

```text
この変更は、ユーザーがAIエージェント群をより安全に、より見える形で、より再利用可能に運用することに近づくか？
```

近づくなら採用候補。近づかないなら後回し。

## 5. Codex / Claude Code の役割

| 役割 | 主用途 |
|---|---|
| Codex | 継続実装、リポジトリ内の変更、build / lint / Browser QA、PROJECT_STATE更新 |
| Claude Code plan mode | 実装前Plan、設計レビュー、仕様ズレ検出、リスク抽出 |
| Claude Code implementation | 承認済みPlanに基づく実装 |

## 6. モデル指定

このリポジトリのGoal / Plan / Source of Truth / 安全境界に触れる作業では以下を指定する。

```text
推奨: GPT-5.5 xhigh
許容: GPT-5.5 high
```

通常実装や小修正では、作業影響範囲に応じて `GPT-5.5 high` を許容する。

現在モデルが不明または不一致の場合、作業を始めず停止する。

## 7. Plan-first運用

大きな変更では、最初にPlanだけ作る。

Planには最低限以下を含める。

- 現状確認
- 今回フェーズのGoal
- 対象ファイル
- 実装順序
- データモデル影響
- UI影響
- 安全・QA影響
- 検証方法
- リスク
- 人間確認が必要な点

## 8. Stop Rules

以下の場合は実装しない。

- モデルが未確認
- Goalと作業が矛盾している
- Source of Truthの優先順位が不明
- Credential値を保存しそうになっている
- 外部API接続をAdapterなしで直結しようとしている
- main / developへ直接反映が必要になっている
- 1PRとして大きすぎる
- Browser QA不能なのに完了扱いにしようとしている

## 9. 次の正しい一歩

現在MVPから最大構想へ進む第一歩は、大規模実装ではなく棚卸しである。

```text
feat: audit current MVP against full Agent Workflow Studio goal
```

作成物:

```text
docs/audit/current-implementation-map.md
docs/audit/spec-coverage-matrix.md
docs/audit/missing-systems.md
docs/audit/technical-debt.md
```
