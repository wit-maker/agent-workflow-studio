# Connector Implementation Order

M20 decides the connector implementation order. It does not start any real API connection work.

## Why Real APIs Are Not Started Now

Direct real API execution would require credential input, credential storage, provider-specific error handling, rate-limit policy, audit logging, and a secure desktop boundary. Those are intentionally outside the current scope. The current app remains local-first and mock/manual by default.

This milestone only records the order, readiness conditions, and implementation gates so the next milestone can start from the safest connector surface.

## Decision

| Order | Connector | Phase | Status | Value | Difficulty | Credential risk | Local-first | Rate-limit risk | User control | Debuggability |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Human Review | M21 candidate | ready-next | 5 | 1 | 1 | 5 | 1 | 5 | 5 |
| 2 | Manual Connector / Local Mock | M21 candidate | ready-next | 4 | 1 | 1 | 5 | 1 | 5 | 5 |
| 3 | Claude CLI style local adapter | after manual/human connector | recommended | 5 | 2 | 2 | 4 | 3 | 4 | 4 |
| 4 | Codex CLI style local adapter | after first CLI adapter | recommended | 4 | 2 | 2 | 4 | 3 | 4 | 4 |
| 5 | Gemini CLI style local adapter | after first CLI adapter is stable | later | 4 | 3 | 2 | 4 | 3 | 4 | 3 |
| 6 | Hermes local gateway | after CLI adapters | research-needed | 3 | 3 | 2 | 4 | 2 | 3 | 3 |
| 7 | Grok/X Search via Hermes | after Hermes is proven | blocked | 3 | 4 | 3 | 2 | 4 | 3 | 2 |
| 8 | Direct Cloud APIs | deferred | blocked | 4 | 5 | 5 | 1 | 5 | 2 | 2 |

Scores use 1-5, where higher value, local-first compatibility, user control, and debuggability are good; higher difficulty, credential risk, and rate-limit risk are worse.

## Connector Notes

### 1. Human Review

Human Review is the safest next connector because it does not require network calls or credentials. It also anchors the workflow around explicit user approval, which is important before any automated real execution path is introduced.

Next requirement: wrap the existing review flow with the real connector adapter interface.

### 2. Manual Connector / Local Mock

Manual Connector / Local Mock proves request, response, error, queue, import/export, and UI behavior without external side effects. It should be implemented before local CLI connectors so the adapter lifecycle is exercised with a safe connector.

Next requirement: promote the current mock execution path into an adapter-conformant manual connector.

### 3. Claude CLI Style Local Adapter

Claude CLI style integration is a strong next candidate after the manual/human connectors. It can keep credentials outside the app by relying on the user's local CLI setup, but it still requires a command execution boundary and readiness checks.

Next requirement: define CLI discovery, command invocation, cancellation, output capture, and failure reporting without invoking real commands from the browser runtime.

### 4. Codex CLI Style Local Adapter

Codex CLI style integration is similar to the Claude CLI shape and can reuse the local CLI adapter contract. It should follow the first proven CLI adapter or be designed in parallel while implementation remains gated.

Next requirement: reuse the CLI adapter lifecycle and confirm Codex-specific readiness and output conventions.

### 5. Gemini CLI Style Local Adapter

Gemini CLI may add value for large-context or search-assisted tasks, but it should wait until the common CLI adapter lifecycle is stable.

Next requirement: confirm CLI readiness, streaming behavior, and rate-limit reporting.

### 6. Hermes Local Gateway

Hermes can centralize routing to multiple model/search backends, but it adds a local service boundary. It needs its own process discovery and health model before implementation.

Next requirement: document local gateway discovery, health checks, routing, and failure modes.

### 7. Grok/X Search Via Hermes

Grok/X Search should go through Hermes rather than direct browser-side API calls. It remains blocked until Hermes exists and search credential policy is explicit.

Next requirement: wait for Hermes readiness and define search-specific rate-limit and credential policy.

### 8. Direct Cloud APIs

Direct Cloud APIs are deferred. They have the highest credential risk, the highest rate-limit risk, and the weakest local-first compatibility in the current browser-only architecture.

Next requirement: introduce an approved secure credential boundary before any direct cloud API implementation.

## Credential Risk Handling

- Do not store credential values in UI state, localStorage, templates, logs, metrics, or exported bundles.
- Do not create `.env` files as part of connector implementation.
- Do not introduce OS Keychain, Tauri secure storage, or a backend credential vault in this milestone.
- Prefer local CLI adapters where credentials remain under the user's existing CLI configuration.

## Local-First Policy

The app should remain useful without network access and without live credentials. Human Review and Manual Connector / Local Mock are therefore first. Local CLI adapters are preferred over direct cloud APIs because they preserve more user control and keep secrets outside the app.

## First Real Implementation Candidates

Most likely next implementation:

1. Human Review
2. Manual Connector / Local Mock

Next candidates after that:

1. Claude CLI style local adapter
2. Codex CLI style local adapter

Deferred:

1. Direct Cloud APIs
2. Grok/X Search until Hermes exists

## Implementation Start Conditions

Start connector implementation only when all of these are true:

- `IRealConnectorAdapter` request/response/error/readiness boundaries are used.
- Readiness can explain why real execution is unavailable.
- The connector can run without storing credentials in this app.
- Failure and cancellation behavior are visible in the UI.
- Export/import does not include secrets.
- Build, lint, and Browser QA pass.
