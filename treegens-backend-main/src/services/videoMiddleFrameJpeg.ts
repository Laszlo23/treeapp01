import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { path as ffprobePath } from 'ffprobe-static'

export type MiddleFrameJpegResult = {
  jpeg: Buffer
  durationSeconds: number
}

export function extractMiddleFrameJpegFromMp4(
  videoBuffer: Buffer,
): MiddleFrameJpegResult {
  if (!ffmpegPath) {
    throw new Error(
      'ffmpeg-static binary is unavailable on this platform; install ffmpeg or use Ultralytics AI_PROVIDER',
    )
  }

  const dir = os.tmpdir()
  const id = randomUUID()
  const inputPath = path.join(dir, `mangrove-ai-${id}.mp4`)
  const outputPath = path.join(dir, `mangrove-ai-${id}.jpg`)

  try {
    fs.writeFileSync(inputPath, videoBuffer)

    const durationStr = execFileSync(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=nw=1:nk=1',
        inputPath,
      ],
      { encoding: 'utf8' },
    ).trim()

    const durationSeconds = Number.parseFloat(durationStr)
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error(
        `could not read video duration from ffprobe (got "${durationStr}")`,
      )
    }

    const midpointSeconds = durationSeconds / 2
    execFileSync(ffmpegPath, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(midpointSeconds),
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      outputPath,
    ])

    const jpeg = fs.readFileSync(outputPath)
    return { jpeg, durationSeconds }
  } finally {
    for (const p of [inputPath, outputPath]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
