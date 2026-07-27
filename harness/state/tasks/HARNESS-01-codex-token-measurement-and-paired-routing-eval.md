---
id: HARNESS-01
schema_version: 1
title: Codex Token Measurement and Paired Routing Eval
status: todo
role: implementation
actor: unassigned
branch: -
base_commit: 316358b53d00cabc1ff895cef086e7c30261cc18
verified_commit: -
depends: [ENCODING-01]
task_shape: isolated-lane
required_evidence: [unit, diff-boundary, doctor, pilot]
allowed_paths: [tools, harness, tests, docs/tasks]
forbidden_paths: [package.json, package-lock.json, docs/source-specs, src, src-tauri, .env]
created: 2026-07-27T20:01:45+00:00
updated: 2026-07-27T20:01:45+00:00
---

# HARNESS-01 Codex Token Measurement and Paired Routing Eval

## User outcome

The team can collect safe, reproducible Codex exec JSONL token aggregates and compare shared-single-writer/subagent with isolated-lane/worktree through a controlled pilot before policy thresholds are adopted.

## Acceptance criteria

- Parse only `codex exec --json` JSONL usage events and aggregate non-negative integer `input_tokens`, `cached_input_tokens`, `output_tokens`, and `reasoning_output_tokens` per turn without double-counting cached or reasoning tokens in the basic total.
- Record source/version, completeness, safe model/profile ID, reasoning effort, task shape, duration, exit, acceptance, commit/branch, and sanitized-log hash; missing usage is `unavailable`, never zero.
- Never track raw JSONL, prompts, response text, command arguments, credentials, or environment dumps. Add negative leakage tests.
- Provide a controlled paired-eval runner and pilot plan for shared-single-writer/subagent versus isolated-lane/worktree only. Use the same model, reasoning, prompt template, base, fixture, acceptance, and validation; alternate/randomize order.
- Pilot first; only then schedule three archetypes x three repeats. Do not treat V2-02 as comparative evidence and do not adopt routing thresholds before results.

## Definition of ready

- `ENCODING-01` is done; this task uses its automatic guard.
- No dependency, external collector, API key, OTel exporter, or external paid service is permitted.

## Definition of done

- Parser/unit, safety, doctor, pilot evidence, encoding check, and task validation pass; pilot records Codex token consumption as a controlled local eval cost.

## Allowed paths

- (define)

## Required evidence

- (define)
