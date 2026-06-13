import axios from 'axios'
import FormData from 'form-data'
import env from '../config/environment'
import {
  postRoboflowWorkflowWithImage,
  resolveRoboflowPostUrl,
} from './roboflowWorkflowMangrove'
import { verifyMangrovePlantVideoPlantingApi } from './plantingVerificationService'
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

function extractCountFromSingleBlobWithPaths(
  blob: unknown,
  paths: string[],
): number | undefined {
  for (const root of collectAiResponseRoots(blob)) {
    const c = extractFromPaths(root, paths, coerceCount)
    if (c !== undefined) return c
  }
  return undefined
}

/** Collect per-frame / per-chunk counts when the model returns an array (common for video). */
export function extractPerFrameCountsFromAiResponse(raw: unknown): number[] {
  const frames = getPerFrameResultArray(raw)
  if (!frames) return []
  const out: number[] = []
  // Per-row chunks sometimes repeat cumulative video totals (e.g. `totalDetections`) which inflate counts.
  // When extracting per-frame counts, prefer non-cumulative keys only.
  const nonCumulativePaths = env.AI_RESPONSE_COUNT_PATHS.filter(
    p => !isCumulativeCountPath(p),
  )
  for (const chunk of frames) {
    const c = extractCountFromSingleBlobWithPaths(chunk, nonCumulativePaths)
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

type Box = { x1: number; y1: number; x2: number; y2: number }

function isFiniteBox(b: Box): boolean {
  return (
    Number.isFinite(b.x1) &&
    Number.isFinite(b.y1) &&
    Number.isFinite(b.x2) &&
    Number.isFinite(b.y2) &&
    b.x2 > b.x1 &&
    b.y2 > b.y1
  )
}

function iou(a: Box, b: Box): number {
  const xA = Math.max(a.x1, b.x1)
  const yA = Math.max(a.y1, b.y1)
  const xB = Math.min(a.x2, b.x2)
  const yB = Math.min(a.y2, b.y2)
  const interW = Math.max(0, xB - xA)
  const interH = Math.max(0, yB - yA)
  const inter = interW * interH
  if (inter <= 0) return 0
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1)
  const denom = areaA + areaB - inter
  return denom > 0 ? inter / denom : 0
}

type Detection = {
  box: Box
  klass?: string
  id?: string
  /** Detection score when provider supplies it (e.g. Roboflow). */
  confidence?: number
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()))
    return Number(v.trim())
  return undefined
}

function readBoxFromDetection(raw: unknown): Box | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const rec = raw as Record<string, unknown>

  // Common (center x/y + width/height)
  const x = toNumber(rec.x ?? rec.cx ?? rec.center_x)
  const y = toNumber(rec.y ?? rec.cy ?? rec.center_y)
  const w = toNumber(rec.width ?? rec.w)
  const h = toNumber(rec.height ?? rec.h)
  if (
    x !== undefined &&
    y !== undefined &&
    w !== undefined &&
    h !== undefined
  ) {
    const box = {
      x1: x - w / 2,
      y1: y - h / 2,
      x2: x + w / 2,
      y2: y + h / 2,
    }
    return isFiniteBox(box) ? box : undefined
  }

  // Common (x1/y1/x2/y2)
  const x1 = toNumber(rec.x1 ?? rec.left ?? rec.xmin ?? rec.x_min)
  const y1 = toNumber(rec.y1 ?? rec.top ?? rec.ymin ?? rec.y_min)
  const x2 = toNumber(rec.x2 ?? rec.right ?? rec.xmax ?? rec.x_max)
  const y2 = toNumber(rec.y2 ?? rec.bottom ?? rec.ymax ?? rec.y_max)
  if (
    x1 !== undefined &&
    y1 !== undefined &&
    x2 !== undefined &&
    y2 !== undefined
  ) {
    const box = { x1, y1, x2, y2 }
    return isFiniteBox(box) ? box : undefined
  }

  // Roboflow / OpenAPI style: bbox: [x1, y1, x2, y2]
  const bboxRaw = rec.bbox
  if (Array.isArray(bboxRaw) && bboxRaw.length >= 4) {
    const bx1 = toNumber(bboxRaw[0])
    const by1 = toNumber(bboxRaw[1])
    const bx2 = toNumber(bboxRaw[2])
    const by2 = toNumber(bboxRaw[3])
    if (
      bx1 !== undefined &&
      by1 !== undefined &&
      bx2 !== undefined &&
      by2 !== undefined
    ) {
      const box = { x1: bx1, y1: by1, x2: bx2, y2: by2 }
      return isFiniteBox(box) ? box : undefined
    }
  }

  // Nested bbox object
  if (bboxRaw && typeof bboxRaw === 'object' && !Array.isArray(bboxRaw)) {
    return readBoxFromDetection(bboxRaw)
  }

  return undefined
}

