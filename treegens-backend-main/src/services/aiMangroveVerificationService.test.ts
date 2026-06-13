import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import {
  aggregateOutputCounts,
  coerceConfidence,
  coerceCount,
  collectAiResponseRoots,
  extractConfidenceFromAiResponse,
  extractCountFromAiResponse,
  extractPerFrameCountsFromAiResponse,
  verifyMangrovePlantVideo,
} from './aiMangroveVerificationService'

test('coerceCount floors non-negative ints', () => {
  assert.equal(coerceCount(3.9), 3)
  assert.equal(coerceCount(-1), 0)
  assert.equal(coerceCount('42'), 42)
  assert.equal(coerceCount('nope'), undefined)
})

test('coerceConfidence maps 0-1 and 0-100', () => {
  assert.equal(coerceConfidence(0.8), 0.8)
  assert.equal(coerceConfidence(95), 0.95)
  assert.equal(coerceConfidence(101), undefined)
})

test('collectAiResponseRoots flattens outputs array', () => {
  const raw = { outputs: [{ mangrove_count: 1 }, { x: 2 }] }
  const roots = collectAiResponseRoots(raw)
  assert.equal(roots.length, 3)
  assert.equal((roots[1] as { mangrove_count: number }).mangrove_count, 1)
})

test('collectAiResponseRoots includes object outputs', () => {
  const raw = { outputs: { mangrove_count: 7 } }
  const roots = collectAiResponseRoots(raw)
  assert.ok(roots.some(r => extractCountFromAiResponse(r) === 7))
})

test('extractCountFromAiResponse finds mangrove_count on root', () => {
  assert.equal(extractCountFromAiResponse({ mangrove_count: 12 }), 12)
})

test('extractCountFromAiResponse finds count inside outputs[0]', () => {
  assert.equal(
    extractCountFromAiResponse({
      outputs: [{ mangrove_count: 4 }],
    }),
    4,
  )
})

test('extractCountFromAiResponse aggregates per-frame outputs with max (not root totalDetections sum)', () => {
  assert.equal(
    extractCountFromAiResponse({
      totalDetections: 300,
      outputs: [
        { mangrove_count: 2 },
        { mangrove_count: 3 },
        { mangrove_count: 2 },
      ],
    }),
    3,
  )
})

test('extractCountFromAiResponse uses results[] when present', () => {
  assert.equal(
    extractCountFromAiResponse({
      totalDetections: 100,
      results: [{ count: 1 }, { count: 4 }, { count: 1 }],
    }),
    4,
  )
})

test('extractPerFrameCountsFromAiResponse lists per-row counts', () => {
  assert.deepEqual(
    extractPerFrameCountsFromAiResponse({
      outputs: [{ seedling_count: 1 }, { seedling_count: 2 }],
    }),
    [1, 2],
  )
})

test('extractPerFrameCountsFromAiResponse ignores cumulative totals inside per-frame chunks', () => {
  assert.deepEqual(
    extractPerFrameCountsFromAiResponse({
      outputs: [
        { totalDetections: 999, mangrove_count: 1 },
        { totalDetections: 999, mangrove_count: 4 },
      ],
    }),
    [1, 4],
  )
  assert.equal(
    extractCountFromAiResponse({
      outputs: [
        { totalDetections: 999, mangrove_count: 1 },
        { totalDetections: 999, mangrove_count: 4 },
      ],
    }),
    4,
  )
})

test('extractCountFromAiResponse prefers unique object tracking when detections are present', () => {
  assert.equal(
    extractCountFromAiResponse({
      outputs: [
        {
          predictions: [
            // same object in both frames (slightly moved)
            { x: 10, y: 10, width: 10, height: 10, class: 'mangrove' },
            // another object
            { x: 40, y: 40, width: 12, height: 12, class: 'mangrove' },
          ],
        },
        {
          predictions: [
            { x: 11, y: 10, width: 10, height: 10, class: 'mangrove' },
            // new object enters
            { x: 80, y: 80, width: 10, height: 10, class: 'mangrove' },
          ],
        },
      ],
    }),
    3,
  )
})

test('aggregateOutputCounts max and sum', () => {
  assert.equal(aggregateOutputCounts([1, 5, 2], 'max'), 5)
  assert.equal(aggregateOutputCounts([1, 5, 2], 'sum'), 8)
})

test('extractCountFromAiResponse reads Roboflow verification_json output', () => {
  assert.equal(
    extractCountFromAiResponse({
      verification_json: { mangrove_count: 6 },
    }),
    6,
  )
  assert.equal(
    extractCountFromAiResponse({
      outputs: { verification_json: { count: 2 } },
    }),
    2,
  )
})

