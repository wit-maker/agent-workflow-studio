import {
  buildFlowPressureProjection,
  buildHudNotificationBundle,
  buildScratchConnectorFeedbackProjection,
  buildSelectedEdgeHudView,
  buildWorkflowEdgeRuntimeMap,
  type HudSnapshot,
} from '../src/domain/cognitiveHud'
import { collectBriefingInput } from '../src/domain/briefingInputCollector'
import {
  normalizeConnectionRuntimePolicy,
  resolveConnectionRuntimePolicyRoute,
} from '../src/domain/edgeRuntimePolicy'
import { createFullBundle } from '../src/domain/exportBundle'
import { validateImportBundle } from '../src/domain/importValidation'
import { createRunTraceAuditSummary } from '../src/domain/runAudit'
import {
  buildRunComparisonView,
  buildRunDetailEdgeReplayEvidenceView,
  buildRunDetailReplayCandidateView,
  buildRunDetailReplayView,
  buildRunDetailRuntimeTimelineView,
} from '../src/domain/runDetail'
import { buildReviewDecisionAuditBoundaryView } from '../src/domain/reviewDecisionAudit'
import { createWorkflowRunRecord, normalizeRunHistory } from '../src/domain/runHistory'
import { buildRunTrace } from '../src/domain/runTrace'
import { STORAGE_KEYS } from '../src/storage/storageKeys'
import type { ExecutionGraph } from '../src/domain/executionGraph'
import type { RunTraceAuditSummary } from '../src/domain/runAudit'
import type { Workflow, WorkflowConnection, WorkflowNode } from '../src/domain/workflow'

type DirectQaValidationResult = {
  ok: true
  checked: string[]
}

const FORBIDDEN_SENTINELS = [
  'sk-live-direct-qa-secret',
  'RAW_PROMPT_SENTINEL',
  'RAW_PAYLOAD_SENTINEL',
  'CREDENTIAL_SENTINEL',
  'PASSWORD_SENTINEL',
  'BEARER_SENTINEL',
] as const

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function assertNoForbiddenSentinels(value: unknown, context: string): void {
  const text = JSON.stringify(value)
  assert(typeof text === 'string', `${context}: output could not be serialized`)
  for (const sentinel of FORBIDDEN_SENTINELS) {
    assert(!text.includes(sentinel), `${context}: leaked forbidden sentinel ${sentinel}`)
  }
}

function node(options: {
  id: string
  type: string
  title: string
  category: WorkflowNode['category']
  status: WorkflowNode['status']
  x: number
  outputTypes: WorkflowNode['outputTypes']
  inputTypes?: WorkflowNode['inputTypes']
  description?: string
  config?: WorkflowNode['config']
}): WorkflowNode {
  return {
    id: options.id,
    type: options.type,
    title: options.title,
    category: options.category,
    description: options.description ?? `${options.title} safe description`,
    status: options.status,
    inputTypes: options.inputTypes ?? ['Text'],
    outputTypes: options.outputTypes,
    config: options.config ?? {},
    position: { x: options.x, y: 100 },
    metrics: {
      estimatedTokens: 120,
      estimatedLatencyMs: 450,
    },
  }
}