function readDetectionMeta(raw: unknown): Omit<Detection, 'box'> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const rec = raw as Record<string, unknown>
  const idRaw =
    rec.id ??
    rec.track_id ??
    rec.trackId ??
    rec.tracking_id ??
    rec.trackingId
  const klassRaw = rec.class ?? rec.label ?? rec.class_name ?? rec.className
  const id =
    typeof idRaw === 'string' || typeof idRaw === 'number'
      ? String(idRaw)
      : undefined
  const klass = typeof klassRaw === 'string' ? klassRaw : undefined
  const confRaw = rec.confidence ?? rec.score
  let confidence: number | undefined
  if (typeof confRaw === 'number' && Number.isFinite(confRaw))
    confidence = confRaw

  return { id, klass, confidence }
}

function collectDetectionsFromRoot(root: unknown): Detection[] {
  if (!root || typeof root !== 'object' || Array.isArray(root)) return []
  const rec = root as Record<string, unknown>

  const candidates: unknown[] = []
  for (const key of ['predictions', 'detections', 'objects']) {
    const v = rec[key]
    if (Array.isArray(v)) candidates.push(...v)
  }

  const out: Detection[] = []
  for (const item of candidates) {
    const box = readBoxFromDetection(item)
    if (!box) continue
    const meta = readDetectionMeta(item)
    out.push({ box, ...meta })
  }
  return out
}

function inferFrameExtents(dets: Detection[]): { fw: number; fh: number } {
  let maxX = 0
  let maxY = 0
  for (const det of dets) {
    if (!isFiniteBox(det.box)) continue
    maxX = Math.max(maxX, det.box.x2)
    maxY = Math.max(maxY, det.box.y2)
  }
  return { fw: Math.max(maxX, 1), fh: Math.max(maxY, 1) }
}

function filterMegaBoxes(dets: Detection[], ratio: number): Detection[] {
  if (dets.length === 0) return []
  const { fw, fh } = inferFrameExtents(dets)
  const frameArea = fw * fh
  return dets.filter(d => {
    if (!isFiniteBox(d.box)) return false
    const a = (d.box.x2 - d.box.x1) * (d.box.y2 - d.box.y1)
    return a / frameArea <= ratio
  })
}

/** Standard greedy NMS, highest confidence retained first. */
function nonMaxSuppressionDetections(dets: Detection[], iouThresh: number): Detection[] {
  const finite = dets.filter(d => isFiniteBox(d.box))
  finite.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
  const keep: Detection[] = []
  for (const cand of finite) {
    if (keep.some(k => iou(k.box, cand.box) >= iouThresh)) continue
    keep.push(cand)
  }
  return keep
}

function collectAllDetectionsFromAiResponse(raw: unknown): Detection[] {
  const out: Detection[] = []
  for (const root of collectAiResponseRoots(raw)) {
    out.push(...collectDetectionsFromRoot(root))
  }
  return out
}

/** Prefer deduped box count when the provider attaches a `detections` list with parseable geometry. */
function extractCountFromNmsDedup(raw: unknown): number | undefined {
  const minConf = env.AI_DETECTION_MIN_CONFIDENCE
  const merged = collectAllDetectionsFromAiResponse(raw).filter(d => {
    if (!isFiniteBox(d.box)) return false
    if (minConf <= 0) return true
    const c = d.confidence
    if (typeof c !== 'number' || !Number.isFinite(c)) return true
    return c >= minConf
  })
  const filtered = filterMegaBoxes(merged, env.AI_DETECTION_MAX_BOX_AREA_FRACTION)
  if (filtered.length === 0 && merged.length > 0) {
    /** All boxes mega-sized vs inferred frame → fall through to scalar fields rather than trusting NMS-only. */
    return undefined
  }
  const base = filtered.length > 0 ? filtered : merged
  if (base.length === 0) return undefined
  const kept = nonMaxSuppressionDetections(base, env.AI_DETECTION_NMS_IOU)
  return kept.length
}

