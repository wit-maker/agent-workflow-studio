import { useMemo, useReducer, useRef, useState } from 'react'
import { calculateBottleneck } from '../domain/connectionRules'
import { createSampleWorkflow } from '../domain/sampleWorkflow'
import type {
  AgentRole,
  ConnectionKind,
  WorkflowDataType,
  WorkflowRunLog,
} from '../domain/workflow'
import {
  deleteWorkflowTemplate,
  listWorkflowTemplates,
  loadWorkflowTemplate,
  saveWorkflowTemplate,
  type SavedWorkflowTemplate,
} from '../storage/localTemplates'
import {
  deleteWorkflowSnapshot,
  listWorkflowSnapshots,
  loadWorkflowSnapshot,
  saveWorkflowSnapshot,
  type SavedWorkflowSnapshot,
} from '../storage/localWorkflowHistory'
import { createWorkflowState, workflowReducer } from '../state/workflowReducer'
import {
  selectSelectedNode,
  validateConnectionDraft,
  validateConnections,
  validateWorkflowImport,
} from '../state/workflowSelectors'
import { BottomMonitor } from './BottomMonitor'
import { Inspector } from './Inspector'
import { PartsPalette } from './PartsPalette'
import { StagePreview } from './StagePreview'
import { TopBar } from './TopBar'
import { WorkflowCanvas } from './WorkflowCanvas'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function makeLog(
  runId: string,
  message: string,
  nodeId?: string,
  level: WorkflowRunLog['level'] = 'info',
): WorkflowRunLog {
  return {
    id: `${runId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    runId,
    timestamp: new Date().toISOString(),
    nodeId,
    level,
    message,
  }
}

export function AppShell() {
  const [state, dispatch] = useReducer(
    workflowReducer,
    createWorkflowState(createSampleWorkflow()),
  )
  const [templates, setTemplates] = useState<SavedWorkflowTemplate[]>(() =>
    listWorkflowTemplates(),
  )
  const [snapshots, setSnapshots] = useState<SavedWorkflowSnapshot[]>(() =>
    listWorkflowSnapshots(),
  )
  const runTokenRef = useRef(0)
  const { workflow, selectedNodeId, isRunning, checkOutcome, importError } = state

  const selectedNode = useMemo(
    () => selectSelectedNode(workflow, selectedNodeId),
    [selectedNodeId, workflow],
  )
  const connectionValidation = useMemo(() => validateConnections(workflow), [workflow])

  async function runMockWorkflow() {
    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    const runId = `run-${new Date().toISOString()}`
    dispatch({
      type: 'runWorkflowStart',
      runId,
      log: makeLog(runId, 'Local mock run queued. No external APIs will be called.'),
    })

    const outcomeSequence: Array<'PASS' | 'REVIEW' | 'FAIL'> = ['PASS', 'REVIEW', 'PASS']
    const outcome = outcomeSequence[new Date().getSeconds() % outcomeSequence.length]
    dispatch({ type: 'setCheckOutcome', outcome })

    for (const node of workflow.nodes) {
      if (runTokenRef.current !== runToken) {
        return
      }

      dispatch({
        type: 'runNodeRunning',
        nodeId: node.id,
        log: makeLog(runId, `${node.title} started.`, node.id),
      })

      await delay(220)

      const nextStatus =
        node.title === 'Check' && outcome === 'REVIEW' ? 'review_required' : 'success'
      dispatch({
        type: 'runNodeSuccess',
        nodeId: node.id,
        status: nextStatus,
        log: makeLog(
          runId,
          node.title === 'Check'
            ? `Check completed with ${outcome}.`
            : `${node.title} completed.`,
          node.id,
          node.title === 'Check' && outcome !== 'PASS' ? 'warn' : 'info',
        ),
      })
    }

    if (runTokenRef.current !== runToken) {
      return
    }

    const bottleneck = calculateBottleneck(workflow.nodes)
    const tokens = workflow.nodes.reduce(
      (total, node) => total + (node.metrics?.estimatedTokens ?? 0),
      0,
    )
    const cost = workflow.nodes.reduce(
      (total, node) => total + (node.metrics?.estimatedCost ?? 0),
      0,
    )
    const latencyMs = workflow.nodes.reduce(
      (total, node) => total + (node.metrics?.estimatedLatencyMs ?? 0),
      0,
    )

    dispatch({
      type: 'updateMetrics',
      metrics: {
        tokens,
        cost,
        latencyMs,
        successRate: outcome === 'FAIL' ? 84 : outcome === 'REVIEW' ? 92 : 100,
        queueCount: 0,
        retryCount: workflow.nodes.reduce(
          (total, node) => total + (node.metrics?.retryCount ?? 0),
          0,
        ),
        bottleneckNodeId: bottleneck?.id ?? null,
      },
    })
    dispatch({
      type: 'setArtifact',
      artifact: {
        title: 'Bootstrap MVP Artifact',
        format: 'Markdown',
        status: outcome === 'REVIEW' ? 'review_required' : 'checked',
        content: [
          '# Agent Workflow Studio Mock Artifact',
          '',
          `- Check result: ${outcome}`,
          `- Nodes executed: ${workflow.nodes.length}`,
          `- Tokens: ${tokens}`,
          `- Estimated cost: $${cost.toFixed(3)}`,
          `- Bottleneck: ${bottleneck?.title ?? 'None'}`,
          '',
          'This artifact was produced by a local simulator. No Codex, Hermes, Grok, X, or external API call was made.',
        ].join('\n'),
      },
    })
    dispatch({
      type: 'appendLog',
      log: makeLog(runId, 'Metrics updated and template save mock completed.', undefined, 'metric'),
    })
    dispatch({ type: 'setRunning', isRunning: false })
  }

  function stopRun() {
    runTokenRef.current += 1
    dispatch({ type: 'setRunning', isRunning: false })
    dispatch({
      type: 'appendLog',
      log: makeLog(`run-stop-${Date.now()}`, 'Local mock run stopped by user.', undefined, 'warn'),
    })
  }

  function handleReset() {
    runTokenRef.current += 1
    dispatch({ type: 'resetWorkflow', workflow: createSampleWorkflow() })
  }

  function handleSaveNode(
    nodeId: string,
    updates: {
      title: string
      description: string
      agentRole: AgentRole | undefined
      config: Record<string, unknown>
    },
  ) {
    dispatch({ type: 'updateNodeConfig', nodeId, updates })
  }

  function handleCreateConnection(draft: {
    sourceNodeId: string
    sourcePort: string
    targetNodeId: string
    targetPort: string
    kind: ConnectionKind
  }) {
    const validation = validateConnectionDraft(workflow, {
      sourceNodeId: draft.sourceNodeId,
      sourcePort: draft.sourcePort as WorkflowDataType,
      targetNodeId: draft.targetNodeId,
      targetPort: draft.targetPort as WorkflowDataType,
      kind: draft.kind,
    })

    if (!validation.valid) {
      dispatch({
        type: 'appendLog',
        log: makeLog(
          `connection-${Date.now()}`,
          `Connection rejected: ${validation.reason}`,
          undefined,
          'warn',
        ),
      })
      return
    }

    dispatch({
      type: 'createConnection',
      connection: {
        id: `edge-${Date.now()}`,
        sourceNodeId: draft.sourceNodeId,
        sourcePort: draft.sourcePort,
        targetNodeId: draft.targetNodeId,
        targetPort: draft.targetPort,
        kind: draft.kind,
        carries: [draft.sourcePort as WorkflowDataType],
        status: 'inactive',
      },
    })
    dispatch({
      type: 'appendLog',
      log: makeLog(`connection-${Date.now()}`, 'Connection created.', undefined, 'info'),
    })
  }

  function handleDeleteConnection(connectionId: string) {
    dispatch({ type: 'deleteConnection', connectionId })
    dispatch({
      type: 'appendLog',
      log: makeLog(`connection-${Date.now()}`, 'Connection deleted.', undefined, 'warn'),
    })
  }

  function handleSaveTemplate() {
    const template = saveWorkflowTemplate(workflow)
    setTemplates(listWorkflowTemplates())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `template-${Date.now()}`,
        `Template saved: ${template.name}.`,
        undefined,
        'info',
      ),
    })
  }

  function handleLoadTemplate(id: string) {
    const loaded = loadWorkflowTemplate(id)
    if (!loaded) {
      return
    }
    dispatch({ type: 'importWorkflow', workflow: loaded })
  }

  function handleDeleteTemplate(id: string) {
    setTemplates(deleteWorkflowTemplate(id))
  }

  function handleSaveSnapshot() {
    const snapshot = saveWorkflowSnapshot(workflow)
    setSnapshots(listWorkflowSnapshots())
    dispatch({
      type: 'appendLog',
      log: makeLog(
        `snapshot-${Date.now()}`,
        `Snapshot saved: ${snapshot.name}.`,
        undefined,
        'info',
      ),
    })
  }

  function handleLoadSnapshot(id: string) {
    const loaded = loadWorkflowSnapshot(id)
    if (!loaded) {
      return
    }
    dispatch({ type: 'importWorkflow', workflow: loaded })
  }

  function handleDeleteSnapshot(id: string) {
    setSnapshots(deleteWorkflowSnapshot(id))
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${workflow.id || 'workflow'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = validateWorkflowImport(parsed)

      if (!result.valid || !result.workflow) {
        dispatch({
          type: 'setImportError',
          message: result.error ?? 'Imported workflow is invalid.',
        })
        dispatch({
          type: 'appendLog',
          log: makeLog(
            `import-${Date.now()}`,
            `Import rejected: ${result.error ?? 'invalid workflow'}.`,
            undefined,
            'warn',
          ),
        })
        return
      }

      dispatch({ type: 'importWorkflow', workflow: result.workflow })
    } catch (error) {
      dispatch({
        type: 'setImportError',
        message: error instanceof Error ? error.message : 'Failed to import JSON.',
      })
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        workflowName={workflow.name}
        status={workflow.status}
        isRunning={isRunning}
        onRun={runMockWorkflow}
        onStop={stopRun}
        onReset={handleReset}
        onExportJson={exportJson}
        onImportJson={importJson}
      />
      {importError ? <div className="import-error">{importError}</div> : null}
      <div className="workspace-grid">
        <PartsPalette
          parts={workflow.nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={(nodeId) => dispatch({ type: 'selectNode', nodeId })}
        />
        <div className="center-stack">
          <WorkflowCanvas
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onSelectNode={(nodeId) => dispatch({ type: 'selectNode', nodeId })}
            connectionValidation={connectionValidation}
          />
          <StagePreview
            artifact={workflow.artifact}
            checkOutcome={checkOutcome}
            workflow={workflow}
            selectedNode={selectedNode}
          />
        </div>
        <Inspector
          selectedNode={selectedNode}
          nodes={workflow.nodes}
          connections={workflow.connections}
          connectionValidation={connectionValidation}
          onSaveNode={handleSaveNode}
          onCreateConnection={handleCreateConnection}
          onDeleteConnection={handleDeleteConnection}
        />
      </div>
      <BottomMonitor
        workflow={workflow}
        templates={templates}
        snapshots={snapshots}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onSaveSnapshot={handleSaveSnapshot}
        onLoadSnapshot={handleLoadSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
      />
    </div>
  )
}
