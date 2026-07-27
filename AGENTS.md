# AGENTS.md - Agent Workflow Studio

## Commands

- Install: `npm ci`
- Dev: `npm run dev`
- Preview: `npm run preview -- --host 127.0.0.1 --port 4178`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`

変更後は `typecheck`、`lint`、`build` を必ず実行する。
UI変更時は Browser QA または headless QA を行う。できない場合は理由と代替検証を書く。

## Project Rule

このリポジトリは、AI作業を設計・実行・観測・改善・再利用するローカル優先のAIワークフローOS。
汎用ワークフローエディタ、n8n clone、React Flow demo、mock-only prototype に寄せない。

仕様判断は `docs/project/SOURCE_OF_TRUTH.md` に従う。
`docs/source-specs/**` は原文仕様として扱い、勝手に一般論へ置き換えない。

## Work Flow

作業は可能な限り最後まで進める。

1. 現状確認
2. 実装または修正
3. 検証
4. 必要最小限のdocs更新
5. commit
6. push
7. PR作成または更新
8. merge可能ならmerge
9. base / integration branch を pull
10. base validation
11. 最終報告

実装完了、commit、push、PR作成、merge、base validation が残っていることを理由に停止しない。

## Git Rules

作業開始時に必ず実行する。

- `git rev-parse HEAD`
- `git branch --show-current`
- `git status --short`

ルール:

- 予期しない dirty worktree なら停止
- `git add .` 禁止
- 変更ファイルだけ明示して add
- 1 lane = 1 thread = 1 worktree = 1 branch / PR
- 同じ checkout を複数 thread で編集しない
- main へ直接作業しない

## Model Policy

Fable5 Harness の責務分離を使う。正本は `harness/HARNESS.md`。

- `gpt-5.6-sol` / high: 上流の製品方針・architecture・受け入れ条件のみ
- `gpt-5.6-terra` / high: PM、task分割・割当、PRレビュー、修正循環、merge、base validation
- `gpt-5.6-luna` / high: 専用worktreeでの実装・test・commit・push・PR作成

実装laneは1 task = 1新規Luna session = 1 worktree = 1 branch / PR。
Lunaは自分のPRをmergeしない。Terraがexact commitをreviewし、修正ありなら
同じLuna laneへ戻し、承認後にmergeしてから次の新規Luna sessionを作る。

`xhigh` はユーザーが `ALLOW_XHIGH` と明示した場合のみ使用する。
現在モデルが不明、または作業リスクに対して不足している場合のみ停止する。

## Fable5 Harness

プロジェクト管理・handoff・evidence・review・lane監査では
`.agents/skills/fable5-harness/SKILL.md` を使用する。

- 開始: `python tools/fable5_harness.py doctor`
- 整合性: `python tools/fable5_harness.py validate`
- 現況再生成: `python tools/fable5_harness.py state`
- 検証記録:
  `python tools/fable5_harness.py evidence run --task <ID> --actor luna -- <command>`

raw prompt、credential、provider payload、artifact本文、environment dumpを
Evidenceのcommand・note・logへ渡さない。

## Stop Conditions

以下の場合のみ停止する。

- 予期しない dirty worktree
- merge conflict
- typecheck / lint / build が直せない
- forbidden file 編集が必要
- dependency / backend / API / credential / storage key 変更が必要
- destructive git 操作が必要
- GitHub 権限エラー
- ユーザー承認が明示されている
- `ALLOW_XHIGH` が必要だが未提供

## Safety

禁止:

- `.env` / API key / credential / token / password の保存・表示・commit
- raw prompt / raw payload / credential の HUD・audit・summary・copy 混入
- 明示承認なしの実API接続
- Adapterなしの外部サービス直結
- mock connector を real 扱いすること
- 勝手な dependency 追加
- 勝手な localStorage key 追加

HUD、Run Detail、audit、summary、copy text は安全な派生 metadata のみ使う。

## Report

PR本文と最終報告は、開発者用語より先にユーザー機能で説明する。

必ず最初に書く。

> この変更でユーザーは何ができるようになったか:

悪い例:

> runtime audit contract を追加した。

良い例:

> ユーザーは、ワークフロー実行経路を prompt や credential を漏らさず HUD で確認できるようになった。
