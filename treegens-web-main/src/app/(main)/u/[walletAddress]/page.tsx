'use client'

import { HubPageHeader } from '@/components/Layout/HubPageHeader'
import { Address } from '@/components/Address'
import { Spinner } from '@/components/ui/Spinner'
import { getPublicUser } from '@/services/app'
import type { IPublicProfilePayload } from '@/types'
import { formatWeiToMgro } from '@/utils/formatWeiToMgro'
import { truncateAddress } from '@/utils/helpers'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { IoCheckmarkCircle } from 'react-icons/io5'

export default function PublicProfilePage() {
  const params = useParams()
  const walletParam = params?.walletAddress
  const wallet =
    typeof walletParam === 'string'
      ? walletParam
      : Array.isArray(walletParam)
        ? walletParam[0]
        : ''

  const [data, setData] = useState<IPublicProfilePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setError('Invalid wallet address')
      setLoading(false)
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await getPublicUser(wallet)
      setData(res.data.data)
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setError('No TreeGens profile for this wallet yet.')
      } else {
        setError('Could not load profile.')
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => {
    void load()
  }, [load])

  const copyAddr = async () => {
    if (!data?.user.walletAddress || typeof navigator === 'undefined') return
    try {
      await navigator.clipboard.writeText(data.user.walletAddress)
      toast.success('Address copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  const title =
    data?.user.name?.trim() ||
    (wallet ? truncateAddress(wallet) : 'Profile')

  const burnedMg =
    data?.burns != null
      ? formatWeiToMgro(data.burns.totalBurnedMgroWei)
      : null

  return (
    <div className="flex min-h-screen flex-col px-4 pb-28 pt-3">
      <HubPageHeader title={title} subtitle="Public profile" />

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="tg-pill-card-muted px-5 py-8 text-center">
          <p className="text-sm font-semibold text-[#374151]">{error}</p>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-4">
          <section className="tg-pill-card px-5 py-5">
            <div className="flex flex-col items-center gap-3">
              <div className="flex w-full justify-center">
                <Address
                  address={data.user.walletAddress}
                  blobbieSize={56}
                  className="text-base font-bold text-[#1a2610]"
                />
              </div>
              <button
                type="button"
                onClick={() => void copyAddr()}
                className="tg-pill-row-btn max-w-xs text-xs font-semibold normal-case tracking-normal"
              >
                Copy full address
              </button>
              {data.user.isVerifier ? (
                <div className="flex items-center gap-1 rounded-full border border-[#86efac] bg-[#dcfce7] px-3 py-1">
                  <IoCheckmarkCircle className="text-[#15803d]" size={18} />
                  <span className="text-xs font-semibold text-[#166534]">
                    Verifier
                  </span>
                </div>
              ) : null}
              <p className="text-center text-xs text-[#6b6560]">
                Joined{' '}
                {new Date(data.user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <div className="tg-impact-card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
                Verified trees
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-[#1a2610]">
                {(data.user.treesPlanted ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="tg-impact-card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
                Approved submissions
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-[#1a2610]">
                {data.approvedSubmissionCount.toLocaleString()}
              </p>
            </div>
          </div>

          {(data.user.socialPointsTotal ?? 0) > 0 ? (
            <div className="tg-impact-card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
                Loyalty points
              </p>
              <p className="mt-1 text-xl font-black tabular-nums text-[#1a2610]">
                {(data.user.socialPointsTotal ?? 0).toLocaleString()}
              </p>
            </div>
          ) : null}

          <section className="tg-impact-card-mgro px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#303E1A]/85">
              MGRO funded (burned)
            </p>
            {data.burns && burnedMg != null ? (
              <>
                <p className="mt-1 text-xl font-black tabular-nums text-[#1a2610]">
                  {burnedMg.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  <span className="text-sm font-semibold text-[#5c534a]">
                    MGRO
                  </span>
                </p>
                <p className="mt-2 text-xs text-[#4d534a]">
                  {data.burns.burnCount.toLocaleString()} burn event
                  {data.burns.burnCount === 1 ? '' : 's'} · updated{' '}
                  {new Date(data.burns.updatedAt).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-medium text-[#5c534a]">
                No funded burns recorded for this wallet yet.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
