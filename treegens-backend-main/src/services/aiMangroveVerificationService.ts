import axios from 'axios'
import FormData from 'form-data'
import env from '../config/environment'
import {
  postRoboflowWorkflowWithImage,
  resolveRoboflowPostUrl,
} from './roboflowWorkflowMangrove'
import { extractMiddleFrameJpegFromMp4 } from './videoMiddleFrameJpeg'

export type AiMangroveVerifyContext = {
  submissionId: string
  userWalletAddress: string
  latitude: number
  longitude: number
  declaredTreesPlanted: number
}

export type AiMangroveVerifySuccess = {
  ok: true
  skipped: false
  countedMangroves: number
  /** Normalized to 0–1 when possible */
  confidence?: number
  raw: unknown
}

export type AiMangroveVerifySkipped = {
  ok: false
  skipped: true
  reason: 'not_configured' | 'missing_path'
  raw?: unknown
}

export type AiMangroveVerifyFailure = {
  ok: false
  skipped: false
  error: string
  raw?: unknown
}

export type AiMangroveVerifyResult =
  | AiMangroveVerifySuccess
  | AiMangroveVerifySkipped
  | AiMangroveVerifyFailure

function getByPath(obj: unknown, pathParts: string[]): unknown {
  let cur: unknown = obj
  for (const p of pathParts) {
    if (cur === null || cur === undefined) return undefined
    if (typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function coerceCount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Math.max(0, Math.floor(Number(value.trim())))
  }
  return undefined
}

/** Returns confidence in 0–1 range when parsable */
export function coerceConfidence(value: unknown): number | undefined {
  let n: number
  if (typeof value === 'number' && Number.isFinite(value)) {
    n = value
  } else if (
    typeof value === 'string' &&
    /^-?\d+(\.\d+)?$/.test(value.trim())
  ) {
    n = Number(value.trim())
  } else {
    return undefined
  }
  if (n > 1 && n <= 100) return Math.min(1, n / 100)
  if (n >= 0 && n <= 1) return n
  return undefined
}

function extractFromPaths(
  data: unknown,
  paths: string[],
  coerce: (v: unknown) => number | undefined,
): number | undefined {
  for (const pathStr of paths) {
    const parts = pathStr.split('.').filter(Boolean)
    const v = getByPath(data, parts)
    const out = coerce(v)
    if (out !== undefined) return out
  }
  return undefined
}

/**
 * Roboflow Serverless workflows often return `verification_json` as a JSON **string**
 * (not a nested object). Parse and surface it as an extra root so dot-paths like
 * `seedling_count` / `mangrove_count` resolve without custom env wiring.
 */
function rootsFromParsedVerificationJsonString(
  root: unknown,
): unknown[] {
  if (!root || typeof root !== 'object' || Array.isArray(root)) return []
  const rec = root as Record<string, unknown>
  const vj = rec.verification_json
  if (typeof vj !== 'string') return []
  const t = vj.trim()
  if (!t.startsWith('{')) return []
  try {
    const parsed = JSON.parse(t) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return [parsed]
    }
  } catch {
    /* ignore malformed workflow output */
  }
  return []
}

/** Roboflow / workflow payloads often expose results under `outputs` (array or object). */
export function collectAiResponseRoots(raw: unknown): unknown[] {
  const roots: unknown[] = [raw]

  if (raw && typeof raw === 'object') {
    const top = raw as Record<string, unknown>
    const outputs = top.outputs
    if (Array.isArray(outputs)) {
      for (const chunk of outputs) {
        roots.push(chunk)
      }
    } else if (outputs && typeof outputs === 'object') {
      roots.push(outputs)
    }
  }

  const snapshot = [...roots]
  for (const root of snapshot) {
    for (const extra of rootsFromParsedVerificationJsonString(root)) {
      roots.push(extra)
    }
  }

  return roots
}

/** Video APIs often put one entry per frame under `outputs` or `results`. */
function getPerFrameResultArray(raw: unknown): unknown[] | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const top = raw as Record<string, unknown>
  if (Array.isArray(top.outputs) && top.outputs.length > 0) return top.outputs
  if (Array.isArray(top.results) && top.results.length > 0) return top.results
  const data = top.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.outputs) && d.outputs.length > 0) return d.outputs
    if (Array.isArray(d.results) && d.results.length > 0) return d.results
  }
  return undefined
}

