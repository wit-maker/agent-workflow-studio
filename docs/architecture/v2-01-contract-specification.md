# V2-01 Contract Specification: Evidence-first Run Boundary

- Status: Draft contract for Terra PM review
- Slice: V2-01 Contract Specification
- Contract version: `2.0`
- Scope: stable names, public interfaces, ownership, lifecycle, invariants, versioning, identity, and v1 compatibility
- Implementation status: specification only; no runtime, storage, Tauri, connector, or UI implementation is authorized by this document

This is the canonical V2-01 contract document. It refines the execution spine accepted by [`v2-evidence-first-adr.md`](./v2-evidence-first-adr.md) without changing the Evidence-first architecture or the source specifications. Future implementation documents and code must link here when they use a V2 contract name.

## 1. Contract boundary and vocabulary

The V2 product loop remains:

```text
compile → execute → observe → approve → replay → compare → promote to recipe
```

The durable direction is:

```text
WorkflowDocumentV2
  → immutable ExecutionPlan
  → Capability / Policy / ApprovalGate
  → trusted executor
  → append-only RunEventEnvelope sequence
  → RunSnapshot / RunRecord
  → Attention / Briefing / Comparison projections
  → immutable RecipeRevision / FailurePattern
```

The following terms have one meaning in V2:

| Name | Meaning | Authority |
|---|---|---|
| `WorkflowDocumentV2` | Versioned, editable workflow definition and its immutable revision identity | authoring and compile input |
| `ExecutionPlan` | The compiled, run-scoped plan; immutable after execution starts | trusted runtime input |
| `Capability` | An operation class requested by a plan | capability declaration |
| `Policy` | A versioned rule evaluation for a capability and scope | allow/deny/review decision |
| `ApprovalGate` | A scoped human decision required before a gated operation can proceed | approval lifecycle |
| `RunEventEnvelope` | One append-only, safe execution fact | single source of truth for facts |
| `RunSnapshot` | A materialized state reconstructed from an event prefix | restart/read optimization, never authority |
| `RunRecord` | A durable run index and safe summary | lookup and history index |
| `AttentionProjection` | Safe attention-allocation signals for HUD and detail surfaces | pure projection |
| `BriefingProjection` | Safe past/present/future explanation derived from evidence | pure projection |
| `ComparisonProjection` | Safe comparison of compatible run evidence | pure projection |
| `RecipeRevision` | Immutable reusable asset promoted from explicitly approved evidence | reuse asset |
| `FailurePattern` | Immutable, traceable failure learning derived from safe evidence | learning asset |

`RunEventEnvelope` is the only execution-fact authority. A snapshot, record, projection, recipe, or failure pattern may summarize or index events, but cannot create a competing runtime fact.

Ownership is split at the boundary:

- React owns workflow authoring, safe command requests, event subscription, and projection display. It does not own execution, event append, credentials, files, CLI processes, or real external APIs.
- The future trusted runtime owns document validation, plan compilation, capability/policy enforcement, approval gates, process lifecycle, cancellation, controlled artifact references, event append, and durable run persistence.
- The event store owns ordered append/replay mechanics only; it does not decide policy or approval.
- Projection code owns deterministic safe derivation only; it cannot append events or promote assets.
- A legacy migration adapter owns read-only normalization and warning reporting. It cannot overwrite v1 data or make a summary more authoritative than a V2 event sequence.

Lifecycle is explicit: editable document revision → validated revision → immutable execution plan → queued/running run → observed event sequence → approval or terminal outcome → snapshot/record reconstruction → replay/compare projections → explicitly approved recipe or failure-pattern asset. A terminal run is not edited in place; a retry, replay, or revised recipe creates a new identity and preserves the source evidence.

## 2. Common identity, versioning, and safety rules

### 2.1 Identity rules

