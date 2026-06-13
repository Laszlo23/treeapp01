'use client'

import Link from 'next/link'
import { HiOutlineVideoCamera } from 'react-icons/hi'
import type { ISubmissionAiVerification, IVideo } from '@/types'
import { AiVerdictCard } from '@/components/submission-detail/AiVerdictCard'
import { PlantingCountCard } from '@/components/submission-detail/PlantingCountCard'

type Props = {
  submissionId: string
  plantVideo?: IVideo
  plantVideoUrl: string | null
  locationText: string
  timeAgo: string
  aiVerification?: ISubmissionAiVerification
  /** Submission document fallbacks (`treesPlanted` / species on Mongo submission). */
  submissionTreesPlanted?: number
  submissionTreeSpecies?: string
}

export function PlantVideoSection({
  submissionId,
  plantVideo,
  plantVideoUrl,
  locationText,
  timeAgo,
  aiVerification,
  submissionTreesPlanted,
  submissionTreeSpecies,
}: Props) {
  const completeHref = `/submissions/create/${encodeURIComponent(submissionId)}`

  const declared =
    typeof plantVideo?.treesPlanted === 'number'
      ? plantVideo.treesPlanted
      : submissionTreesPlanted

  const species =
    plantVideo?.treetype?.trim() || submissionTreeSpecies?.trim() || null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between gap-1">
        <h2 className="text-lg font-bold text-gray-900">After planting</h2>
      </div>
      {!plantVideo ? (
        <div className="flex flex-col items-center">
          <p className="text-center text-lg text-gray-600">
            No after video uploaded yet. Film the planted area and upload it here.
          </p>
          <Link
            href={completeHref}
            className="mt-2 rounded-full bg-lime-green-2 px-3 py-2 text-base font-semibold text-brown-3"
          >
            Upload after video
          </Link>
        </div>
      ) : (
        <>
          <PlantingCountCard
            declaredTrees={declared ?? null}
            species={species}
            aiVerification={aiVerification}
          />
          <div className="overflow-hidden rounded-2xl bg-[#f3f4f6] ring-2 ring-black/[0.04]">
            {plantVideoUrl ? (
              <video
                className="aspect-video w-full object-cover"
                controls
                preload="metadata"
                muted
                playsInline
              >
                <source src={plantVideoUrl} type="video/mp4" />
              </video>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center">
                <HiOutlineVideoCamera className="h-7 w-7 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex flex-row items-start justify-between gap-2">
            <p className="max-w-[70%] text-sm text-[#5c534a]">{locationText}</p>
            <p className="shrink-0 text-sm text-[#8a8278]">{timeAgo}</p>
          </div>
          {species?.toLowerCase() === 'mangrove' && aiVerification ? (
            <AiVerdictCard
              aiVerification={aiVerification}
              declaredTrees={
                typeof declared === 'number' ? declared : plantVideo?.treesPlanted
              }
            />
          ) : null}
        </>
      )}
    </div>
  )
}
