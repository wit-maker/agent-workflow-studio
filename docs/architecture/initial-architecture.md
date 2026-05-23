# Initial Architecture

Agent Workflow Studio starts as a local-only Vite application with React and
TypeScript. The bootstrap intentionally avoids Tauri, SQLite, React Flow, real
API calls, authentication, and cloud storage so the domain model and UI shell
can stay easy to inspect.

## Layers

- `src/domain/`: workflow types, sample workflow data, connection rules, and
  metrics helpers.
- `src/components/`: shell layout, palette, canvas, node cards, connection
  lines, inspector, stage preview, and bottom monitor.
- `docs/source-specs/`: original AI Workflow Lab source specifications.

## Runtime Model

The first run model is a local simulator:

1. Queue every node.
2. Execute nodes in sample order.
3. Mark each node as running, then success or review required.
4. Update connection state, logs, metrics, and artifact preview.

No connector is allowed to call a real service in the bootstrap.

## Extension Points

- Replace fixed sample layout with editable node positions.
- Introduce reducer or Zustand for state transitions.
- Add JSON import/export for workflow persistence.
- Add connector abstractions only after safety and credential rules are clear.
