/** Pure routing rules for mangrove AI auto-approve (testable without DB). */

export type MangroveAiRoutingInput = {
  countedMangroves: number
  declaredTreesPlanted: number
  confidence?: number
  maxCountDelta: number
  minConfidence: number
}

export type MangroveAiRoutingResult = {
  shouldAutoApprove: boolean
  decision: 'auto_approved' | 'pending_verifier'
  submissionStatus: 'approved' | 'pending_review'
}

export function evaluateMangroveAiRouting(
  input: MangroveAiRoutingInput,
): MangroveAiRoutingResult {
  const countOk =
    Math.abs(input.countedMangroves - input.declaredTreesPlanted) <=
    input.maxCountDelta
  const conf = input.confidence
  const confOk =
    typeof conf === 'number' && Number.isFinite(conf) && conf >= input.minConfidence
  const shouldAutoApprove = confOk && countOk
  return {
    shouldAutoApprove,
    decision: shouldAutoApprove ? 'auto_approved' : 'pending_verifier',
    submissionStatus: shouldAutoApprove ? 'approved' : 'pending_review',
  }
}

/** Land upload always creates submissions awaiting the after (plant) clip. */
export const LAND_UPLOAD_INITIAL_STATUS = 'awaiting_plant' as const

export function canAttachPlantClip(submission: {
  status: string
  plant?: { uploaded?: boolean }
}): boolean {
  return (
    submission.status === LAND_UPLOAD_INITIAL_STATUS &&
    submission.plant?.uploaded !== true
  )
}