test('extractCountFromAiResponse parses verification_json when emitted as JSON string', () => {
  assert.equal(
    extractCountFromAiResponse({
      outputs: [
        {
          verification_json:
            '{"seedling_count":3,"average_confidence":0.71,"status":"ok"}',
        },
      ],
    }),
    3,
  )
  assert.equal(
    extractCountFromAiResponse({
      verification_json:
        '{"seedling_count":5,"average_confidence":0.8,"plant_type":"Rhizophora"}',
    }),
    5,
  )
})

test('extractCountFromAiResponse uses NMS over bbox tuples and ignores inflated seedling_count', () => {
  const dense = extractCountFromAiResponse({
    outputs: [
      {
        verification_json: JSON.stringify({
          seedling_count: 175,
          average_confidence: 0.88,
          status: 'rejected',
          detections: [
            {
              class: 'mangrove',
              confidence: 0.96,
              bbox: [100, 100, 120, 130],
            },
            {
              class: 'mangrove',
              confidence: 0.95,
              bbox: [105, 105, 122, 128],
            },
            {
              class: 'mangrove',
              confidence: 0.94,
              bbox: [400, 80, 430, 120],
            },
          ],
        }),
      },
    ],
  })
  assert.equal(dense, 2)
})

test('extractCountFromAiResponse drops mega-box before counting', () => {
  assert.equal(
    extractCountFromAiResponse({
      outputs: [
        {
          verification_json: JSON.stringify({
            seedling_count: 10,
            detections: [
              {
                class: 'mangrove',
                confidence: 0.99,
                bbox: [8, 2, 425, 448],
              },
              {
                class: 'mangrove',
                confidence: 0.9,
                bbox: [100, 100, 130, 140],
              },
            ],
          }),
        },
      ],
    }),
    1,
  )
})

test('extractConfidenceFromAiResponse reads average_confidence inside stringified verification_json', () => {
  assert.equal(
    extractConfidenceFromAiResponse({
      verification_json:
        '{"seedling_count":1,"average_confidence":0.6635,"status":"ok"}',
    }),
    0.6635,
  )
})

test('extractConfidenceFromAiResponse reads nested outputs', () => {
  assert.equal(
    extractConfidenceFromAiResponse({
      outputs: [{ confidence: 0.91 }],
    }),
    0.91,
  )
})