/** Paths that usually encode summed video detections (not per-frame). See env AI_RESPONSE_CUMULATIVE_COUNT_PATHS. */
function isCumulativeCountPath(pathStr: string): boolean {
  const mark = new Set(env.AI_RESPONSE_CUMULATIVE_COUNT_PATHS)
  if (mark.has(pathStr)) return true
  const last = pathStr.includes('.')
    ? pathStr.slice(pathStr.lastIndexOf('.') + 1)
    : pathStr
  return mark.has(last)
}

function extractCountFromSingleBlob(blob: unknown): number | undefined {
  for (const root of collectAiResponseRoots(blob)) {
    const c = extractFromPaths(root, env.AI_RESPONSE_COUNT_PATHS, coerceCount)
    if (c !== undefined) return c
  }
  return undefined
}

/** Collect per-frame / per-chunk counts when the model returns an array (common for video). */
export function extractPerFrameCountsFromAiResponse(raw: unknown): number[] {
  const frames = getPerFrameResultArray(raw)
  if (!frames) return []
  const out: number[] = []
  for (const chunk of frames) {
    const c = extractCountFromSingleBlob(chunk)
    if (c !== undefined) out.push(c)
  }
  return out
}

export function aggregateOutputCounts(
  counts: number[],
  mode:
    | 'max'
    | 'min'
    | 'sum'
    | 'median'
    | 'mean'
    | 'first'
    | 'last',
): number {
  if (counts.length === 0) return 0
  if (counts.length === 1) return counts[0]
  const sorted = [...counts].sort((a, b) => a - b)
  switch (mode) {
    case 'sum':
      return counts.reduce((a, b) => a + b, 0)
    case 'min':
      return Math.min(...counts)
    case 'max':
      return Math.max(...counts)
    case 'first':
      return counts[0]
    case 'last':
      return counts[counts.length - 1]
    case 'mean': {
      const s = counts.reduce((a, b) => a + b, 0)
      return Math.max(0, Math.floor(s / counts.length))
    }
    case 'median': {
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 1
        ? sorted[mid]
        : Math.max(0, Math.floor((sorted[mid - 1] + sorted[mid]) / 2))
    }
    default:
      return Math.max(...counts)
  }
}

export function extractCountFromAiResponse(raw: unknown): number | undefined {
  const perFrame = extractPerFrameCountsFromAiResponse(raw)
  if (perFrame.length > 0) {
    return aggregateOutputCounts(perFrame, env.AI_RESPONSE_OUTPUTS_AGGREGATION)
  }

  const frames = getPerFrameResultArray(raw)
  const multiFrame = frames !== undefined && frames.length > 1

  for (const root of collectAiResponseRoots(raw)) {
    const paths =
      root === raw && multiFrame
        ? env.AI_RESPONSE_COUNT_PATHS.filter(p => !isCumulativeCountPath(p))
        : env.AI_RESPONSE_COUNT_PATHS
    const c = extractFromPaths(root, paths, coerceCount)
    if (c !== undefined) return c
  }
  return undefined
}

export function extractConfidenceFromAiResponse(
  raw: unknown,
): number | undefined {
  for (const root of collectAiResponseRoots(raw)) {
    const c = extractFromPaths(
      root,
      env.AI_RESPONSE_CONFIDENCE_PATHS,
      coerceConfidence,
    )
    if (c !== undefined) return c
  }
  return undefined
}

function capRawPayload(raw: unknown): string | undefined {
  try {
    const s = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const max = env.AI_RAW_RESPONSE_MAX_CHARS
    if (!s || s === 'undefined') return undefined
    return s.length > max ? `${s.slice(0, max)}…[truncated]` : s
  } catch {
    return undefined
  }
}

function buildAiUrl(): string | null {
  const full = env.AI_API_PREDICT_URL
  if (full) return full

  const pathSeg = env.AI_API_VERIFY_PATH
  if (!pathSeg) return null
  const base = env.AI_API_BASE_URL
  const pathParsed = pathSeg.startsWith('/') ? pathSeg : `/${pathSeg}`
  return `${base}${pathParsed}`
}

function appendUltralyticsPredictFormFields(form: FormData): void {
  if (env.AI_PREDICT_CONF) form.append('conf', env.AI_PREDICT_CONF)
  if (env.AI_PREDICT_IOU) form.append('iou', env.AI_PREDICT_IOU)
  if (env.AI_PREDICT_IMGSZ) form.append('imgsz', env.AI_PREDICT_IMGSZ)
}

