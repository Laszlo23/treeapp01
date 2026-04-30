'use client'

import Image from 'next/image'
import Link from 'next/link'
import { HiOutlineVideoCamera } from 'react-icons/hi'
import type { ISubmissionAiVerification, IVideo } from '@/types'

type Props = {
  submissionId: string
  plantVideo?: IVideo
  plantVideoUrl: string | null
  locationText: string
  timeAgo: string
  aiVerification?: ISubmissionAiVerification
}

export function PlantVideoSection({
  submissionId,
  plantVideo,
  plantVideoUrl,
  locationText,
  timeAgo,
  aiVerification,
}: Props) {
  const completeHref = `/submissions/create/${encodeURIComponent(submissionId)}`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center justify-between gap-1">
        <h2 className="text-lg font-bold text-gray-900">Plant</h2>
        {plantVideo ? (
          <div className="flex flex-row items-center gap-1">
            <Image src="/img/tree.svg" alt="" width={14} height={14} />
            <span className="text-sm font-semibold capitalize text-gray-800">
              {plantVideo.treesPlanted}
              {plantVideo.treetype?.trim()
                ? ` ${plantVideo.treetype.trim()}`
                : ''}
            </span>
          </div>
        ) : null}
      </div>
      {!plantVideo ? (
        <div className="flex flex-col items-center">
          <p className="text-center text-lg text-gray-600">
            No plant video uploaded yet for this submission.
          </p>
          <Link
            href={completeHref}
            className="mt-2 rounded-full bg-lime-green-2 px-3 py-2 text-base font-semibold text-brown-3"
          >
            Complete submission
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl bg-[#f3f4f6]">
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
          {plantVideo?.treetype?.toLowerCase() === 'mangrove' &&
          aiVerification ? (
            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              <p className="font-semibold text-gray-900">AI verification</p>
              <dl className="mt-1 space-y-0.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#8a8278]">Decision</dt>
                  <dd className="font-medium capitalize">
                    {aiVerification.decision?.replace(/_/g, ' ') ?? '—'}
                  </dd>
                </div>
                {typeof aiVerification.countedMangroves === 'number' ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#8a8278]">AI count</dt>
                    <dd className="font-medium">
                      {aiVerification.countedMangroves}
                    </dd>
                  </div>
                ) : null}
                {typeof aiVerification.confidence === 'number' ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#8a8278]">Confidence</dt>
                    <dd className="font-medium">
                      {(aiVerification.confidence * 100).toFixed(0)}%
                    </dd>
                  </div>
                ) : null}
                {typeof aiVerification.declaredTreesPlanted === 'number' ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#8a8278]">Declared trees</dt>
                    <dd className="font-medium">
                      {aiVerification.declaredTreesPlanted}
                    </dd>
                  </div>
                ) : null}
                {aiVerification.verifiedAt ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#8a8278]">Verified at</dt>
                    <dd className="font-medium tabular-nums">
                      {new Date(aiVerification.verifiedAt).toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                {aiVerification.status === 'failed' &&
                aiVerification.error ? (
                  <div className="mt-2 text-xs text-red-700">
                    {aiVerification.error}
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