test('verifyMangrovePlantVideo roboflow_workflow skips ffmpeg when workflowImageUrl is set', async t => {
  const keys = [
    'AI_PROVIDER',
    'ROBOFLOW_API_KEY',
    'ROBOFLOW_WORKFLOW_URL',
    'ROBOFLOW_WORKSPACE_NAME',
    'ROBOFLOW_WORKSPACE',
    'ROBOFLOW_WORKFLOW_ID',
    'ROBOFLOW_WORKFLOW_SPEC_PATH',
    'AI_ROBOFLOW_SEND_VIDEOMETA',
    'AI_ROBOFLOW_SEND_CONFIDENCE',
    'AI_ROBOFLOW_MINIMAL_REQUEST',
  ] as const
  const restore = keys.map(k => {
    const v = process.env[k]
    return () => {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  t.after(() => restore.forEach(fn => fn()))

  process.env.AI_PROVIDER = 'roboflow_workflow'
  process.env.ROBOFLOW_API_KEY = 'test-key'
  process.env.ROBOFLOW_WORKFLOW_URL =
    'https://serverless.roboflow.com/ws/workflows/wf-test'
  delete process.env.ROBOFLOW_WORKSPACE_NAME
  delete process.env.ROBOFLOW_WORKSPACE
  delete process.env.ROBOFLOW_WORKFLOW_ID
  delete process.env.ROBOFLOW_WORKFLOW_SPEC_PATH
  process.env.AI_ROBOFLOW_SEND_VIDEOMETA = 'false'
  process.env.AI_ROBOFLOW_SEND_CONFIDENCE = 'false'

  type PostFn = typeof axios.post
  const originalPost = axios.post
  axios.post = (async (url: string, payload: unknown) => {
    assert.match(url, /serverless\.roboflow\.com/)
    assert.equal((payload as { api_key?: string }).api_key, 'test-key')
    const inputs = (payload as { inputs: Record<string, unknown> }).inputs
    assert.equal((inputs.image as { type: string }).type, 'url')
    assert.equal(
      (inputs.image as { value: string }).value,
      'https://cdn.example/img.jpg',
    )
    assert.equal('confidence' in inputs, false)
    assert.equal('videometa' in inputs, false)
    return {
      status: 200,
      data: { outputs: [{ mangrove_count: 5 }] },
    }
  }) as PostFn

  try {
    const result = await verifyMangrovePlantVideo({
      videoBuffer: Buffer.alloc(0),
      filename: 'plant.mp4',
      contentType: 'video/mp4',
      workflowImageUrl: 'https://cdn.example/img.jpg',
      ctx: {
        submissionId: 'sub-1',
        userWalletAddress: '0xabc',
        latitude: 1,
        longitude: 2,
        declaredTreesPlanted: 5,
      },
    })

    assert.equal(result.skipped && result.ok, false)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.countedMangroves, 5)
    }
  } finally {
    axios.post = originalPost
  }
})

test('verifyMangrovePlantVideo ultralytics posts multipart when configured', async t => {
  const keys = [
    'AI_PROVIDER',
    'AI_API_BEARER_TOKEN',
    'AI_API_PREDICT_URL',
    'AI_API_VERIFY_PATH',
    'AI_PREDICT_CONF',
    'AI_PREDICT_IOU',
    'AI_PREDICT_IMGSZ',
    'AI_ULTRALYTICS_INPUT_MODE',
  ] as const
  const restore = keys.map(k => {
    const v = process.env[k]
    return () => {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })
  t.after(() => restore.forEach(fn => fn()))

  process.env.AI_PROVIDER = 'ultralytics'
  process.env.AI_API_BEARER_TOKEN = 'bearer-ul'
  process.env.AI_API_PREDICT_URL = 'https://predict.example/run'
  delete process.env.AI_API_VERIFY_PATH
  process.env.AI_PREDICT_CONF = '0.25'
  process.env.AI_ULTRALYTICS_INPUT_MODE = 'multipart_video'

  type PostFn = typeof axios.post
  const originalPost = axios.post
  axios.post = (async (_url: string, form: unknown) => {
    assert.ok(form && typeof form === 'object')
    assert.equal(_url, 'https://predict.example/run')
    assert.ok(
      typeof (form as { getHeaders?: () => unknown }).getHeaders === 'function',
    )
    return { status: 200, data: { count: 3 } }
  }) as PostFn

  try {
    const buf = Buffer.from('fake-mp4')
    const result = await verifyMangrovePlantVideo({
      videoBuffer: buf,
      filename: 'plant.mp4',
      contentType: 'video/mp4',
      ctx: {
        submissionId: 'sub-2',
        userWalletAddress: '0xdef',
        latitude: 0,
        longitude: 0,
        declaredTreesPlanted: 3,
      },
    })
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.countedMangroves, 3)
  } finally {
    axios.post = originalPost
  }
})

test('verifyMangrovePlantVideo treegens_ml posts to planting /internal/verify-video', async t => {
  const keys = [
    'AI_PROVIDER',
    'PLANTING_VERIFICATION_API_URL',
    'PLANTING_VERIFICATION_INTERNAL_KEY',
  ] as const
  const restore = keys.map(k => {
    const v = process.env[k]
    return () => {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })
  t.after(() => restore.forEach(fn => fn()))

  process.env.AI_PROVIDER = 'treegens_ml'
  process.env.PLANTING_VERIFICATION_API_URL = 'http://127.0.0.1:8000'
  process.env.PLANTING_VERIFICATION_INTERNAL_KEY = 'test-internal-key'

  type PostFn = typeof axios.post
  const originalPost = axios.post
  axios.post = (async (url: string) => {
    assert.equal(url, 'http://127.0.0.1:8000/internal/verify-video')
    return {
      status: 200,
      data: {
        unique_tree_estimate: 101,
        verification: {
          aggregate_pass: true,
          model: {
            tree_detections: [{ confidence: 0.92 }, { confidence: 0.88 }],
          },
        },
      },
    }
  }) as PostFn

  try {
    const result = await verifyMangrovePlantVideo({
      videoBuffer: Buffer.from('fake-mp4'),
      filename: 'plant.mp4',
      contentType: 'video/mp4',
      ctx: {
        submissionId: 'sub-ml',
        userWalletAddress: '0xabc',
        latitude: 1.2,
        longitude: 3.4,
        declaredTreesPlanted: 101,
      },
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.countedMangroves, 101)
      assert.equal(result.confidence, 0.9)
    }
  } finally {
    axios.post = originalPost
  }
})
