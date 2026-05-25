import type { BriefingInput, BriefingResult } from '../../domain/briefing'

export type BriefingGenerateRequest = {
  prompt: string
  input: BriefingInput
}

export interface BriefingAdapter {
  readonly name: string
  readonly isMock: boolean
  generate(request: BriefingGenerateRequest): Promise<BriefingResult>
}
