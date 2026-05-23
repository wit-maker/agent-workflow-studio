import { useMemo, useRef, useState } from 'react'
import { calculateBottleneck } from '../domain/connectionRules'
import { createSampleWorkflow } from '../domain/sampleWorkflow'
import type { Workflow, WorkflowNodeStatus, WorkflowRunLog } from '../domain/workflow'
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

function setNodeStatus(
  workflow: Workflow,
  nodeId: string,
  status: WorkflowNodeStatus,
): Workflow {
  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            status,
            lastRun: {
              ...node.lastRun,
              ...(status === 'running' ? { startedAt: new Date().toISOString() } : {}),
              ...(status === 'success' || status === 'review_required'
                ? { finishedAt: new Date().toISOString() }
                : {}),
            },
          }
        : node,
    ),
    updatedAt: new Date().toISOString(),
  }
}

function resetWorkflow(): Workflow {
  return createSampleWorkflow()
}

export function AppShell() {
  const [workflow, setWorkflow] = useState<Workflow>(() => createSampleWorkflow())
  const [selectedNodeId, setSelectedNodeId] = useState('node-1')
  const [isRunning, setIsRunning] = useState(false)
  const [checkOutcome, setCheckOutcome] = useState<'PASS' | 'REVIEW' | 'FAIL'>('PASS')
  const runTokenRef = useRef(0)

  const selectedNode = useMemo(
    () => workflow.nodes.find((node) => node.id === selectedNodeId),
    [selectedNodeId, workflow.nodes],
  )

  async function runMockWorkflow() {
    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    const runId = `run-${new Date().toISOString()}`
    setIsRunning(true)
    setWorkflow((current) => ({
      ...current,
      status: 'running',
      nodes: current.nodes.map((node) => ({ ...node, status: 'queued' })),
      connections: current.connections.map((connection) => ({
        ...connection,
        status: 'inactive',
      })),
      logs: [makeLog(runId, 'Local mock run queued. No external APIs will be called.')],
      artifact: {
        title: 'Artifact in progress',
        format: 'Preview',
        content: 'The local simulator is preparing the workflow artifact.',
        status: 'draft',
      },
    }))

    const outcomeSequence: Array<'PASS' | 'REVIEW' | 'FAIL'> = ['PASS', 'REVIEW', 'PASS']
    const outcome = outcomeSequence[new Date().getSeconds() % outcomeSequence.length]
    setCheckOutcome(outcome)

    for (const node of workflow.nodes) {
      if (runTokenRef.current !== runToken) {
        return
      }

      setWorkflow((current) => ({
        ...setNodeStatus(current, node.id, 'running'),
        logs: [...current.logs, makeLog(runId, `${node.title} started.`, node.id)],
        connections: current.connections.map((connection) =>
          connection.sourceNodeId === node.id || connection.targetNodeId === node.id
            ? { ...connection, status: 'active' }
            : connection,
        ),
      }))

      await delay(220)

      const nextStatus =
        node.title === 'Check' && outcome === 'REVIEW' ? 'review_required' : 'success'
      setWorkflow((current) => ({
        ...setNodeStatus(current, node.id, nextStatus),
        logs: [
          ...current.logs,
          makeLog(
            runId,
            node.title === 'Check'
              ? `Check completed with ${outcome}.`
              : `${node.title} completed.`,
            node.id,
            node.title === 'Check' && outcome !== 'PASS' ? 'warn' : 'info',
          ),
        ],
        connections: current.connections.map((connection) =>
          connection.sourceNodeId === node.id || connection.targetNodeId === node.id
            ? { ...connection, status: 'success' }
            : connection,
        ),
      }))
    }

    if (runTokenRef.current !== runToken) {
      return
    }

    setWorkflow((current) => {
      const bottleneck = calculateBottleneck(current.nodes)
      const tokens = current.nodes.reduce(
        (total, node) => total + (node.metrics?.estimatedTokens ?? 0),
        0,
      )
      const cost = current.nodes.reduce(
        (total, node) => total + (node.metrics?.estimatedCost ?? 0),
        0,
      )
      const latencyMs = current.nodes.reduce(
        (total, node) => total + (node.metrics?.estimatedLatencyMs ?? 0),
        0,
      )

      return {
        ...current,
        status: outcome === 'REVIEW' ? 'review_required' : 'success',
        metrics: {
          tokens,
          cost,
          latencyMs,
          successRate: outcome === 'FAIL' ? 84 : outcome === 'REVIEW' ? 92 : 100,
          queueCount: 0,
          retryCount: current.nodes.reduce(
            (total, node) => total + (node.metrics?.retryCount ?? 0),
            0,
          ),
          bottleneckNodeId: bottleneck?.id ?? null,
        },
        logs: [
          ...current.logs,
          makeLog(runId, 'Metrics updated and template save mock completed.', undefined, 'metric'),
        ],
        artifact: {
          title: 'Bootstrap MVP Artifact',
          format: 'Markdown',
          status: outcome === 'REVIEW' ? 'review_required' : 'checked',
          content: [
            '# Agent Workflow Studio Mock Artifact',
            '',
            `- Check result: ${outcome}`,
            `- Nodes executed: ${current.nodes.length}`,
            `- Tokens: ${tokens}`,
            `- Estimated cost: $${cost.toFixed(3)}`,
            `- Bottleneck: ${bottleneck?.title ?? 'None'}`,
            '',
            'This artifact was produced by a local simulator. No Codex, Hermes, Grok, X, or external API call was made.',
          ].join('\n'),
        },
        updatedAt: new Date().toISOString(),
      }
    })
    setIsRunning(false)
  }

  function stopRun() {
    runTokenRef.current += 1
    setIsRunning(false)
    setWorkflow((current) => ({
      ...current,
      status: 'paused',
      nodes: current.nodes.map((node) =>
        node.status === 'running' || node.status === 'queued'
          ? { ...node, status: 'skipped' }
          : node,
      ),
      logs: [
        ...current.logs,
        makeLog(`run-stop-${Date.now()}`, 'Local mock run stopped by user.', undefined, 'warn'),
      ],
    }))
  }

  function handleReset() {
    runTokenRef.current += 1
    setIsRunning(false)
    setWorkflow(resetWorkflow())
    setSelectedNodeId('node-1')
    setCheckOutcome('PASS')
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
      />
      <div className="workspace-grid">
        <PartsPalette
          parts={workflow.nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
        <div className="center-stack">
          <WorkflowCanvas
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
          <StagePreview artifact={workflow.artifact} checkOutcome={checkOutcome} />
        </div>
        <Inspector selectedNode={selectedNode} nodes={workflow.nodes} />
      </div>
      <BottomMonitor workflow={workflow} />
    </div>
  )
}
