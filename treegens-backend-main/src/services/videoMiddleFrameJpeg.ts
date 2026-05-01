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

/**
 * FFmpeg probes format from content; suffix hints help demux quirks (especially WebM from browsers).
 */
export function tempVideoSuffixFromHints(
  filename?: string,
  contentType?: string,
): string {
  const fname = filename?.trim().toLowerCase() || ''
  if (fname.endsWith('.webm')) return '.webm'
  if (fname.endsWith('.mkv')) return '.mkv'
  if (fname.endsWith('.mov')) return '.mov'
  if (fname.endsWith('.m4v')) return '.m4v'
  if (fname.endsWith('.mp4')) return '.mp4'

  const ct = (contentType || '').toLowerCase()
  if (ct.includes('webm')) return '.webm'
  if (ct.includes('matroska')) return '.mkv'
  if (ct.includes('quicktime')) return '.mov'
  if (ct.includes('mp4')) return '.mp4'

  return '.mp4'
}

export function extractMiddleFrameJpegFromMp4(
  videoBuffer: Buffer,
  hints?: { filename?: string; contentType?: string },
): MiddleFrameJpegResult {
  if (!ffmpegPath) {
    throw new Error(
      'ffmpeg-static binary is unavailable on this platform; install ffmpeg or use Ultralytics AI_PROVIDER',
    )
  }

  const dir = os.tmpdir()
  const id = randomUUID()
  const suffix = tempVideoSuffixFromHints(hints?.filename, hints?.contentType)
  const inputPath = path.join(dir, `mangrove-ai-${id}${suffix}`)
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
