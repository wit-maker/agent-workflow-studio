# Runtime Audit Next Phase

Last updated: 2026-06-03

## Current Integrated State

The Runtime Audit worktree phase has landed the shared safe route-event path on `codex/runtime-audit-integration-base`.

| PR | Lane | Landed capability |
|---|---|---|
| #38 | Shared Contract | `runtimeAuditContract.ts` defines the safe metadata event shape and normalization boundary. |
| #40 | Runtime Events | Mock runs can derive safe `RunTrace.runtimeEvents`. |
| #41 | Durable Audit | Existing run history records can persist safe `traceAudit.runtimeEvents`; old records normalize to `[]`. |
| #42 | Run Detail Replay / Diff | `RunDetailPanel` compares two safe audit snapshots and includes runtime-event count metadata. |
| #43 | Edge HUD / Deep Link | Selected Edge HUD can open Run Detail while preserving focused edge context in session state. |

PR #39 remains the Integration Captain documentation lane and defines the merge / validation / stop conditions for this phase.

## Safety Boundary

The landed runtime audit path is safe metadata only.

- Do not include raw `node.config`, prompt body, payload body, artifact body, credential values, tokens, passwords, or API keys in events, audit summaries, Run Detail comparisons, or copy summaries.
- Do not add a new localStorage key for this phase. `traceAudit.runtimeEvents` lives inside existing run history records.
- Do not connect this to backend/API calls, real AI calls, credential storage, or adapter telemetry.
- Treat `docs/source-specs/**` as read-only source material.

## What This Is Not Yet

This phase is not a full replay system.

- No animated run replay.
- No timeline scrubber.
- No URL-level deep link router.
- No runtime policy enforcement.
- No expression evaluator for edge conditions.
- No durable approval/safety decision audit log.
- No edge-level visual route reconstruction across historical runs.

## Next Recommended Slices

1. **Edge route event diff**
   - Extend Run Detail focused edge comparison from event counts to safe event type / source / target / route metadata.
   - Keep UI inside `RunDetailPanel`.
   - Keep state session-only and storage under existing run history records.

2. **Runtime policy evaluator contract**
   - Define a mock-only evaluator contract for condition / retry / error-route behavior.
   - Start with type and pure validation helpers before changing the run engine.
   - Do not evaluate arbitrary user expressions.

3. **Replay-ready audit view model**
   - Build pure domain helpers that order safe runtime events into a replay-friendly timeline.
   - Do not add animation UI until the data contract is stable.

4. **Final integration QA pass**
   - Validate `codex/runtime-audit-integration-base` after all runtime audit PRs are merged.
   - Use Browser QA where available.
   - If the in-app Browser cannot use file picker/download or edge-click automation, supplement with direct code-path validation and report the limitation explicitly.

## Model Guidance

- Default for these implementation slices: Codex Desktop operation label `GPT-5.5 high`.
- API model id, if documented: `gpt-5.5`.
- Do not propose or continue xhigh unless the user explicitly writes `ALLOW_XHIGH`.
- Simple wording fixes and small CSS-only adjustments should be treated as `GPT-5.4-mini medium`, not `GPT-5.4 high`.
