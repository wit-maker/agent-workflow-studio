import { useRef, useState } from 'react'
import type { BriefingAdapter } from '../adapters/briefing/BriefingAdapter'
import type { HudSnapshot } from '../domain/cognitiveHud'
import type {
  BriefingInputMode,
  BriefingResult,
  BriefingState,
} from '../domain/briefing'
import { createInitialBriefingState } from '../domain/briefing'
import { collectBriefingInput } from '../domain/briefingInputCollector'
import { buildBriefingPrompt } from '../domain/briefingPromptBuilder'
import type { ConnectorJob } from '../domain/connectorQueue'
import type { ExecutionGraph } from '../domain/executionGraph'
import type { WorkflowRunRecord } from '../domain/runHistory'
import type { Workflow } from '../domain/workflow'

type UseBriefingGeneratorArgs = {
  workflow: Workflow
  executionGraph: ExecutionGraph | null
  connectorJobs: readonly ConnectorJob[]
  hudSnapshot: HudSnapshot
  runHistoryRecords: readonly WorkflowRunRecord[]
  adapter: BriefingAdapter
}

function validateBriefingResult(result: BriefingResult): void {
  const sections = [result.what, result.why, result.how, result.next]
  if (sections.some((section) => typeof section !== 'string' || section.trim().length === 0)) {
    throw new Error('ブリーフィング結果が不正です。')
  }
}

export function useBriefingGenerator(args: UseBriefingGeneratorArgs) {
  const [state, setState] = useState<BriefingState>(() => createInitialBriefingState())
  const requestIdRef = useRef(0)

  async function generate(): Promise<void> {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setState((current) => ({
      ...current,
      status: 'generating',
      error: null,
    }))

    try {
      const input = collectBriefingInput({
        workflow: args.workflow,
        executionGraph: args.executionGraph,
        connectorJobs: args.connectorJobs,
        hudSnapshot: args.hudSnapshot,
        runHistoryRecords: args.runHistoryRecords,
        mode: state.inputMode,
      })
      const prompt = buildBriefingPrompt(input)
      const result = await args.adapter.generate({ prompt, input })
      validateBriefingResult(result)

      if (requestId !== requestIdRef.current) {
        return
      }

      setState((current) => ({
        ...current,
        status: 'done',
        result,
        error: null,
        generatedAt: result.generatedAt,
      }))
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setState((current) => ({
        ...current,
        status: 'error',
        error:
          error instanceof Error ? error.message : 'ブリーフィング生成に失敗しました。',
      }))
    }
  }

  function setInputMode(inputMode: BriefingInputMode): void {
    setState((current) => ({ ...current, inputMode }))
  }

  return {
    state,
    generate,
    setInputMode,
  }
}
