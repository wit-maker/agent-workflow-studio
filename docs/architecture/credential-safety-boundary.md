# Credential Safety Boundary

Last updated: 2026-05-26

## Goal

This document defines the credential-safe boundary that must be in place before Agent Workflow Studio adds any real AI adapter.

The boundary exists to keep the product:

- safe to use
- visible to understand
- reusable after success

Credential values are not ordinary app data. They must be treated as protected material, not as workflow content, not as UI state, and not as exportable history.

## Source Alignment

This note follows:

- `docs/project/PROJECT_GOAL.md`
- `docs/project/SOURCE_OF_TRUTH.md`
- `docs/source-specs/01_要件定義書_完全版.md`
- `docs/source-specs/04_システム設計書_データモデル_実行基盤_完全版.md`
- `docs/source-specs/06_QA_セキュリティ_受け入れ基準_完全版.md`
- `docs/source-specs/situation-assistant/05_AIエージェント運用設計書_状況補佐官_完全版.md`

If a future implementation conflicts with this boundary, stop and create a decision note before shipping real adapter behavior.

## Core Position

Credential values are not part of the normal browser-side product state.

They must not be stored in:

- workflow JSON
- template data
- run history
- run log
- metrics
- prompt text
- UI state
- localStorage
- exported bundle
- browser console
- audit artifacts

`CredentialRef` is allowed as metadata. Raw credential values are not.

## Terms

### Credential value

The actual secret used for authentication or authorization, such as:

- API key
- bearer token
- access token
- refresh token
- password
- secret string

### CredentialRef

A non-secret reference that identifies which credential should be used at runtime, for example:

- provider id
- credential slot id
- alias
- environment source label
- secure-store record id

`CredentialRef` must be useless without the secure credential boundary that resolves it.

## Storage Rules

### Never persist these values

The following are always prohibited from browser persistence and product data structures:

- credential values
- full prompt text that includes secrets
- raw provider request payloads
- raw provider response payloads that echo secrets
- free-text node config that may contain secrets

### Allowed to persist

The following may be saved if they stay non-secret:

- selected tab
- panel visibility
- canvas layout
- workflow structure
- template metadata
- run history summary
- mock/real mode availability flags
- connector capability flags
- `CredentialRef` presence only, if the product later adopts it explicitly

### localStorage policy

Allowed in localStorage:

- app UI settings
- workflow draft state
- template metadata and content that exclude credentials
- run history summaries that exclude credentials, prompt bodies, raw payloads, and artifact bodies

Forbidden in localStorage:

- credential values
- provider auth headers
- API key settings
- prompt bodies that embed secrets
- raw execution payloads
- artifact content copied from secured systems
- node config free text when it may contain secrets

## Settings UX Boundary

Settings UX must separate three classes clearly.

### 1. User may input

These may be typed into normal browser settings fields:

- provider enable/disable flags
- connector labels
- default model names
- timeout values
- retry counts
- rate limit preferences
- mock/real mode preference

### 2. User may see

These may be displayed in UI:

- whether a credential is configured
- which provider a credential belongs to
- last validation time
- source type such as `OS store`, `Tauri secure store`, or `CLI-managed`
- readiness errors such as `not configured` or `auth failed`

### 3. User may save in app storage

These may be saved to localStorage or workflow-adjacent state:

- non-secret connector preferences
- non-secret adapter readiness cache
- non-secret mode switches
- non-secret feature flags

These must not be accepted into normal app storage:

- API key text
- token text
- password text
- secret pasted into node config
- credential pasted into prompt editor or connector settings

If the UI later adds credential entry, that flow must write directly to a secure store boundary and never to normal React state or localStorage.

## Prompt Boundary

Credential values must never cross into prompt construction.

This applies to:

- workflow execution prompts
- briefing prompts
- evaluation prompts
- future adapter request builders

Rules:

- prompt builders may receive workflow state, logs, metrics, run history summaries, and safe derived text
- prompt builders must not receive credential values
- prompt builders must not receive full `node.config` free text
- prompt builders must not serialize raw request payloads or auth headers
- if a connector needs authentication, the prompt path still receives only safe business context

Real adapter authentication is an execution concern, not a prompt concern.

## Log Boundary

Credential values must never cross into logs.

Rules:

- UI logs must not print secrets
- run history must not store secrets
- console warnings must not include secrets
- adapter error objects must be sanitized before logging
- auth failures may record code and provider, but not credential text

Allowed log examples:

- `Claude adapter not configured`
- `OpenAI adapter auth failed`
- `Gemini adapter timeout`

Forbidden log examples:

- `Authorization: Bearer sk-...`
- `apiKey=...`
- full request dump with headers

## Adapter Boundary

Real adapter design must keep credential resolution inside the secure boundary.

### Mock adapter

- receives safe request input only
- never needs a credential
- is always allowed in browser-only MVP
- must not simulate by storing fake keys in state

### Real adapter

- receives safe request input plus `CredentialRef`
- does not receive raw credential value from UI state
- resolves the value only inside the secure credential boundary
- must sanitize errors before returning them to UI, log, or history layers

Conceptual boundary:

```text
UI / Workflow / Prompt Builder
  -> Safe adapter request + CredentialRef
  -> Credential boundary resolves secret internally
  -> Real adapter executes
  -> Sanitized response / error returns outward
```

If the app cannot supply a secure resolution path, the real adapter must stay disabled.

## Mock / Real Switching Rule

The default mode remains mock.

A connector may switch from mock-capable to real-capable only when all conditions are true:

1. A documented `CredentialRef` contract exists.
2. Credential resolution exists outside normal browser storage.
3. Readiness check can prove whether the connector is configured.
4. Prompt boundary is verified not to receive secret values.
5. Log boundary is verified not to emit secret values.
6. Browser UI can show `configured / not configured / failed` without exposing the secret.
7. QA includes credential-boundary checks.

If any condition is false:

- the connector remains mock-only, or
- the real path is present but disabled with a visible readiness reason

## Future Storage Direction

This document assumes a future secure store migration path.

Preferred direction:

1. Tauri secure store or OS credential store
2. `CredentialRef` persisted as non-secret metadata only
3. secure value resolved only inside desktop/native boundary

Examples of acceptable future backends:

- Windows Credential Manager
- macOS Keychain
- Tauri secure storage plugin
- OS-managed CLI credential environment outside this app

Explicit non-goals for this phase:

- no real AI API integration
- no API key entry UI
- no credential persistence
- no Tauri introduction
- no SQLite introduction

## Browser QA Checklist

Before enabling any real adapter path, verify:

1. No credential value appears in React-rendered UI.
2. No credential value appears in browser console output.
3. No credential value appears in localStorage.
4. No credential value appears in workflow JSON export.
5. No credential value appears in templates.
6. No credential value appears in run history.
7. No credential value appears in logs or metrics panels.
8. Prompt generation inputs remain credential-free.
9. `node.config` free text is excluded from prompt/log collection paths that may leave the secure boundary.
10. Mock adapter still works with no credential configured.
11. Real adapter remains disabled when secure resolution is unavailable.
12. Readiness UI shows only safe status text such as `configured`, `not configured`, or `auth failed`.

## Implementation Consequences

Before implementing a real adapter, the codebase should introduce these concepts explicitly:

- `CredentialRef` domain type
- secure credential resolver boundary
- sanitized adapter error contract
- readiness contract for mock/real capability
- settings UX separation between normal preferences and secret entry

The browser-side app should continue to treat credentials as out-of-band until a secure desktop boundary exists.
