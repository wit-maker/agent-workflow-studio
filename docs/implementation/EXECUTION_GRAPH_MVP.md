# Execution Graph MVP

Last updated: 2026-05-23

## 目的

Phase 3 の目的は、既存のローカルモック実行を「順番に成功するだけの表示」から、
どこで止まったか、なぜ止まったか、どこへ retry / review / error が分岐したかを見える状態へ進めることです。

## status 一覧

- `queued`: 実行待ち
- `running`: 実行中
- `success`: 成功
- `failed`: 失敗
- `review_required`: 確認待ち
- `skipped`: スキップ
- `retry_ready`: 再試行可能

## route kind 一覧

- `main`: 通常経路
- `error`: エラー経路
- `retry`: 再試行経路
- `review`: 確認経路
- `skip`: スキップ経路

## retry / review / error の扱い

- Check ノードはローカルルールで `PASS` / `REVIEW` / `FAIL` に分岐する。
- `REVIEW` の場合は `review_required` として停止し、BottomMonitor から承認 / 差し戻し / スキップできる。
- `FAIL` の場合は `failed` として停止し、retry candidate を追加する。
- retry は対象ノード単体のモック再試行のみで、後続ノード全体の再実行はまだしない。
- Human Review はローカル状態のみで扱い、永続化や外部承認連携はまだしない。

## MVP外

- 実API接続
- 複雑な非同期エンジン
- 並列実行制御
- Web Worker
- review / retry の永続化
- 複数run比較ビュー
- ドラッググラフ描画
