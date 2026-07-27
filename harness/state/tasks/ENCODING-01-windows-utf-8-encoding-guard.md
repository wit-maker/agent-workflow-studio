---
id: ENCODING-01
schema_version: 1
title: Windows UTF-8 Encoding Guard
status: todo
role: implementation
actor: unassigned
branch: -
base_commit: 316358b53d00cabc1ff895cef086e7c30261cc18
verified_commit: -
depends: []
task_shape: isolated-lane
required_evidence: [unit, diff-boundary, doctor, encoding-check, typecheck, lint, build]
allowed_paths: [tools/fable5_harness.py, harness, .agents/skills/fable5-harness, .codex/agents, AGENTS.md, .gitattributes, .editorconfig, tests, docs/tasks]
forbidden_paths: [docs/source-specs, package.json, package-lock.json, src, src-tauri, .env]
created: 2026-07-27T20:02:04+00:00
updated: 2026-07-27T20:02:04+00:00
---

# ENCODING-01 Windows UTF-8 Encoding Guard

## User outcome

Windows operators and agents can safely read and edit repository text without copying terminal mojibake back into tracked files, and every done task fails closed on new encoding corruption.

## Acceptance criteria

- Define one canonical Windows PowerShell 5.1 safe-I/O rule in `harness/HARNESS.md`; skill and Sol/Terra/Luna entrypoints reference it without duplicating divergent instructions.
- Add `.gitattributes` and `.editorconfig` declaring UTF-8 text policy without a repository-wide EOL rewrite; new or changed text is UTF-8 without BOM.
- Add a standard-library-only `encoding check` command and integrate it automatically into done-task validation for base-to-verified changes, tracked harness records, and commit subject/body.
- Add `encoding check-pr --pr <N>` that obtains GitHub PR JSON through Python subprocess bytes with strict UTF-8 decode and never persists the raw title/body.
- Fail safely for invalid UTF-8, UTF-16/32 BOM, NUL-heavy text, replacement characters, and high-confidence Latin/CP1252 or Japanese CP932-style mojibake; report only safe file/line/reason and never auto-repair.
- Exclude binary signatures/extensions and unchanged legacy text from the changed-file gate. Test fixtures construct corrupted bytes/code points without storing mojibake literals in tracked prose.
- Add focused tests for valid Japanese/English/emoji, BOM policy, CP932/UTF-16/NUL/replacement input, both mojibake families, rare-CJK false-positive avoidance, changed-only behavior, commit metadata, mocked PR decoding, paths with spaces, and UTF-8 stdout/stderr.
- No product UI/runtime, source spec, dependency, Tauri/Rust/SQLite, API, credential, or storage-key changes; Browser QA is not required because this task changes no UI.

## Definition of ready

- Base is `316358b53d00cabc1ff895cef086e7c30261cc18`; V2-02 is done and no product lane is active in this checkout.
- Windows PowerShell 5.1 default decoding is treated as unsafe for repository text; all inspection uses explicit UTF-8 reads.

## Definition of done

- `doctor`, `validate schema`, `encoding check`, focused unit tests, typecheck, lint, build, and `git diff --check` pass on the exact verified commit.
- `validate task --task ENCODING-01` proves encoding validation cannot be omitted by a future done task.

## Required evidence

- (define)