function mergeOptionalVideometaJson(): Record<string, unknown> | undefined {
  const raw = env.AI_ROBOFLOW_VIDEOMETA_JSON
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new Error('AI_ROBOFLOW_VIDEOMETA_JSON must be valid JSON object')
  }
}

async function verifyMangrovePlantVideoUltralytics(opts: {
  videoBuffer: Buffer
  filename: string
  contentType: string
  ctx: AiMangroveVerifyContext
}): Promise<AiMangroveVerifyResult> {
  const token = env.AI_API_BEARER_TOKEN?.trim()
  const url = buildAiUrl()

  if (!token) {
    return { ok: false, skipped: true, reason: 'not_configured' }
  }
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_path' }
  }

  let uploadBody = opts.videoBuffer
  let uploadFilename = opts.filename || 'plant.mp4'
  let uploadContentType = opts.contentType || 'video/mp4'

  if (env.AI_ULTRALYTICS_INPUT_MODE === 'middle_frame_jpeg') {
    try {
      const frame = extractMiddleFrameJpegFromMp4(opts.videoBuffer, {
        filename: opts.filename,
        contentType: opts.contentType,
      })
      uploadBody = frame.jpeg
      uploadFilename = 'mangrove-frame.jpg'
      uploadContentType = 'image/jpeg'
    } catch (e: unknown) {
      return {
        ok: false,
        skipped: false,
        error: `video frame extraction failed: ${String(
          e && typeof e === 'object' && 'message' in e
            ? (e as { message: string }).message
            : e,
        )}`,
      }
    }
  }

  const form = new FormData()
  form.append(env.AI_VIDEO_FORM_FIELD_NAME, uploadBody, {
    filename: uploadFilename,
    contentType: uploadContentType,
  })
  appendUltralyticsPredictFormFields(form)

  if (env.AI_API_SEND_SUBMISSION_METADATA) {
    form.append('submissionId', opts.ctx.submissionId)
    form.append('userWalletAddress', opts.ctx.userWalletAddress)
    form.append('latitude', String(opts.ctx.latitude))
    form.append('longitude', String(opts.ctx.longitude))
    form.append('declaredTreesPlanted', String(opts.ctx.declaredTreesPlanted))
  }

  try {
    const response = await axios.post(url, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: env.AI_REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    })

    const raw = response.data
    if (response.status < 200 || response.status >= 300) {
      const msg =
        (raw &&
          typeof raw === 'object' &&
          (raw as { message?: string; error?: string }).message) ||
        (raw && typeof raw === 'object' && (raw as { error?: string }).error) ||
        `AI API HTTP ${response.status}`
      return {
        ok: false,
        skipped: false,
        error: typeof msg === 'string' ? msg : `AI API HTTP ${response.status}`,
        raw,
      }
    }

    const count = extractCountFromAiResponse(raw)
    if (count === undefined) {
      return {
        ok: false,
        skipped: false,
        error: 'AI response missing parsable mangrove count',
        raw,
      }
    }

    const confidenceRaw = extractConfidenceFromAiResponse(raw)

    return {
      ok: true,
      skipped: false,
      countedMangroves: count,
      ...(confidenceRaw !== undefined ? { confidence: confidenceRaw } : {}),
      raw,
    }
  } catch (e: unknown) {
    const errMsg = resolveAxiosCatchMessage(e)

    const rawPayload =
      e && typeof e === 'object'
        ? (e as { response?: { data?: unknown } }).response?.data
        : undefined

    return {
      ok: false,
      skipped: false,
      error: errMsg,
      raw: rawPayload,
    }
  }
}

function resolveAxiosCatchMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const ex = e as {
      response?: { data?: { message?: string; error?: string } }
      message?: string
    }
    const d = ex.response?.data
    return String(d?.message || d?.error || ex.message || 'AI request failed')
  }
  return String(e)
}

