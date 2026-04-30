import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveRoboflowPostUrl } from './roboflowWorkflowMangrove'

const ROBO_KEYS = [
  'ROBOFLOW_API_URL',
  'ROBOFLOW_SERVERLESS_URL',
  'ROBOFLOW_WORKFLOW_URL',
  'ROBOFLOW_WORKSPACE_NAME',
  'ROBOFLOW_WORKSPACE',
  'ROBOFLOW_WORKFLOW_ID',
  'ROBOFLOW_WORKFLOW_SPEC_PATH',
] as const

function withRoboflowEnv(apply: () => void) {
  const restore = ROBO_KEYS.map(k => {
    const v = process.env[k]
    return () => {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })
  ROBO_KEYS.forEach(k => delete process.env[k])
  try {
    apply()
  } finally {
    restore.forEach(fn => fn())
  }
}

test('resolveRoboflowPostUrl uses ROBOFLOW_WORKFLOW_URL first', () => {
  withRoboflowEnv(() => {
    process.env.ROBOFLOW_WORKFLOW_URL =
      'https://serverless.roboflow.com/my-workspace/workflows/my-wf/'
    process.env.ROBOFLOW_WORKSPACE_NAME = 'other'
    process.env.ROBOFLOW_WORKFLOW_ID = 'ignored'
    const r = resolveRoboflowPostUrl()
    assert.equal(
      r?.url,
      'https://serverless.roboflow.com/my-workspace/workflows/my-wf',
    )
    assert.equal(r?.specification, undefined)
  })
})

test('resolveRoboflowPostUrl builds named workflow URL', () => {
  withRoboflowEnv(() => {
    process.env.ROBOFLOW_API_URL = 'https://serverless.roboflow.com'
    process.env.ROBOFLOW_WORKSPACE_NAME = 'zerox-workspace'
    process.env.ROBOFLOW_WORKFLOW_ID = 'mangrove-proof-123'
    const r = resolveRoboflowPostUrl()
    assert.equal(
      r?.url,
      'https://serverless.roboflow.com/zerox-workspace/workflows/mangrove-proof-123',
    )
  })
})

test('resolveRoboflowPostUrl encodes workspace and workflow id segments', () => {
  withRoboflowEnv(() => {
    process.env.ROBOFLOW_API_URL = 'https://serverless.roboflow.com'
    process.env.ROBOFLOW_WORKSPACE_NAME = 'a b'
    process.env.ROBOFLOW_WORKFLOW_ID = 'c/d'
    const r = resolveRoboflowPostUrl()
    assert.equal(
      r?.url,
      'https://serverless.roboflow.com/a%20b/workflows/c%2Fd',
    )
  })
})

test('resolveRoboflowPostUrl returns null when nothing configured', () => {
  withRoboflowEnv(() => {
    assert.equal(resolveRoboflowPostUrl(), null)
  })
})
