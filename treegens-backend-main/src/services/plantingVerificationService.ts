import axios from 'axios'
import FormData from 'form-data'
import env from '../config/environment'
import type {
  AiMangroveVerifyContext,
  AiMangroveVerifyResult,
} from './aiMangroveVerificationService'
import { coerceConfidence } from './aiMangroveVerificationService'

type TreeDetection = {
  confidence?: number
}

type PlantingVerifyVideoResponse = {
  unique_tree_estimate?: number
  total_tree_detections?: number
  images_evaluated?: number
  count_claim_match?: boolean | null
  count_delta?: number | null
  model_version?: string
  verification?: {
    aggregate_pass?: boolean
    model?: {
      tree_detections?: TreeDetection[]
      confidence_summary?: Record<string, unknown>
    }
  }
}

function plantingVerifyUrl(): string | null {
  const base = env.PLANTING_VERIFICATION_API_URL?.trim()
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/internal/verify-video`
}

function detectionConfidence(raw: PlantingVerifyVideoResponse): number | undefined {
  const dets = raw.verification?.model?.tree_detections
  if (!Array.isArray(dets) || dets.length === 0) return undefined
  const confs = dets
    .map(d => d.confidence)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c))
  if (confs.length === 0) return undefined
  // Raw list includes every frame’s boxes before dedupe; use strong detections only.
  const strong = confs.filter(c => c >= 0.5)
  const pool = strong.length > 0 ? strong : confs
  return pool.reduce((a, b) => a + b, 0) / pool.length
}

function resolvePlantingErrorMessage(raw: unknown, status: number): string {
  if (raw && typeof raw === 'object') {
    const rec = raw as { detail?: unknown; message?: string; error?: string }
    if (typeof rec.detail === 'string') return rec.detail
    if (Array.isArray(rec.detail) && rec.detail[0]) {
      const first = rec.detail[0] as { msg?: string }
      if (typeof first.msg === 'string') return first.msg
    }
    if (typeof rec.message === 'string') return rec.message
    if (typeof rec.error === 'string') return rec.error
  }
  return `Planting verification API HTTP ${status}`
}

/**
 * Self-hosted mangrove counter (FastAPI + YOLO OBB on `treegens-app`, port 8000).
 * Samples multiple video frames and dedupes detections — no Roboflow credits required.
 */
export async function verifyMangrovePlantVideoPlantingApi(opts: {
  videoBuffer: Buffer
  filename: string
  contentType: string
  ctx: AiMangroveVerifyContext
  /** ISO 8601; defaults to now (upload time). */
  capturedAt?: string
}): Promise<AiMangroveVerifyResult> {
  const url = plantingVerifyUrl()
  const internalKey = env.PLANTING_VERIFICATION_INTERNAL_KEY?.trim()

  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_path' }
  }
  if (!internalKey) {
    return { ok: false, skipped: true, reason: 'not_configured' }
  }

  const form = new FormData()
  form.append('video', opts.videoBuffer, {
    filename: opts.filename || 'plant.mp4',
    contentType: opts.contentType || 'video/mp4',
  })
  form.append('captured_at', opts.capturedAt ?? new Date().toISOString())
  form.append('latitude', String(opts.ctx.latitude))
  form.append('longitude', String(opts.ctx.longitude))
  form.append('claimed_tree_count', String(opts.ctx.declaredTreesPlanted))

  try {
    const response = await axios.post<PlantingVerifyVideoResponse>(url, form, {
      headers: {
        'X-Internal-Key': internalKey,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: env.AI_REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    })

    const raw = response.data
    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        skipped: false,
        error: resolvePlantingErrorMessage(raw, response.status),
        raw,
      }
    }

    const count =
      typeof raw.unique_tree_estimate === 'number' &&
      Number.isFinite(raw.unique_tree_estimate)
        ? Math.max(0, Math.floor(raw.unique_tree_estimate))
        : undefined

    if (count === undefined) {
      return {
        ok: false,
        skipped: false,
        error: 'Planting API response missing unique_tree_estimate',
        raw,
      }
    }

    const confidenceRaw =
      detectionConfidence(raw) ??
      coerceConfidence(
        raw.verification?.model?.confidence_summary?.mean_confidence,
      )

    return {
      ok: true,
      skipped: false,
      countedMangroves: count,
      ...(confidenceRaw !== undefined ? { confidence: confidenceRaw } : {}),
      raw,
    }
  } catch (e: unknown) {
    const errMsg =
      e && typeof e === 'object'
        ? String(
            (e as { response?: { data?: { detail?: string } }; message?: string })
              .response?.data?.detail ||
              (e as { message?: string }).message ||
              'Planting verification request failed',
          )
        : String(e)
    return {
      ok: false,
      skipped: false,
      error: errMsg,
      raw:
        e && typeof e === 'object'
          ? (e as { response?: { data?: unknown } }).response?.data
          : undefined,
    }
  }
}
