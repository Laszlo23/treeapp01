'use client'

import { useEffect } from 'react'
import { HiCheck } from 'react-icons/hi2'

type Props = {
  open: boolean
  onFinished: () => void
  /** Queued for upload vs submitted immediately */
  variant?: 'submitted' | 'queued'
}

const DISPLAY_MS = 2800

/**
 * Brief full-screen celebration after the plant clip step finishes (online submit or offline queue).
 */
export function SubmissionCompleteCelebration({
  open,
  onFinished,
  variant = 'submitted',
}: Props) {
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => onFinished(), DISPLAY_MS)
    return () => window.clearTimeout(id)
  }, [open, onFinished])

  if (!open) return null

  const subtitle =
    variant === 'queued'
      ? 'Your videos are queued and will upload when you’re back online.'
      : 'Your proof-of-plant submission was received.'

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-10 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full bg-[#E8F7ED] shadow-inner animate-submission-complete-pop">
            <HiCheck className="h-12 w-12 text-tree-green-2" strokeWidth={2.2} />
          </div>
          <p className="text-xl font-semibold text-gray-900">
            Submission complete!
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
