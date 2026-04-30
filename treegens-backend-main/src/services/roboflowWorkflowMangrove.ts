import * as fs from 'node:fs'
import * as path from 'node:path'
import axios from 'axios'
import env from '../config/environment'

/** Matches Roboflow `inference_sdk` InferenceHTTPClient workflow POST shape. */
function loadSpecificationFromDisk(): Record<string, unknown> | undefined {
  const rel = env.ROBOFLOW_WORKFLOW_SPEC_PATH
  if (!rel) return undefined
  const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel)
  const raw = fs.readFileSync(abs, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ROBOFLOW_WORKFLOW_SPEC_PATH must contain a JSON object')
  }
  return parsed as Record<string, unknown>
}

/**
 * Resolves the workflow POST URL and optional inline `specification` payload.
 * @see https://inference.roboflow.com/inference_helpers/inference_sdk/workflows/
 */
export function resolveRoboflowPostUrl(): {
  url: string
  specification?: Record<string, unknown>
} | null {
  const base = env.ROBOFLOW_API_URL
  const custom = env.ROBOFLOW_WORKFLOW_URL
  if (custom) {
    return { url: custom.replace(/\/+$/, '') }
  }

  const specPath = env.ROBOFLOW_WORKFLOW_SPEC_PATH
  if (specPath) {
    const specification = loadSpecificationFromDisk()
    return { url: `${base}/workflows/run`, specification }
  }

  const workspace = env.ROBOFLOW_WORKSPACE_NAME
  const workflowId = env.ROBOFLOW_WORKFLOW_ID
  if (workspace && workflowId) {
    const url = `${base}/${encodeURIComponent(workspace)}/workflows/${encodeURIComponent(workflowId)}`
    return { url }
  }

  return null
}

export type RoboflowWorkflowImageRequest = {
  /** Raw JPEG as base64 (no data-URL prefix). Use with server-side frame extraction. */
  imageBase64?: string
  /** Public image URL (same shape as browser `type: "url"`). Mutually exclusive with base64. */
  imageUrl?: string
  /** Merged into workflow `inputs.videometa` when non-empty. */
  videometa?: Record<string, unknown>
}

export async function postRoboflowWorkflowWithImage(
  opts: RoboflowWorkflowImageRequest,
): Promise<{ status: number; data: unknown }> {
  const resolved = resolveRoboflowPostUrl()
  if (!resolved) {
    throw new Error('Roboflow workflow URL is not configured')
  }

  const imageField = env.AI_ROBOFLOW_IMAGE_FIELD
  const hasUrl =
    typeof opts.imageUrl === 'string' && opts.imageUrl.trim() !== ''
  const hasB64 =
    typeof opts.imageBase64 === 'string' && opts.imageBase64.trim() !== ''

  if (hasUrl === hasB64) {
    throw new Error(
      'Roboflow workflow requires exactly one of imageUrl or imageBase64',
    )
  }

  const inputs: Record<string, unknown> = {
    [imageField]: hasUrl
      ? { type: 'url', value: opts.imageUrl!.trim() }
      : { type: 'base64', value: opts.imageBase64! },
  }

  if (env.AI_ROBOFLOW_SEND_CONFIDENCE) {
    inputs.confidence = env.AI_ROBOFLOW_CONFIDENCE
  }

  if (
    opts.videometa &&
    typeof opts.videometa === 'object' &&
    Object.keys(opts.videometa).length > 0
  ) {
    inputs.videometa = opts.videometa
  }

  const payload: Record<string, unknown> = {
    api_key: env.ROBOFLOW_API_KEY,
    inputs,
  }

  if (!env.AI_ROBOFLOW_MINIMAL_REQUEST) {
    payload.use_cache = true
    payload.enable_profiling = false
  }

  if (resolved.specification) {
    payload.specification = resolved.specification
  }

  const response = await axios.post(resolved.url, payload, {
    timeout: env.AI_REQUEST_TIMEOUT_MS,
    validateStatus: () => true,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })

  return { status: response.status, data: response.data }
}