- `workflowId` identifies one logical workflow across revisions. It is stable until an explicit migration or fork decision.
- `revisionId` identifies one immutable `WorkflowDocumentV2` revision. `revision` is a monotonically increasing display/order number within a `workflowId`; it is not a timestamp.
- `planId` identifies one compiled plan. A plan belongs to exactly one `workflowId`, `revisionId`, and `runId`.
- `runId` identifies one execution attempt. Retries and replay runs receive their own `runId` and reference their source run where applicable.
- `eventId` identifies one event. `sequence` is the strictly increasing position of that event within a `runId`.
- `snapshotId`, `recordId`, `recipeId`, `recipeRevisionId`, and `failurePatternId` are opaque identifiers with no user or provider data encoded in them.
- IDs are references, not content containers. An ID or hash never authorizes access to a secret or artifact body.

### 2.2 Version rules

- Every persisted V2 contract has a `schemaVersion`; every public command and projection has a `contractVersion`.
- V2-01 defines `2.0` as the initial contract version. A minor, additive revision may add optional fields without changing the meaning of existing fields. A breaking change requires a new major version and an explicit adapter or migration decision.
- `WorkflowDocumentV2.revisionId`, `ExecutionPlan.planId`, and `RunEventEnvelope.sequence` are immutable identity components; changing content creates a new revision, plan, or event rather than editing an existing one.
- Readers may ignore unknown additive fields, but must not guess at unknown event types, statuses, capabilities, or policies. They must surface an incomplete/unsupported result.
- A migration must be deterministic, preserve the source record, report warnings, and never silently turn unknown data into a successful V2 fact.

### 2.3 Safe-data rules

Contract examples, events, projections, audit records, and copy text use only derived metadata such as identifiers, status, route kind, counts, bounded reason codes, timestamps, durations, and references.

The V2 public boundary never stores, displays, copies, or places in fixtures: raw prompts, raw payloads, provider bodies, artifact bodies, credentials, tokens, passwords, API keys, or unbounded node configuration. Artifact access is by an opaque `artifactRef` subject to a later controlled-access gate. A safe summary is not a substitute for the excluded body.

## 3. `WorkflowDocumentV2`

`WorkflowDocumentV2` is the canonical editable/saveable input to compilation. It is a workflow definition, not a run, event log, projection, or artifact store.

```ts
type WorkflowDocumentV2 = {
  schemaVersion: '2.0'
  workflowId: string
  revisionId: string
  revision: number
  title: string
  nodes: readonly WorkflowNodeV2[]
  edges: readonly WorkflowEdgeV2[]
  runConfig: WorkflowRunConfigV2
  metadata: WorkflowMetadataV2
}

type WorkflowRunConfigV2 = {
  mode: 'full' | 'partial' | 'dry-run' | 'validate' | 'replay'
  targetNodeIds?: readonly string[]
  maxRetries?: number
  timeoutMs?: number
}

type WorkflowMetadataV2 = {
  createdAt: string
  updatedAt: string
  tags?: readonly string[]
  sourceWorkflowId?: string
  sourceRunId?: string
}

type WorkflowNodeV2 = {
  nodeId: string
  nodeType: string
  category: string
  title: string
  role?: string
  capabilityRefs: readonly string[]
  policyRefs: readonly string[]
  inputPortIds: readonly string[]
  outputPortIds: readonly string[]
  safeMetadata?: Readonly<Record<string, string | number | boolean | null>>
}

type WorkflowEdgeV2 = {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  sourcePortId?: string
  targetPortId?: string
  routeKind: 'main' | 'condition' | 'retry' | 'error' | 'review' | 'skip'
  capabilityRefs: readonly string[]
  policyRefs: readonly string[]
}
```

`WorkflowDocumentV2` invariants:

- `workflowId`, `revisionId`, and every node/edge ID are non-empty and unique in their scope.
- Every edge references existing nodes; ports and capability/policy references are validated during compilation.
- A document revision is immutable once used to create an `ExecutionPlan`. Editing creates another revision and cannot mutate a running plan.
- `runConfig` selects execution intent and limits; it does not grant capabilities or bypass policy/approval.
- `safeMetadata` is allowlisted derived metadata. It is not a place for prompt, payload, credential, artifact, or arbitrary configuration bodies.

The canonical V2 name is `edges`. The compatibility layer accepts legacy `connections` as an input alias only; it does not make the legacy shape the V2 public contract.

