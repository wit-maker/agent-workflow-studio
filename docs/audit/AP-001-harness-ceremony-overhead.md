# AP-001: Harness Ceremony Overhead

## Anti-pattern

Treating auditability as ceremony: adding task registration, evidence, closure,
lane, or worktree steps to a simple workflow until coordination becomes the
work.

### Observable symptoms

- A small implementation is split across multiple PRs or repeated lane changes.
- The first checkpoints contain plans, handoffs, or metadata but no useful diff
  or test result.
- Actual implementation starts late, while coordination consumes a
  disproportionate share of time or tokens.
- A task-registration or closure PR exists without an implementation outcome.

## Cause

The team optimizes for visible audit ceremony instead of proportional,
implementation-linked auditability. Evidence and metadata become deliverables
unto themselves rather than a safe record attached to a real change.

## Routing rule

- Read-only investigation goes to a subagent.
- An obvious, bounded micro change uses a direct/shared single writer.
- Use an isolated worktree only for concurrent isolation, long-lived or broad
  work, destructive or high-risk work, or genuinely independent provenance.
- Do not create a task-registration or closure PR. Keep task metadata and
  evidence alongside an implementation PR, or in ignored runtime state when no
  implementation PR exists.
- The first checkpoint must include an actual diff and a test or validation
  result. One plan-only checkpoint is steered back to implementation; a second
  plan-only checkpoint is replaced with a better execution route.

## Cost guard

Before selecting a lane, record expected setup/coordination effort and expected
implementation effort. Do not select a worktree when expected setup and
coordination are greater than or equal to implementation effort unless a
concrete override is recorded (for example, concurrent isolation, high-risk
change, or independent provenance).

Measure setup/coordination and implementation effort on selected real tasks.
Use those measurements to improve routing; never intentionally benchmark an
obviously worse route merely to produce a comparison.

## Terra DoD checklist

- [ ] The selected route matches the routing rule, with any cost-guard override
      stated and justified.
- [ ] The first checkpoint contains a real diff and test/validation evidence.
- [ ] The PR contains implementation work; no task-registration or closure-only
      PR was opened.
- [ ] Metadata and evidence are attached to the implementation PR or remain in
      ignored runtime state.
- [ ] Setup/coordination and implementation effort are recorded for the real
      task, with no contrived route comparison.
- [ ] Terra reviewed the exact implementation commit and confirmed the allowed
      paths, safety boundaries, and required validation.
