# Agent Workflow Studio

Agent Workflow Studio is a new local-first React application for designing,
running, observing, and reusing AI work as typed workflow nodes. It is a
separate product and repository from the existing `ai-workflow-lab` project.
The attached AI Workflow Lab documents are kept as source specifications, not
as an instruction to modify the old project.

## Source Specifications

The original specification files are preserved without summarizing or rewriting
their contents:

- `docs/source-specs/AI_Workflow_Lab_最終仕様書_v1.0.md`
- `docs/source-specs/AI_Workflow_Lab_画面設計_詳細設計以降_v1.0.md`

## Getting Started

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Bootstrap MVP Scope

The first bootstrap includes:

- React + TypeScript + Vite app shell.
- Top bar, left parts palette, main workflow canvas, right inspector, bottom
  metrics/log monitor, and stage preview.
- Twelve visible MVP nodes: Manual Trigger, Text Input, File Input, Normalize,
  Route, AI Execute, External Connector, Check, Aggregate, Output, Run Log, and
  Template Save.
- Minimal domain model, sample workflow, typed connection rules, bottleneck
  calculation, and local mock run simulation.
- Tokens, cost, latency, success rate, bottleneck, logs, and mock artifact
  display.

## External API Status

No real external API is connected in this bootstrap. Codex, Hermes, Grok/X,
Claude, Gemini, GitHub, and other services are represented as future connector
or role concepts only. The Run button executes a local mock simulator.

## Implementation Order

1. Stabilize the UI skeleton and canvas readability.
2. Add stronger workflow state management and import/export JSON.
3. Expand typed port-level connection validation.
4. Add log persistence and template mock storage.
5. Evaluate Tauri 2 and durable local storage after the UI is stable.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