function extractUniqueCountFromAiResponse(raw: unknown): number | undefined {
  const frames = getPerFrameResultArray(raw)
  if (!frames || frames.length === 0) return undefined

  // If provider gives stable track IDs, count distinct.
  const ids = new Set<string>()
  let sawAnyId = false
  for (const chunk of frames) {
    for (const root of collectAiResponseRoots(chunk)) {
      for (const det of collectDetectionsFromRoot(root)) {
        if (det.id) {
          sawAnyId = true
          ids.add(det.id)
        }
      }
    }
  }
  if (sawAnyId) return ids.size

  // Otherwise do lightweight IoU tracking across frames.
  const tracks: Array<{ box: Box; klass?: string; lastSeen: number }> = []
  const IOU_THRESH = 0.5
  const MAX_MISSED = 2

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const chunk = frames[frameIdx]
    const frameDets: Detection[] = []
    for (const root of collectAiResponseRoots(chunk)) {
      frameDets.push(...collectDetectionsFromRoot(root))
    }

    for (const det of frameDets) {
      if (!isFiniteBox(det.box)) continue
      let bestIdx = -1
      let best = 0
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i]
        if (t.klass && det.klass && t.klass !== det.klass) continue
        if (frameIdx - t.lastSeen > MAX_MISSED) continue
        const score = iou(t.box, det.box)
        if (score > best) {
          best = score
          bestIdx = i
        }
      }
      if (bestIdx >= 0 && best >= IOU_THRESH) {
        tracks[bestIdx] = {
          box: det.box,
          klass: det.klass ?? tracks[bestIdx].klass,
          lastSeen: frameIdx,
        }
      } else {
        tracks.push({ box: det.box, klass: det.klass, lastSeen: frameIdx })
      }
    }
  }

  return tracks.length > 0 ? tracks.length : undefined
}

export function extractCountFromAiResponse(raw: unknown): number | undefined {
  const fromNms = extractCountFromNmsDedup(raw)
  if (fromNms !== undefined) return fromNms

  const unique = extractUniqueCountFromAiResponse(raw)
  if (unique !== undefined) return unique

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
function plantingFailoverEligible(result: AiMangroveVerifyResult): boolean {
  if (result.ok || result.skipped) return false
  const err = 'error' in result ? String(result.error) : ''
  if (/timeout|ECONNREFUSED|ENOTFOUND|5\d{2}|Planting verification API HTTP 5/i.test(err)) {
    return true
  }
  const raw = 'raw' in result ? result.raw : undefined
  if (raw && typeof raw === 'object') {
    const status = (raw as { status?: number }).status
    if (typeof status === 'number' && status >= 500) return true
  }
  return false
}

export async function verifyMangrovePlantVideo(opts: {
  videoBuffer: Buffer
  filename: string
  contentType: string
  ctx: AiMangroveVerifyContext
  workflowImageUrl?: string
}): Promise<AiMangroveVerifyResult> {
  if (env.AI_PROVIDER === 'treegens_ml') {
    const primary = await verifyMangrovePlantVideoPlantingApi(opts)
    if (primary.ok || primary.skipped || !env.AI_FAILOVER_TO_ULTRALYTICS) {
      return primary
    }
    if (!plantingFailoverEligible(primary)) {
      return primary
    }
    const fallback = await verifyMangrovePlantVideoUltralytics(opts)
    if (fallback.ok && !fallback.skipped) {
      return {
        ...fallback,
        raw: {
          failover_from: 'treegens_ml',
          primary_error: 'error' in primary ? primary.error : undefined,
          primary_raw: 'raw' in primary ? primary.raw : undefined,
          ...(typeof fallback.raw === 'object' && fallback.raw !== null
            ? (fallback.raw as Record<string, unknown>)
            : { response: fallback.raw }),
        },
      }
    }
    return primary
  }
  if (env.AI_PROVIDER === 'roboflow_workflow') {
    return verifyMangrovePlantVideoRoboflow(opts)
  }
  return verifyMangrovePlantVideoUltralytics(opts)
}

/** Serialize raw result for Mongoose Mixed / string audit field */
export function stringifyAiRawForStorage(raw: unknown): string | undefined {
  return capRawPayload(raw)
}
