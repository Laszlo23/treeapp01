/**
 * Live smoke: call configured AI_PROVIDER (Ultralytics URL or Roboflow) exactly like plant upload verification.
 *
 * Usage (from treegens-backend-main, with `.env`):
 *   yarn ai:plant-smoke /path/to/plant-video.mp4
 *
 * Prints JSON result: countedMangroves, confidence, ok/skipped, errors.
 */
import 'dotenv/config'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import env from '../config/environment'
import { verifyMangrovePlantVideo } from '../services/aiMangroveVerificationService'

const videoPath = process.argv[2]
if (!videoPath) {
  console.error(
    'Usage: yarn ai:plant-smoke <path-to-video>\nExample: yarn ai:plant-smoke ~/Videos/planting.webm',
  )
  process.exit(1)
}

function sniffContentType(absPath: string): string {
  const lower = absPath.toLowerCase()
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov')) return 'video/quicktime'
  if (lower.endsWith('.mkv')) return 'video/x-matroska'
  return 'video/mp4'
}

async function main() {
  console.log(
    'AI_PROVIDER:',
    env.AI_PROVIDER,
    env.AI_PROVIDER === 'roboflow_workflow' ? '(Roboflow)' : '(Ultralytics-style)',
  )
  console.log(
    'AI_ULTRALYTICS_INPUT_MODE:',
    env.AI_ULTRALYTICS_INPUT_MODE,
    '(middle_frame_jpeg matches image /predict curls; multipart_video sends raw clip)',
  )
  const abs = resolve(videoPath)
  const videoBuffer = readFileSync(abs)
  const contentType = sniffContentType(abs)
  console.log('Video:', abs, 'bytes:', videoBuffer.length, 'type:', contentType)

  const started = Date.now()
  const base = abs.split(/[/\\]/).pop() || `smoke.${contentType === 'video/webm' ? 'webm' : 'mp4'}`
  const result = await verifyMangrovePlantVideo({
    videoBuffer,
    filename: base,
    contentType,
    ctx: {
      submissionId: 'ai-plant-smoke',
      userWalletAddress: '0x0000000000000000000000000000000000000001',
      latitude: 0,
      longitude: 0,
      declaredTreesPlanted: 999,
    },
  })
  const ms = Date.now() - started
  console.log('Duration_ms:', ms)
  console.log(JSON.stringify(result, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
