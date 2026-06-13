'use client'

import Link from 'next/link'
import { VIDEO_CONFIG } from '@/utils/constants'

type Props = {
  /** Which step to emphasize: 1 = before, 2 = plant in field, 3 = after */
  activeStep?: 1 | 2 | 3
  className?: string
}

const MAX_SECONDS = VIDEO_CONFIG.MAX_DURATION_SECONDS

export function TwoVideoProofSteps({ activeStep, className = '' }: Props) {
  const steps = [
    {
      n: 1,
      title: 'Before',
      body: `Film the empty land before you plant (up to ${MAX_SECONDS} seconds).`,
    },
    {
      n: 2,
      title: 'Plant',
      body: 'Plant your trees in the field — this step happens offline, not in the app.',
    },
    {
      n: 3,
      title: 'After',
      body: `Film the same area with trees planted (up to ${MAX_SECONDS} seconds).`,
    },
  ] as const

  return (
    <section
      className={`rounded-xl border border-emerald-200/80 bg-gradient-to-b from-[#f7fbf3] to-white px-4 py-3.5 ${className}`}
      aria-label="Two-video proof steps"
    >
      <p className="text-sm font-semibold text-gray-900">
        Two videos required: before and after planting
      </p>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map(step => {
          const isActive = activeStep === step.n
          return (
            <li key={step.n} className="flex flex-row gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-tree-green-2 text-white'
                    : 'bg-[#E8F7ED] text-tree-green-2'
                }`}
              >
                {step.n}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isActive ? 'text-tree-green-2' : 'text-gray-800'
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-gray-600">
                  {step.body}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      <Link
        href="/tutorial/verify"
        className="mt-3 inline-block text-sm font-semibold text-tree-green-2 underline underline-offset-2"
      >
        Watch how to film →
      </Link>
    </section>
  )
}