## 4. `ExecutionPlan`

`ExecutionPlan` is produced at execution start from one validated document revision and is immutable for that run.

```ts
type ExecutionPlan = {
  schemaVersion: '2.0'
  planId: string
  runId: string
  workflowId: string
  revisionId: string
  compiledAt: string
  planFingerprint: string
  steps: readonly ExecutionPlanStep[]
  edgeOrder: readonly string[]
  capabilityRefs: readonly string[]
  policyRefs: readonly string[]
  approvalGateRefs: readonly string[]
}

type ExecutionPlanStep = {
  stepId: string
  nodeId: string
  ordinal: number
  dependencyStepIds: readonly string[]
  routeKind: 'main' | 'condition' | 'retry' | 'error' | 'review' | 'skip'
}
```

The plan fingerprint is a stable digest of the safe, versioned plan structure; the algorithm is a later implementation decision. It must not be used to reconstruct excluded content. A plan is rejected if the source revision, capability set, policy versions, or approval scope no longer match the execution request.

Compilation may fail with safe reason codes. It must not silently omit an invalid edge, capability, policy, or gate. A plan cannot be treated as execution evidence until a trusted runtime accepts it.

## 5. `Capability`, `Policy`, and `ApprovalGate`

### 5.1 Capability

```ts
type Capability = {
  schemaVersion: '2.0'
  capabilityId: string
  capabilityVersion: string
  class: 'read' | 'mock' | 'write' | 'process' | 'artifact-reference'
  targetKind: string
  riskLevel: 0 | 1 | 2 | 3 | 4 | 5
  requiresHumanApproval: boolean
}
```

`Capability` declares what an operation would do; it does not contain a provider credential, command body, prompt, or payload. Write-capable operations require `requiresHumanApproval: true` and a matching `ApprovalGate`.

### 5.2 Policy

```ts
type Policy = {
  schemaVersion: '2.0'
  policyId: string
  policyVersion: string
  capabilityId: string
  scope: { workflowId: string; revisionId: string; planId: string }
  decision: 'allow' | 'deny' | 'review'
  reasonCode: string
  evaluatedAt: string
}
```

Policy evaluation is explicit and versioned. `deny` blocks the operation, `review` requires a gate, and `allow` permits only the capability and scope that were evaluated. A policy cannot broaden a capability or override a rejection.

### 5.3 ApprovalGate

```ts
type ApprovalGate = {
  schemaVersion: '2.0'
  gateId: string
  scope: {
    runId: string
    planId: string
    capabilityId: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'superseded'
  requestedAt: string
  decidedAt?: string
  decisionRef?: string
  reasonCode?: string
  expiresAt?: string
}
```

Approval semantics:

- `pending` stops the affected operation and emits a safe attention signal; it is not success, failure, or an implicit allow.
- Approval is scoped to the exact `runId`, `planId`, and `capabilityId`. A changed plan, capability version, policy version, or expired gate invalidates the decision.
- Only an explicit human decision can move a gate to `approved` or `rejected`. A rejected gate prevents continuation of the gated operation; recovery requires a new, explicitly scoped decision.
- Gate creation, decision, expiry, and supersession are represented by append-only events before any dependent continuation is considered.
- There is no silent bypass. A future emergency override, if ever approved, needs a separate policy and audit contract; V2-01 does not authorize one.

## 6. `RunEventEnvelope` and append-only replay

```ts
type RunEventEnvelope = {
  schemaVersion: '2.0'
  eventId: string
  runId: string
  sequence: number
  eventType: RunEventTypeV2
  occurredAt: string
  producer: 'trusted-runtime' | 'migration-adapter'
  entityRefs: Readonly<{
    workflowId?: string
    revisionId?: string
    planId?: string
    nodeId?: string
    edgeId?: string
    capabilityId?: string
    policyId?: string
    gateId?: string
    artifactRef?: string
  }>
  safeData: Readonly<{
    status?: string
    routeKind?: string
    severity?: 'info' | 'warn' | 'error'
    reasonCode?: string
    durationMs?: number
    count?: number
    errorClass?: string
    safeSummaryCode?: string
  }>
}

type RunEventTypeV2 =
  | 'run.started'
  | 'run.status'
  | 'step.status'
  | 'route.observed'
  | 'approval.pending'
  | 'approval.decided'
  | 'artifact.referenced'
  | 'safety.filtered'
  | 'run.finished'
```