async function verifyMangrovePlantVideoRoboflow(opts: {
  videoBuffer: Buffer
  filename: string
  contentType: string
  ctx: AiMangroveVerifyContext
  /**
   * When set, Roboflow receives `inputs.image` as `{ type: "url", value }` (skips local MP4→JPEG).
   * URL must be reachable from Roboflow’s servers.
   */
  workflowImageUrl?: string
}): Promise<AiMangroveVerifyResult> {
  const apiKey = env.ROBOFLOW_API_KEY
  if (!apiKey) {
    return { ok: false, skipped: true, reason: 'not_configured' }
  }

  if (!resolveRoboflowPostUrl()) {
    return { ok: false, skipped: true, reason: 'missing_path' }
  }

  const workflowImageUrl = opts.workflowImageUrl?.trim()

  let frame: ReturnType<typeof extractMiddleFrameJpegFromMp4> | undefined
  if (!workflowImageUrl) {
    try {
      frame = extractMiddleFrameJpegFromMp4(opts.videoBuffer, {
        filename: opts.filename,
        contentType: opts.contentType,
      })
    } catch (e: unknown) {
      return {
        ok: false,
        skipped: false,
        error: `video frame extraction failed: ${String(
          e && typeof e === 'object' && 'message' in e
            ? (e as { message: string }).message
            : e,
        )}`,
      }
    }
  }

  let overlay: Record<string, unknown> | undefined
  try {
    overlay = mergeOptionalVideometaJson()
  } catch (e: unknown) {
    return {
      ok: false,
      skipped: false,
      error: String(
        e && typeof e === 'object' && 'message' in e
          ? (e as { message: string }).message
          : e,
      ),
    }
  }

  let videometa: Record<string, unknown> | undefined
  if (env.AI_ROBOFLOW_SEND_VIDEOMETA) {
    videometa = {
      ...(workflowImageUrl
        ? { image_input: 'public_url' }
        : {
            extraction: 'middle_frame_jpeg',
            duration_seconds: frame!.durationSeconds,
          }),
      submissionId: opts.ctx.submissionId,
      declaredTreesPlanted: opts.ctx.declaredTreesPlanted,
      latitude: opts.ctx.latitude,
      longitude: opts.ctx.longitude,
      ...(overlay || {}),
    }
  } else if (overlay && Object.keys(overlay).length > 0) {
    videometa = { ...overlay }
  }

  try {
    const imagePayload =
      workflowImageUrl !== undefined && workflowImageUrl !== ''
        ? { imageUrl: workflowImageUrl }
        : { imageBase64: frame!.jpeg.toString('base64') }

    const { status, data: raw } = await postRoboflowWorkflowWithImage({
      ...imagePayload,
      ...(videometa ? { videometa } : {}),
    })

    if (status < 200 || status >= 300) {
      const msg =
        (raw &&
          typeof raw === 'object' &&
          (raw as { message?: string; error?: string }).message) ||
        (raw && typeof raw === 'object' && (raw as { error?: string }).error) ||
        `Roboflow workflow HTTP ${status}`
      return {
        ok: false,
        skipped: false,
        error:
          typeof msg === 'string' ? msg : `Roboflow workflow HTTP ${status}`,
        raw,
      }
    }

    const count = extractCountFromAiResponse(raw)
    if (count === undefined) {
      return {
        ok: false,
        skipped: false,
        error: 'Roboflow response missing parsable mangrove count',
        raw,
      }
    }

    const confidenceRaw = extractConfidenceFromAiResponse(raw)

    return {
      ok: true,
      skipped: false,
      countedMangroves: count,
      ...(confidenceRaw !== undefined ? { confidence: confidenceRaw } : {}),
      raw,
    }
  } catch (e: unknown) {
    return {
      ok: false,
      skipped: false,
      error: resolveAxiosCatchMessage(e),
      raw:
        e && typeof e === 'object'
          ? (e as { response?: { data?: unknown } }).response?.data
          : undefined,
    }
  }
}

/**
 * Sends plant video bytes to the external mangrove-counting API.
 * If token/path are unset, returns `skipped` (upload should still succeed).
 */
export async function verifyMangrovePlantVideo(opts: {
  videoBuffer: Buffer
  filename: string
  contentType: string
  ctx: AiMangroveVerifyContext
  workflowImageUrl?: string
}): Promise<AiMangroveVerifyResult> {
  if (env.AI_PROVIDER === 'roboflow_workflow') {
    return verifyMangrovePlantVideoRoboflow(opts)
  }
  return verifyMangrovePlantVideoUltralytics(opts)
}

/** Serialize raw result for Mongoose Mixed / string audit field */
export function stringifyAiRawForStorage(raw: unknown): string | undefined {
  return capRawPayload(raw)
}
