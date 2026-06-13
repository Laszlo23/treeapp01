'use client'

import type { ISubmissionAiVerification } from '@/types'

type Props = {
  ai?: ISubmissionAiVerification | null
  /** User’s plant clip is queued; AI runs only after upload */
  queuedOffline?: boolean
  variant: 'hero' | 'compact'
  className?: string
}

function formatConfidence(c: number | undefined): string | null {
  if (typeof c !== 'number' || !Number.isFinite(c)) return null
  return `${Math.round(c * 100)}% confidence`
}

export function PlantAiResultSummary({
  ai,
  queuedOffline,
  variant,
  className = '',
}: Props) {
  if (queuedOffline) {
    return (
      <div
        className={`rounded-xl border border-emerald-200/80 bg-gradient-to-b from-[#f0faf3] to-[#e8f7ed] px-4 py-3 text-center ${className}`}
      >
        <p className="text-sm font-semibold text-gray-900">
          Mangrove AI count
        </p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          Your clip is saved offline. After it uploads, we will count seedlings
          with AI and show the result on your submission.
        </p>
      </div>
    )
  }

  if (!ai) return null

  if (ai.status === 'skipped') {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-left ${className}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
          AI verification skipped
        </p>
        {ai.skipReason ? (
          <p className="mt-1 text-sm text-amber-950/90">{ai.skipReason}</p>
        ) : null}
      </div>
    )
  }

  if (ai.status === 'failed') {
    return (
      <div
        className={`rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-left ${className}`}
      >
        <p className="text-sm font-semibold text-red-900">
          Could not finish automatic count
        </p>
        <p className="mt-1 text-sm text-red-800/95">
          A reviewer will check your video.{' '}
          {ai.error ? `(${ai.error})` : null}
        </p>
      </div>
    )
  }

  const n = ai.countedMangroves
  const confLabel = formatConfidence(ai.confidence)

  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) {
    if (variant === 'hero') {
      return (
        <div
          className={`rounded-2xl border-2 border-emerald-300/90 bg-gradient-to-b from-white to-[#eaf7ef] px-5 py-5 text-center shadow-sm ${className}`}
          role="status"
          aria-live="polite"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800/90">
            AI count (this video)
          </p>
          <p
            className="mt-1 text-[3.25rem] font-extrabold leading-none tabular-nums text-[#1b5e2a]"
            aria-label={`${n} mangrove seedlings counted`}
          >
            {n}
          </p>
          <p className="mt-2 text-base font-medium text-gray-800">
            mangrove seedlings detected
          </p>
          {confLabel ? (
            <p className="mt-1 text-sm text-gray-600">{confLabel}</p>
          ) : null}
        </div>
      )
    }

    return (
      <div
        className={`rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 ${className}`}
      >
        <p className="text-sm font-semibold text-emerald-950">
          AI counted <span className="tabular-nums">{n}</span> mangrove seedling
          {n === 1 ? '' : 's'}
          {confLabel ? (
            <span className="font-normal text-emerald-900/80">
              {' '}
              · {confLabel}
            </span>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 ${className}`}
    >
      AI analysis finished; detailed count is available on your submission.
    </div>
  )
}
