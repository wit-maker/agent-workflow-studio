# Model routing

Use the GPT-5.6 family by responsibility and measured workload.

- `gpt-5.6-sol`, high: upstream architecture and high-consequence acceptance
  decisions.
- `gpt-5.6-terra`, medium by default: project management, read-heavy integration work,
  separate-session review, correction routing, merge, and base validation.
- `gpt-5.6-luna`, medium by default: bounded implementation in a serialized or
  isolated lane. Use `high` for runtime, concurrency, security boundaries, or
  a measured quality gain. Escalate architecture ambiguity instead of silently
  expanding scope.

Keep prompts lean and outcome-oriented. State each durable rule once. Every
assignment must include the outcome, base SHA, branch, worktree, allowed paths,
task shape, dependencies, acceptance IDs, required validation, authority
boundaries, and stop rules.

Do not enable Pro mode, persisted reasoning, API multi-agent beta, explicit
prompt caching, or programmatic tool calling merely because GPT-5.6 supports
them. Adopt optional capabilities only against a measured failure or an
explicit product requirement.

Project agents live in `.codex/agents/`. Repo skills live in
`.agents/skills/`, which Codex discovers from the working directory up to the
repository root.