These are the minimum V2-01 event names. Later event types require the same schema/version, safe-field, lifecycle, and replay review before implementation. V2-01 does not authorize an executor or event store.

Append/replay invariants:

1. Events are append-only. Existing event bodies, sequence numbers, and timestamps are never edited or deleted by normal operation.
2. `sequence` starts at the run's first event and increases by one for each accepted event. An event with a duplicate `eventId` or sequence is accepted only when it is byte-equivalent/idempotent; a conflict is a corruption error, not an overwrite.
3. A writer must reject an out-of-order or ambiguous append. A reader replays by sequence and never by display order or arrival order.
4. Replay applies event reducers deterministically. The same valid event prefix and contract version must produce the same safe state, including pending gates, counts, status, and references.
5. An unsupported event version/type yields `partial` or `unsupported` coverage with an explicit warning. It cannot be silently interpreted as success, approval, or completion.
6. A projection or snapshot may cache replay output only with `lastSequence` and the relevant contract/projection version. The event sequence remains authoritative.
7. Event references may point to controlled artifacts, but an event never embeds an artifact body or sensitive input.

## 7. `RunSnapshot` and `RunRecord`

```ts
type RunSnapshot = {
  schemaVersion: '2.0'
  snapshotId: string
  runId: string
  lastSequence: number
  state: 'queued' | 'running' | 'success' | 'failed' | 'review_required' | 'blocked' | 'cancelled'
  pendingGateIds: readonly string[]
  counts: Readonly<Record<string, number>>
  latestSafeEventId?: string
  reconstructedAt: string
  reconstructionVersion: string
}

type RunRecord = {
  schemaVersion: '2.0'
  recordId: string
  runId: string
  workflowId: string
  revisionId: string
  planId: string
  status: RunSnapshot['state']
  startedAt: string
  finishedAt?: string
  firstSequence?: number
  lastSequence?: number
  snapshotIds: readonly string[]
  safeSummaryCodes: readonly string[]
  source: 'event-sequence'
}
```

`RunSnapshot` is a restart/read optimization reconstructed from an event prefix. `RunRecord` is an index and safe history summary. Neither is allowed to invent a status, replace an event, or carry raw log/payload/artifact content. If a snapshot disagrees with the event sequence, replay from events wins and the snapshot is stale or invalid.

## 8. Safe projections: Attention, Briefing, and Comparison

All projections are pure functions of a selected event sequence, compatible run records/snapshots, and an explicitly named projection version. They have no write authority, no hidden side effects, and no direct access to credentials, files, CLI processes, or real external APIs.

### `AttentionProjection`

Used by Cognitive HUD, Run Detail, and other attention-allocation surfaces.

```ts
type AttentionProjection = {
  projectionVersion: string
  runId: string
  coverage: 'complete' | 'partial' | 'unsupported'
  signals: readonly {
    signalId: string
    priority: 'normal' | 'watch' | 'alert' | 'critical'
    reasonCode: string
    entityRefs: readonly string[]
    recommendedActionCode?: string
  }[]
  unknownEventCount: number
}
```

### `BriefingProjection`

Used by the Situation Narration layer. Text briefing is one output channel, not the whole Situation Assistant.

```ts
type BriefingProjection = {
  projectionVersion: string
  runId: string
  coverage: 'complete' | 'partial' | 'unsupported'
  past: readonly string[]
  present: readonly string[]
  future: readonly string[]
  nextActionCodes: readonly string[]
  sourceEventSequences: readonly number[]
}
```

The arrays contain bounded, safe derived statements or codes generated from safe facts. They do not contain raw event bodies, prompts, provider output, credentials, or artifact bodies.

### `ComparisonProjection`

