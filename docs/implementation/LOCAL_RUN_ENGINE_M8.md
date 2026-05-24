# Local Run Engine M8

M8 keeps execution local and mocked. It does not call real APIs, store credentials, or connect to Codex, Hermes, Grok, or other live adapters.

## Flow

```text
workflow state
-> run planner
-> execution queue
-> node executor mock
-> check/review decision
-> artifact update
-> metrics update
-> logs
```

## Files

- `src/domain/runPlanner.ts`: selects nodes for Run All, Run Selected, Run From Selected, and Dry Run.
- `src/domain/nodeExecutors.ts`: returns local mock outcomes for normal nodes and check nodes.
- `src/domain/runEngine.ts`: builds local artifact and metrics summaries.

## Run Modes

- Run All: plans every node.
- Run Selected: plans the selected node only.
- Run From Selected: plans the selected node and all following nodes.
- Dry Run: validates/plans nodes and marks them skipped without real execution.

## Statuses

The local UI can surface `queued`, `running`, `success`, `failed`, `review_required`, and `skipped`.

## Metrics

The run engine updates tokens, cost, latencyMs, successRate, queueCount, retryCount, and bottleneckNodeId from local estimates.
