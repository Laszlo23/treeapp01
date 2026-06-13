import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAttachPlantClip,
  evaluateMangroveAiRouting,
  LAND_UPLOAD_INITIAL_STATUS,
} from './submissionAiRouting'

test('land upload initial status is awaiting_plant', () => {
  assert.equal(LAND_UPLOAD_INITIAL_STATUS, 'awaiting_plant')
})

test('canAttachPlantClip allows plant only when awaiting_plant and plant missing', () => {
  assert.equal(
    canAttachPlantClip({ status: 'awaiting_plant', plant: { uploaded: false } }),
    true,
  )
  assert.equal(
    canAttachPlantClip({ status: 'awaiting_plant', plant: { uploaded: true } }),
    false,
  )
  assert.equal(canAttachPlantClip({ status: 'pending_review' }), false)
})

test('evaluateMangroveAiRouting auto-approves when count and confidence match', () => {
  const r = evaluateMangroveAiRouting({
    countedMangroves: 40,
    declaredTreesPlanted: 41,
    confidence: 0.95,
    maxCountDelta: 2,
    minConfidence: 0.9,
  })
  assert.equal(r.shouldAutoApprove, true)
  assert.equal(r.decision, 'auto_approved')
  assert.equal(r.submissionStatus, 'approved')
})

test('evaluateMangroveAiRouting pending when count delta exceeds threshold', () => {
  const r = evaluateMangroveAiRouting({
    countedMangroves: 30,
    declaredTreesPlanted: 40,
    confidence: 0.95,
    maxCountDelta: 2,
    minConfidence: 0.9,
  })
  assert.equal(r.shouldAutoApprove, false)
  assert.equal(r.decision, 'pending_verifier')
  assert.equal(r.submissionStatus, 'pending_review')
})

test('evaluateMangroveAiRouting pending when confidence below threshold', () => {
  const r = evaluateMangroveAiRouting({
    countedMangroves: 40,
    declaredTreesPlanted: 40,
    confidence: 0.5,
    maxCountDelta: 2,
    minConfidence: 0.9,
  })
  assert.equal(r.shouldAutoApprove, false)
})