```ts
type ComparisonProjection = {
  projectionVersion: string
  leftRunId: string
  rightRunId: string
  comparable: boolean
  compatibilityReasonCode: string
  changedStatuses: readonly string[]
  metricDeltas: Readonly<Record<string, number>>
  changedEntityRefs: readonly string[]
  sourceRanges: readonly { runId: string; fromSequence?: number; toSequence?: number }[]
}
```

Comparison is valid only when the selected runs have compatible workflow/plan identity or an explicit comparison adapter. It reports observed differences; it does not claim causality that is absent from the event evidence. Missing or unsupported data is surfaced as incomplete.

## 9. `RecipeRevision` and `FailurePattern`

### `RecipeRevision`

```ts
type RecipeRevision = {
  schemaVersion: '2.0'
  recipeId: string
  recipeRevisionId: string
  sourceWorkflowId: string
  sourceWorkflowRevisionId: string
  sourceRunId: string
  approvedEvidenceRefs: readonly { eventId: string; sequence: number }[]
  safeParameterSchema: Readonly<Record<string, string>>
  promotedAt: string
  promotionDecisionRef: string
}
```

A recipe revision is immutable and traceable to a source workflow revision, run, and explicitly approved evidence. A successful status alone never promotes a recipe. The recipe stores reusable structure and safe parameter metadata; bodies and credentials remain outside this contract.

### `FailurePattern`

```ts
type FailurePattern = {
  schemaVersion: '2.0'
  failurePatternId: string
  patternRevisionId: string
  classificationCode: string
  sourceRunRefs: readonly string[]
  evidenceRefs: readonly { runId: string; eventId: string; sequence: number }[]
  recurrenceCount: number
  safeRemediationCodes: readonly string[]
  recordedAt: string
}
```

Failure patterns are derived learning assets, not runtime decisions. Recording one does not authorize a retry, policy change, recipe promotion, or external action. A new interpretation creates a new `patternRevisionId`; prior records remain available for audit and comparison.

## 10. Future Tauri command API (contract only)

Rust/Tauri is the future trusted runtime boundary identified by the ADR. The following names are reserved as a future public boundary; they are not implemented or wired by V2-01.

| Command/event | Direction | Contract responsibility |
|---|---|---|
| `v2.workflow.validate` | React → trusted runtime | validate one document revision and return safe diagnostics |
| `v2.plan.compile` | React → trusted runtime | compile one version-frozen document into an immutable plan |
| `v2.run.start` | React → trusted runtime | start a run from an accepted plan and return `runId` |
| `v2.run.control` | React → trusted runtime | request cancel, pause/resume, retry, or replay only when allowed by plan/policy |
| `v2.run.approval` | React → trusted runtime | submit an explicit scoped approval/rejection decision |
| `v2.run.events.subscribe` | React ← trusted runtime | stream safe `RunEventEnvelope` values in sequence order |
| `v2.run.snapshot.get` | React → trusted runtime | return a replayable safe snapshot with `lastSequence` |
| `v2.run.record.get` | React → trusted runtime | return a safe run index/record |
| `v2.projection.get` | React → trusted runtime | compute a named safe projection from selected evidence |
| `v2.recipe.promote` | React → trusted runtime | request promotion only with explicitly approved evidence |

Every command carries a `requestId`, contract version, and safe references. Responses are typed success/error results with safe reason codes. Commands do not accept raw credentials or unbounded bodies, and React cannot bypass the trusted runtime by writing to event storage or invoking a CLI/API directly. The API remains future-contract-only until the relevant gates are approved.

## 11. Legacy migration and compatibility through G5

V1 remains available until an explicit cutover decision. The importer is read-only, preserves the source, and must not overwrite existing localStorage. No V2-01 change adds a storage key or mutates legacy data.