function buildWorkflow(): Workflow {
  const rawPolicy = {
    condition: {
      mode: 'expression',
      label: 'CREDENTIAL_SENTINEL route guard',
      expression: 'RAW_PAYLOAD_SENTINEL && sk-live-direct-qa-secret',
    },
    retry: { enabled: true, maxAttempts: 3, backoffMs: 250 },
    delayMs: 100,
    errorRoute: {
      enabled: true,
      targetNodeId: 'node-output',
      label: 'PASSWORD_SENTINEL fallback',
    },
  }
  const edgeOne: WorkflowConnection = {
    id: 'edge-input-normalize',
    sourceNodeId: 'node-input',
    targetNodeId: 'node-normalize',
    kind: 'decision',
    carries: ['Text'],
    status: 'active',
    runtimePolicy: normalizeConnectionRuntimePolicy(rawPolicy),
    metrics: { latencyMs: 42, tokens: 18 },
  }

  return {
    id: 'workflow-direct-qa',
    schemaVersion: '2.0',
    name: 'Direct QA workflow',
    description: 'Safe validation fixture',
    version: 1,
    status: 'failed',
    nodes: [
      node({
        id: 'node-input',
        type: 'text-input',
        title: 'Collect text',
        category: 'input',
        status: 'success',
        x: 0,
        outputTypes: ['Text'],
        config: {
          prompt: 'RAW_PROMPT_SENTINEL',
          apiKey: 'sk-live-direct-qa-secret',
        },
      }),
      node({
        id: 'node-normalize',
        type: 'normalize',
        title: 'Normalize text',
        category: 'transform',
        status: 'failed',
        x: 240,
        inputTypes: ['Text'],
        outputTypes: ['Context'],
      }),
      node({
        id: 'node-output',
        type: 'output',
        title: 'Publish result',
        category: 'output',
        status: 'queued',
        x: 520,
        inputTypes: ['Context'],
        outputTypes: ['Artifact'],
      }),
    ],
    connections: [
      edgeOne,
      {
        id: 'edge-normalize-output',
        sourceNodeId: 'node-normalize',
        targetNodeId: 'node-output',
        kind: 'result',
        carries: ['Context'],
        status: 'inactive',
      },
    ],
    metrics: {
      tokens: 440,
      cost: 0.25,
      latencyMs: 930,
      successRate: 0.5,
      queueCount: 1,
      retryCount: 1,
      bottleneckNodeId: 'node-normalize',
    },
    logs: [
      {
        id: 'log-safe',
        runId: 'run-left',
        timestamp: '2026-06-03T00:00:04.000Z',
        nodeId: 'node-input',
        level: 'info',
        message: 'Input accepted as safe summary.',
      },
      {
        id: 'log-sensitive',
        runId: 'run-left',
        timestamp: '2026-06-03T00:00:05.000Z',
        nodeId: 'node-normalize',
        level: 'error',
        message: 'RAW_PAYLOAD_SENTINEL CREDENTIAL_SENTINEL sk-live-direct-qa-secret',
        payload: { raw: 'BEARER_SENTINEL' },
      },
    ],
    artifact: {
      title: 'Direct QA artifact',
      format: 'Markdown',
      content: 'RAW_PAYLOAD_SENTINEL should not appear in safe audit views.',
      status: 'failed',
    },
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:01:00.000Z',
  }
}

function graph(runId: string, status: 'success' | 'failed'): ExecutionGraph {
  const failed = status === 'failed'
  return {
    runId,
    steps: [
      {
        id: `${runId}-step-input`,
        runId,
        nodeId: 'node-input',
        nodeTitle: 'Collect text',
        status: 'success',
        route: 'main',
        startedAt: '2026-06-03T00:00:01.000Z',
        finishedAt: '2026-06-03T00:00:02.000Z',
        durationMs: 100,
        message: 'Safe input summary.',
      },
      {
        id: `${runId}-step-normalize`,
        runId,
        nodeId: 'node-normalize',
        nodeTitle: 'Normalize text',
        status: failed ? 'failed' : 'success',
        route: failed ? 'error' : 'main',
        startedAt: '2026-06-03T00:00:03.000Z',
        finishedAt: '2026-06-03T00:00:04.000Z',
        durationMs: failed ? 1200 : 300,
        error: failed ? 'PASSWORD_SENTINEL RAW_PAYLOAD_SENTINEL' : undefined,
        message: failed ? undefined : 'Normalize completed.',
      },
    ],
    routes: [
      {
        id: `${runId}-route-input-normalize`,
        kind: failed ? 'error' : 'main',
        fromNodeId: 'node-input',
        toNodeId: 'node-normalize',
        reason: failed ? 'Safe error route observed.' : 'Safe main route observed.',
        createdAt: '2026-06-03T00:00:04.500Z',
      },
    ],
    failedStepId: failed ? `${runId}-step-normalize` : undefined,
    retryCandidates: failed ? [`${runId}-step-normalize`] : [],
  }
}

