# Real Connector Adapter Design

Last updated: 2026-05-26

## Purpose

This document defines the common connector adapter contract before any real API or CLI integration is enabled.

This phase does not call real APIs, does not add API key UI, does not create `.env` files, and does not persist credentials.

## Design Rules

1. Mock remains available by default.
2. Real execution is disabled unless readiness says `canRunReal: true`.
3. Credential values never enter browser state, logs, metrics, prompts, workflow JSON, templates, or localStorage.
4. Real adapters receive safe request input plus `CredentialRef` metadata only.
5. Not-ready execution returns sanitized `ConnectorResponse` errors.
6. Provider-specific request payloads are created inside the adapter boundary, not in UI state.

## Current Domain Files

| File | Role |
|---|---|
| `src/domain/credentialRef.ts` | Defines `CredentialRef`, credential source, and credential readiness metadata. |
| `src/domain/connectorSafety.ts` | Redacts credential-like text and restricts adapter diagnostics to safe values. |
| `src/domain/connectorRequest.ts` | Defines sanitized connector request input and optional `CredentialRef`. |
| `src/domain/connectorResponse.ts` | Defines connector response and usage summary. |
| `src/domain/connectorError.ts` | Defines sanitized connector error codes and diagnostics. |
| `src/domain/connectorReadiness.ts` | Defines readiness state, connector profiles, and mock/not-configured status. |
| `src/domain/realConnectorAdapter.ts` | Defines `IRealConnectorAdapter` and guarded `BaseRealConnectorAdapter`. |

## Request Boundary

`ConnectorRequest` carries:

- job id
- node id
- connector id
- safe input summary/content
- safe context summary
- optional `CredentialRef`
- timeout and retry limits
- sanitized metadata

It must not carry:

- credential values
- auth headers
- raw provider payloads
- raw `node.config`
- unfiltered logs or artifacts

## Readiness Boundary

`ConnectorReadiness` explains whether real execution can run.

Modes:

- `mock`: local mock execution is available; real execution is not configured.
- `not-configured`: mock is available; real execution is blocked by missing requirements.
- `real-ready`: all requirements are present and real execution may run.

Readiness includes safe credential metadata:

- whether a credential is required
- expected source such as `cli-managed`, `environment`, `os-credential-store`, or `tauri-secure-store`
- whether a `CredentialRef` exists
- availability state

Readiness must never expose credential values.

## Error Boundary

Adapter errors must be safe to show in UI, logs, and run summaries.

Allowed:

- stable error code
- sanitized message
- retryable flag
- retry-after delay
- sanitized diagnostic fields

Forbidden:

- auth header values
- API key values
- bearer tokens
- raw provider request/response dumps
- unfiltered exception objects

## Base Adapter Guard

`BaseRealConnectorAdapter.execute()` enforces:

1. request connector id must match the adapter id
2. readiness must allow real execution
3. credential-required adapters must receive `CredentialRef`
4. blocked paths return sanitized failed `ConnectorResponse`

The guard prevents not-ready adapters from reaching provider or CLI invocation code.

## Connector Order

The safest implementation order remains:

1. Human Review adapter contract
2. Manual Connector / Local Mock adapter contract
3. Claude CLI style local adapter
4. Codex CLI style local adapter
5. Gemini CLI style local adapter
6. Hermes local gateway
7. Grok/X Search through Hermes
8. Direct Cloud APIs only after secure credential storage exists

Direct browser-side cloud API calls remain blocked.

## Implementation Gate

A connector may move toward real execution only when:

- request/response/error/readiness contracts are used
- `CredentialRef` is the only credential-related value crossing into adapter input
- credential resolution happens outside normal browser storage
- readiness explains missing requirements
- cancellation and failure behavior are visible
- logs and run history remain credential-free
- build, lint, typecheck, and Browser QA pass

## Non-Goals

- no real API calls
- no API key settings
- no SDK dependency for live providers
- no Tauri secure store implementation
- no SQLite implementation
- no browser localStorage credential storage
