/**
 * Quick local smoke test for Roboflow workflow + middle-frame JPEG path.
 *
 * Usage (from treegens-backend-main, with `.env` or env vars):
 *   yarn roboflow:smoke ~/Downloads/sample.mp4
 *
 * Requires: ROBOFLOW_API_KEY and one of ROBOFLOW_WORKFLOW_URL,
 * ROBOFLOW_WORKSPACE_NAME+ROBOFLOW_WORKFLOW_ID, or ROBOFLOW_WORKFLOW_SPEC_PATH.
 */
import 'dotenv/config'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import env from '../config/environment'
import {
  postRoboflowWorkflowWithImage,
  resolveRoboflowPostUrl,
} from '../services/roboflowWorkflowMangrove'
import { extractMiddleFrameJpegFromMp4 } from '../services/videoMiddleFrameJpeg'

const videoPath = process.argv[2]
if (!videoPath) {
  console.error(
    'Usage: yarn roboflow:smoke <path-to-video.mp4>\nExample: yarn roboflow:smoke ~/Downloads/tree.mp4',
  )
  process.exit(1)
}

async function main() {
  if (!env.ROBOFLOW_API_KEY) {
    console.error('Set ROBOFLOW_API_KEY in the environment or .env file.')
    process.exit(1)
  }

  const endpoint = resolveRoboflowPostUrl()
  if (!endpoint) {
    console.error(
      'Configure a Roboflow endpoint: ROBOFLOW_WORKFLOW_URL, or ROBOFLOW_WORKSPACE_NAME + ROBOFLOW_WORKFLOW_ID, or ROBOFLOW_WORKFLOW_SPEC_PATH.',
    )
    process.exit(1)
  }

  const abs = resolve(videoPath)
  const videoBuffer = readFileSync(abs)
  console.log('Video:', abs, 'bytes:', videoBuffer.length)
  console.log(
    'POST:',
    endpoint.url,
    endpoint.specification ? '(+ specification file)' : '',
  )

  const frame = extractMiddleFrameJpegFromMp4(videoBuffer, {
    filename: abs.split(/[/\\]/).pop(),
    contentType: abs.toLowerCase().endsWith('.webm')
      ? 'video/webm'
      : 'video/mp4',
  })
  console.log(
    'Middle JPEG:',
    frame.jpeg.length,
    'bytes, duration_s:',
    frame.durationSeconds,
  )

  let overlay: Record<string, unknown> | undefined
  const rawMeta = env.AI_ROBOFLOW_VIDEOMETA_JSON
  if (rawMeta) {
    overlay = JSON.parse(rawMeta) as Record<string, unknown>
  }

  const videometa =
    env.AI_ROBOFLOW_SEND_VIDEOMETA ||
    (overlay && Object.keys(overlay).length > 0)
      ? {
          extraction: 'middle_frame_jpeg',
          duration_seconds: frame.durationSeconds,
          ...(overlay || {}),
        }
      : undefined

  const { status, data } = await postRoboflowWorkflowWithImage({
    imageBase64: frame.jpeg.toString('base64'),
    ...(videometa ? { videometa } : {}),
  })

  console.log('HTTP status:', status)
  console.log(JSON.stringify(data, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