function auditFor(workflow: Workflow, runId: string, status: 'success' | 'failed'): RunTraceAuditSummary {
  const trace = buildRunTrace({
    workflow,
    executionGraph: graph(runId, status),
    connectorJobs: [],
    runHistoryRecords: [],
  })
  const audit = createRunTraceAuditSummary(trace, {
    mode: 'mock',
    status,
    finishedAt: '2026-06-03T00:00:06.000Z',
    createdAt: '2026-06-03T00:00:07.000Z',
  })

  return {
    ...audit,
    runtimeEvents: trace.runtimeEvents ?? audit.runtimeEvents,
  }
}

export async function runDirectQaValidation(): Promise<DirectQaValidationResult> {
  const checked: string[] = []
  const workflow = buildWorkflow()
  const bundle = createFullBundle(workflow, [], { canvasMode: 'react-flow', activeTab: 'RunDetail' })
  const importResult = validateImportBundle(bundle)
  assert(importResult.valid, 'import/export boundary should validate a generated bundle')
  assert(importResult.bundle.workflow.connections.length === 2, 'import/export boundary should preserve connections')
  checked.push('import/export bundle validation')

  const leftAudit = auditFor(workflow, 'run-left', 'failed')
  const rightAudit = auditFor({ ...workflow, status: 'success' }, 'run-right', 'success')
  const leftRecord = createWorkflowRunRecord({
    runId: 'run-left',
    source: workflow,
    mode: 'mock',
    status: 'failed',
    startedAt: '2026-06-03T00:00:00.000Z',
    finishedAt: '2026-06-03T00:00:06.000Z',
    durationMs: 600,
    traceAudit: leftAudit,
  })
  const rightRecord = createWorkflowRunRecord({
    runId: 'run-right',
    source: { ...workflow, status: 'success' },
    mode: 'mock',
    status: 'success',
    startedAt: '2026-06-03T00:01:00.000Z',
    finishedAt: '2026-06-03T00:01:03.000Z',
    durationMs: 300,
    traceAudit: rightAudit,
  })
  assertNoForbiddenSentinels(leftAudit, 'trace audit summary')
  assertNoForbiddenSentinels(rightAudit, 'trace audit summary')
  assertNoForbiddenSentinels([leftRecord, rightRecord], 'run history records')
  checked.push('safe audit/run history summaries')

  const comparisonView = buildRunComparisonView({
    runHistoryRecords: [leftRecord, rightRecord],
    leftRunId: 'run-left',
    rightRunId: 'run-right',
    focusConnectionId: 'edge-input-normalize',
    connections: workflow.connections,
  })
  assert(comparisonView.warning === null, 'comparison view should be available for two audited runs')
  assert(comparisonView.rows.length > 0, 'comparison view should include metadata rows')
  assert(
    comparisonView.focusScope.routeMetadataRows.length > 0,
    'focused edge diff should include route metadata rows',
  )
  assertNoForbiddenSentinels(comparisonView, 'run detail comparison view')
  checked.push('Run Detail safe metadata comparison')
  assert(leftAudit.edgeReplayRecords.length > 0, 'trace audit should persist edge replay records')
  assert(
    leftAudit.edgeReplayRecords.some((record) => record.connectionId === 'edge-input-normalize'),
    'trace audit should persist selected edge replay record',
  )
  assertNoForbiddenSentinels(leftAudit.edgeReplayRecords, 'trace audit edge replay records')
  checked.push('traceAudit durable edge replay records')

  const replayView = buildRunDetailReplayView({
    currentTrace: null,
    runHistoryRecords: [leftRecord, rightRecord],
    selectedRunId: 'run-left',
    focusConnectionId: 'edge-input-normalize',
    connections: workflow.connections,
  })
  assert(replayView.selectedRunId === 'run-left', 'run detail replay should select requested run')
  assert(replayView.focusTarget.type === 'connection', 'run detail replay should keep edge focus')
  assert(
    (replayView.selectedTrace?.runtimeEvents?.length ?? 0) > 0,
    'revived audit snapshot should expose safe runtimeEvents on the selected RunTrace',
  )
  assertNoForbiddenSentinels(replayView, 'run detail replay view')

  const currentTrace = buildRunTrace({
    workflow,
    executionGraph: graph('run-left', 'failed'),
    connectorJobs: [],
    runHistoryRecords: [leftRecord, rightRecord],
  })
  const timelineView = buildRunDetailRuntimeTimelineView({
    trace: currentTrace,
    focusConnectionId: 'edge-input-normalize',
  })
  assert(timelineView.eventCount > 0, 'runtime timeline should include safe events')
  assertNoForbiddenSentinels(timelineView, 'runtime timeline view')
  checked.push('Run Detail replay/timeline focus')

  const flowPressure = buildFlowPressureProjection({ runTrace: currentTrace })
  assert(flowPressure.replayReady, 'flow pressure should become replay-ready from safe runtime events')
  assert(flowPressure.edgeEventCount > 0, 'flow pressure should count edge events')
  assert(
    flowPressure.bottleneckConnectionId === 'edge-input-normalize',
    'flow pressure should identify the safe bottleneck edge candidate',
  )
  assert(
    flowPressure.templateHistoryHint.includes('履歴') || flowPressure.templateHistoryHint.includes('template'),
    'flow pressure should expose a template/history hint',
  )
  assertNoForbiddenSentinels(flowPressure, 'flow pressure projection')
  checked.push('safe flow-pressure projection')

  const revivedTimelineView = buildRunDetailRuntimeTimelineView({
    trace: replayView.selectedTrace,
    focusConnectionId: 'edge-input-normalize',
  })
  assert(
    revivedTimelineView.eventCount === replayView.selectedTrace?.runtimeEvents?.length,
    'revived audit snapshot timeline should read the same safe runtimeEvents as the selected trace',
  )
  const revivedReplayCandidate = buildRunDetailReplayCandidateView({
    timeline: revivedTimelineView,
    selectedIndex: 0,
  })
  assert(
    revivedReplayCandidate.available,
    'revived audit snapshot replay candidate should be available from safe runtimeEvents',
  )
  assertNoForbiddenSentinels(revivedTimelineView, 'revived audit runtime timeline view')
  assertNoForbiddenSentinels(revivedReplayCandidate, 'revived audit replay candidate')
  checked.push('revived audit snapshot runtimeEvents timeline/replay')

  const edgeReplayEvidence = buildRunDetailEdgeReplayEvidenceView({
    trace: replayView.selectedTrace,
    focusConnectionId: 'edge-input-normalize',
    connections: workflow.connections,
  })
  assert(edgeReplayEvidence.available, 'edge replay evidence should be available from revived audit snapshot')
  assert(
    edgeReplayEvidence.focusedRecordCount > 0,
    'edge replay evidence should include focused selected edge record',
  )
  assert(
    edgeReplayEvidence.records.some((record) => record.connectionId === 'edge-input-normalize'),
    'edge replay evidence should surface the selected edge id',
  )
  assertNoForbiddenSentinels(edgeReplayEvidence, 'Run Detail edge replay evidence')
  checked.push('Run Detail edge replay evidence')

  const replayCandidate = buildRunDetailReplayCandidateView({
    timeline: timelineView,
    selectedIndex: 1,
  })
  assert(replayCandidate.available, 'replay candidate should be available for safe runtime events')
  assert(replayCandidate.currentFrame !== null, 'replay candidate should expose a selected safe frame')
  assert(
    replayCandidate.currentFrame.position >= 1 &&
      replayCandidate.currentFrame.position <= replayCandidate.currentFrame.count,
    'replay candidate selected frame should stay within bounds',
  )
  assert(
    replayCandidate.playbackHint.includes('safe metadata') ||
      replayCandidate.playbackHint.includes('安全な runtime metadata'),
    'replay candidate should describe metadata-only behavior',
  )
  assertNoForbiddenSentinels(replayCandidate, 'Run Detail metadata-only replay candidate')
  checked.push('Run Detail metadata-only replay candidate')

  const edgeHud = buildSelectedEdgeHudView({
    workflow,
    connectionId: 'edge-input-normalize',
    runTrace: replayView.selectedTrace,
  })
  assert(edgeHud, 'selected edge HUD should be available')
  assert(edgeHud.connectionId === 'edge-input-normalize', 'selected edge HUD should target selected edge')
  assert(
    edgeHud.durableReplaySummary.includes('event'),
    'selected edge HUD should include durable replay summary',
  )
  assert(
    edgeHud.safeCopySummary.includes('durable edge replay'),
    'selected edge copy summary should include safe durable replay metadata',
  )
  assertNoForbiddenSentinels(edgeHud, 'selected edge HUD view')
  const edgeRuntimeMap = buildWorkflowEdgeRuntimeMap({
    workflow,
    runTrace: replayView.selectedTrace,
  })
  const edgeRuntime = edgeRuntimeMap.get('edge-input-normalize')
  assert(edgeRuntime?.className.includes('edge-replay-observed'), 'edge replay should project to canvas edge class')
  assertNoForbiddenSentinels(edgeRuntime, 'selected edge runtime replay class projection')
  checked.push('Edge HUD safe copy/focus summary')

  const skippedPolicyRoute = resolveConnectionRuntimePolicyRoute({
    connection: {
      sourceNodeId: 'source',
      targetNodeId: 'target',
      runtimePolicy: normalizeConnectionRuntimePolicy({
        condition: { mode: 'on_success', label: 'safe success gate' },
      }),
    },
    context: { sourceStatus: 'failed' },
  })
  assert(
    skippedPolicyRoute.action === 'skip' && skippedPolicyRoute.routeKind === 'skip',
    'fixed preset route policy should skip when on_success is not satisfied',
  )
  const expressionPolicyRoute = resolveConnectionRuntimePolicyRoute({
    connection: {
      sourceNodeId: 'source',
      targetNodeId: 'target',
      runtimePolicy: normalizeConnectionRuntimePolicy({
        condition: { mode: 'expression', expression: 'SAFE_METADATA_ONLY' },
      }),
    },
    context: { sourceStatus: 'success' },
  })
  assert(
    expressionPolicyRoute.action === 'metadata_only' && expressionPolicyRoute.enforced === false,
    'expression policy should remain metadata-only and not enforced',
  )
  assertNoForbiddenSentinels([skippedPolicyRoute, expressionPolicyRoute], 'runtime policy route decisions')
  checked.push('fixed-preset runtime policy route decisions')

  const reviewBoundary = buildReviewDecisionAuditBoundaryView({
    humanReview: {
      decision: 'approved',
      reviewer: 'CREDENTIAL_SENTINEL reviewer',
      note: 'RAW_PROMPT_SENTINEL PASSWORD_SENTINEL',
      decidedAt: '2026-06-03T00:03:00.000Z',
    },
    runId: 'run-left',
  })
  assert(
    reviewBoundary.persistenceMode === 'session_only',
    'review decision boundary should remain session-only in this slice',
  )
  assert(
    reviewBoundary.noteIncludedInSafeSummary === false,
    'sensitive review note should be excluded from safe summary',
  )
  assertNoForbiddenSentinels(reviewBoundary, 'review decision audit boundary')
  checked.push('review decision session-only safe boundary')

  const hudSnapshot: HudSnapshot = {
    alertLevel: 3,
    priority: 'alert',
    summary: 'Normalize needs review',
    recommendedAction: 'Open Run Detail safe metadata',
    focusTargetType: 'node',
    focusTargetId: 'node-normalize',
    focusTargetLabel: 'Normalize text',
    signals: [
      {
        id: 'signal-normalize-review',
        kind: 'review_required',
        alertLevel: 3,
        priority: 'alert',
        title: 'Normalize review required',
        detail: 'Safe metadata review signal',
        targetType: 'node',
        targetId: 'node-normalize',
        targetLabel: 'Normalize text',
      },
    ],
    counts: {
      totalNodes: 3,
      runningNodes: 0,
      queuedNodes: 1,
      failedNodes: 1,
      reviewRequiredNodes: 1,
      blockedNodes: 0,
      retryReadyNodes: 0,
      connectorJobsFailed: 0,
      connectorJobsReviewRequired: 0,
      connectorJobsRetryable: 0,
      runHistoryCount: 2,
    },
  }
  const connectionValidation = [
    {
      connectionId: 'edge-input-normalize',
      valid: false,
      reason: 'Text -> Context requires normalize confirmation.',
      severity: 'warn',
    },
  ] as const
  const connectorJobs = [
    {
      id: 'cjob-run-left-node-normalize-safe',
      runId: 'run-left',
      nodeId: 'node-normalize',
      nodeTitle: 'Normalize text',
      connectorId: 'mock-action',
      connectorLabel: 'Mock Action',
      status: 'failed',
      inputSummary: 'Normalize text -> Mock Action (mock)',
      error: 'Safe error route summary.',
      retryCount: 0,
      createdAt: '2026-06-03T00:00:03.000Z',
      finishedAt: '2026-06-03T00:00:05.000Z',
    },
    {
      id: 'cjob-run-left-node-output-safe',
      runId: 'run-left',
      nodeId: 'node-output',
      nodeTitle: 'Publish result',
      connectorId: 'mock-review',
      connectorLabel: 'Human Review Gate',
      status: 'review_required',
      inputSummary: 'Publish result -> Human Review Gate (mock)',
      retryCount: 0,
      createdAt: '2026-06-03T00:00:04.000Z',
    },
  ] as const
  const scratchConnectorFeedback = buildScratchConnectorFeedbackProjection({
    workflow,
    connectionValidation,
    connectorJobs,
  })
  assert(
    scratchConnectorFeedback.invalidConnectionCount === 1,
    'scratch connector feedback should count invalid connections',
  )
  assert(
    scratchConnectorFeedback.failedJobCount === 1 && scratchConnectorFeedback.reviewRequiredJobCount === 1,
    'scratch connector feedback should expose mock connector rail counts',
  )
  assert(
    scratchConnectorFeedback.retryReadyJobCount === 1,
    'scratch connector feedback should mark failed retryable mock connector jobs',
  )
  assertNoForbiddenSentinels(scratchConnectorFeedback, 'safe scratch connector feedback projection')
  checked.push('safe scratch connector feedback projection')
  const pinnedNotificationView = buildHudNotificationBundle({
    hudSnapshot,
    centralHudView: null,
    runTrace: currentTrace,
    runHistoryRecords: [leftRecord, rightRecord],
    flowPressure,
    scratchConnectorFeedback,
    notificationSessionState: {
      'signal-normalize-review': { read: true, pinned: true },
    },
  })
  assert(pinnedNotificationView.pinnedNotificationCount === 1, 'pinned session notification should be counted')
  assert(
    pinnedNotificationView.notificationItems.some(
      (item) => item.id === 'signal-normalize-review' && item.statusLabel === 'pinned / read',
    ),
    'read pinned notification should remain visible as pinned / read',
  )
  assert(
    pinnedNotificationView.flowPressure.bottleneckConnectionId === 'edge-input-normalize',
    'HUD notification bundle should carry flow pressure projection',
  )
  assert(
    pinnedNotificationView.scratchConnectorFeedback.level === 'error-route',
    'HUD notification bundle should carry scratch connector feedback projection',
  )
  assert(
    pinnedNotificationView.unreadNotificationCount >= 1,
    'flow pressure notification should still be unread when not acknowledged',
  )
  const acknowledgedNotificationView = buildHudNotificationBundle({
    hudSnapshot,
    centralHudView: null,
    notificationSessionState: {
      'signal-normalize-review': { read: true, acknowledged: true },
    },
  })
  assert(
    acknowledgedNotificationView.notificationItems.length === 0,
    'acknowledged unpinned notification should leave the active signal list',
  )
  assert(
    acknowledgedNotificationView.acknowledgedNotificationCount === 1,
    'acknowledged session notification should be counted',
  )
  assertNoForbiddenSentinels([pinnedNotificationView, acknowledgedNotificationView], 'HUD notification session view')
  checked.push('HUD notification session read/ack/pin projection')

  const briefingInput = collectBriefingInput({
    workflow,
    executionGraph: graph('run-left', 'failed'),
    connectorJobs,
    connectionValidation,
    hudSnapshot,
    runHistoryRecords: [leftRecord, rightRecord],
    mode: 'latest-run',
  })
  assert(
    briefingInput.runtimeReplay.flowPressureLevel === flowPressure.level,
    'briefing input should receive the same flow pressure level',
  )
  assert(
    briefingInput.runtimeReplay.templateHistoryHint.length > 0,
    'briefing input should include safe template/history hint',
  )
  assert(
    briefingInput.connectors.invalidConnections === 1 &&
      briefingInput.connectors.retryReady === 1 &&
      briefingInput.connectors.railSummary.includes('mock connector rail'),
    'briefing input should include safe scratch connector rail metadata',
  )
  assertNoForbiddenSentinels(briefingInput.runtimeReplay, 'briefing runtime replay flow pressure input')
  assertNoForbiddenSentinels(briefingInput.connectors, 'briefing scratch connector rail input')
  checked.push('4D briefing flow-pressure input')

  const normalizedOldHistory = normalizeRunHistory({
    records: [
      {
        runId: 'legacy-run',
        workflowId: workflow.id,
        workflowTitle: workflow.name,
        workflowSchemaVersion: '1.0',
        mode: 'mock',
        status: 'success',
        startedAt: '2026-06-03T00:02:00.000Z',
        nodeCount: 1,
        connectionCount: 0,
        logCount: 0,
        errorCount: 0,
        warningCount: 0,
        traceAudit: {
          schemaVersion: '1.0',
          runId: 'legacy-run',
          workflowId: workflow.id,
          workflowName: workflow.name,
          mode: 'mock',
          status: 'success',
          createdAt: '2026-06-03T00:02:01.000Z',
          stepCount: 0,
          evidenceCount: 0,
          excludedEvidenceCount: 0,
          failedStepIds: [],
          reviewStepIds: [],
          retryCandidateStepIds: [],
          routeKinds: [],
          safetyWarnings: [],
          steps: [],
          runEvidence: [],
          events: [],
        },
      },
    ],
  })
  assert(
    normalizedOldHistory.records[0]?.traceAudit?.runtimeEvents.length === 0,
    'legacy run history without runtimeEvents should normalize to []',
  )
  checked.push('legacy run history runtimeEvents normalization')

  const storageKeys = Object.values(STORAGE_KEYS)
  assert(storageKeys.length === 7, 'storage key registry should not gain keys in this harness slice')
  assert(storageKeys.includes('agent-workflow-studio.run-history.v1'), 'run history storage key should remain stable')
  checked.push('localStorage key registry unchanged')

  return { ok: true, checked }
}