| Legacy surface | Existing identity/schema | V2 compatibility behavior | Cutover status |
|---|---|---|---|
| `Workflow` JSON | `id`, `name`, `nodes`, `connections`, optional schema `1.0`/`1.1`/`2.0` | Read-only normalization: `id → workflowId`, `name → title`, `connections → edges`; issue warnings for absent/legacy versions; create a new V2 revision identity | v1 preserved; no cutover |
| Existing `WorkflowDocument` bridge | current `workflowId`, `title`, `connections`, schema `2.0` | Accept as a legacy bridge input; normalize `connections` to canonical V2 `edges`; do not treat the bridge as a V2 run/event contract | v1 preserved; no cutover |
| `WorkflowRunHistory` | schema `1.0`, existing key `agent-workflow-studio.run-history.v1` | Read safe record fields and `traceAudit` as historical evidence; do not fabricate a complete V2 event sequence from summaries; never rewrite the source key | v1 preserved; no cutover |
| `RunTraceAudit` | schema `1.0` | Retain safe steps, evidence, route metadata, and excluded-count signals as legacy evidence; use an explicit adapter before accepting as canonical V2 events | v1 preserved; no cutover |
| `RuntimeAuditContract` | schema `1.0` | Preserve safe event metadata and references; map only through a versioned adapter that verifies sequence/lifecycle semantics | v1 preserved; no cutover |
| Current workflow/templates/snapshots/settings | existing `*.v1` localStorage surfaces | Continue existing v1 behavior. V2-01 neither reads them implicitly nor replaces them; a later migration may offer an explicit, non-destructive import | v1 preserved; no cutover |

Compatibility invariants:

- A failed or partial migration leaves the legacy source unchanged and reports a safe reason code.
- Legacy summaries do not gain authority over a V2 event sequence. If both exist, the valid V2 sequence is authoritative for V2 facts.
- Unknown legacy fields are not copied into V2 safe metadata merely because they are present.
- No legacy importer may overwrite, delete, or silently upgrade an existing v1 localStorage value.
- A cutover, storage migration, real connector, credential boundary, or Tauri implementation requires separate owner approval and is outside V2-01.

## 12. Draft-vs-future implementation boundary

### In this V2-01 docs slice

- Canonical names, public shapes, identity/version rules, append/replay invariants, safe projection rules, approval semantics, future command names, and legacy compatibility behavior are specified.
- The document is a contract draft for Terra PM review. It is not an implementation sign-off.

### Explicitly future and not implemented

- TypeScript or Rust bindings, Tauri commands, SQLite/event storage, a replay reducer, an executor, real process execution, connectors, credential storage, artifact access, UI projections, recipe promotion, failure-learning automation, and migration code.
- New dependencies, backend/API wiring, localStorage keys, source-spec edits, and artifact-body changes.

## 13. Gate status and acceptance boundary

V2-01 does not approve or cross G2, G3, G4, or G5. All four remain **not approved / not crossed**:

| Gate | Boundary tracked here | Status |
|---|---|---|
| G2 | Dependency, Tauri, Rust, SQLite, and type binding | Not approved / not crossed |
| G3 | Actual Codex CLI/process execution | Not approved / not crossed |
| G4 | Cutover | Not approved / not crossed |
| G5 | Legacy removal | Not approved / not crossed |

These gate labels retain their exact approval meanings: G2 covers dependency, Tauri, Rust, SQLite, and type binding; G3 covers actual Codex CLI/process execution; G4 covers cutover; and G5 covers legacy removal. V2-01 requests and authorizes none of these actions.

The V2 MVP gate from the ADR also remains a future acceptance target. This document provides enough contract precision for later gated work but claims no runtime, artifact, replay, comparison, evaluation, or recipe-promotion result.

## 14. Safe contract example

The following is illustrative derived metadata only. It is not a runtime fixture and contains no body content:

```json
{
  "schemaVersion": "2.0",
  "eventId": "evt-017",
  "runId": "run-042",
  "sequence": 17,
  "eventType": "approval.pending",
  "occurredAt": "2026-07-28T10:00:00Z",
  "producer": "trusted-runtime",
  "entityRefs": {
    "planId": "plan-042",
    "nodeId": "node-review",
    "gateId": "gate-003"
  },
  "safeData": {
    "status": "review_required",
    "routeKind": "review",
    "severity": "warn",
    "reasonCode": "human_review_required"
  }
}
```
