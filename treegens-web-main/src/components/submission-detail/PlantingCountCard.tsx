'use client'

import type { ISubmissionAiVerification } from '@/types'
import Image from 'next/image'
import cn from 'classnames'

type Props = {
  /** Stored on Submission + plant clip (canonical DB fields). */
  declaredTrees?: number | null
  species?: string | null
  aiVerification?: ISubmissionAiVerification
  className?: string
}

export function PlantingCountCard({
  declaredTrees,
  species,
  aiVerification,
  className,
}: Props) {
  const sp = species?.trim() ?? ''
  const lower = sp.toLowerCase()
  const isMangrove = lower === 'mangrove'
  const labelUnit = isMangrove ? 'Mangroves' : 'Trees'
  const hasNumber = declaredTrees != null && !Number.isNaN(declaredTrees)
  const counted = aiVerification?.countedMangroves
  const aiStatus = aiVerification?.status
  const aiDone = aiStatus === 'completed'
  const showAiNumber =
    isMangrove && aiDone && typeof counted === 'number' && Number.isFinite(counted)

  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br from-[#435F24]/35 via-[#DFEA8A]/28 to-emerald-400/28 p-[1.5px] shadow-lg',
        className,
      )}
    >
      <div className="rounded-[14px] bg-gradient-to-b from-white/92 via-white/72 to-emerald-50/40 px-4 py-3.5 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6B8C3B] to-[#435F24] shadow-md ring-2 ring-white/60">
            <Image src="/img/tree.svg" alt="" width={20} height={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#435F24]">
              From your submission (database)
            </p>
            <p className="truncate text-xs font-semibold text-[#5c534a]">
              {sp ? `${sp} · planter declared` : 'Planting record'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200/60 bg-white/70 px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
              Declared {labelUnit}
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums leading-none text-[#0f160c]">
              {hasNumber ? Number(declaredTrees).toLocaleString() : '—'}
            </p>
          </div>
          <div
            className={cn(
              'rounded-xl border px-3 py-2.5 shadow-sm',
              showAiNumber
                ? 'border-sky-200/70 bg-sky-50/80'
                : 'border-neutral-200/70 bg-neutral-50/80',
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
              {isMangrove ? 'AI count' : 'AI verify'}
            </p>
            {isMangrove ? (
              <>
                <p className="mt-1 text-2xl font-black tabular-nums leading-none text-[#0f160c]">
                  {showAiNumber
                    ? counted.toLocaleString()
                    : aiStatus === 'processing'
                      ? '…'
                      : '—'}
                </p>
                {aiStatus === 'failed' ? (
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-red-600">
                    AI run failed — verifier review
                  </p>
                ) : null}
                {aiStatus === 'processing' ? (
                  <p className="mt-1 text-[10px] font-semibold text-sky-700">
                    Counting…
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-xs font-semibold leading-snug text-[#4d534a]">
                {aiStatus === 'skipped'
                  ? 'Not run for non-mangrove'
                  : aiStatus === 'completed'
                    ? 'See signals below'
                    : aiStatus === 'processing'
                      ? 'Running…'
                      : 'Species-based'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
