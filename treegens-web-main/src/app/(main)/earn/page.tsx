'use client'

import { DeFiPanel } from '@/components/earn/DeFiPanel'
import { SocialQuestList } from '@/components/earn/SocialQuestList'
import { HubPageHeader } from '@/components/Layout/HubPageHeader'
import { routes } from '@/config/appConfig'
import { useUser } from '@/contexts/UserProvider'
import { getLeaderboard } from '@/services/app'
import type { ILeaderboardUser } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { clearPlantingTutorialSkip } from '@/utils/plantingTutorialPreference'
import { HiChevronRight, HiTrophy } from 'react-icons/hi2'

export default function EarnPage() {
  const { fetchUser } = useUser()
  const [top, setTop] = useState<ILeaderboardUser[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await getLeaderboard(1, 3)
        const users = res.data.data.users || []
        if (!cancelled) setTop(users)
      } catch {
        if (!cancelled) setTop([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col px-4 pb-28 pt-3">
      <HubPageHeader title="Earn" subtitle="Tasks · DeFi · Leaderboard" />

      <SocialQuestList onUpdated={() => void fetchUser()} />

      <div className="mt-6">
        <DeFiPanel />
      </div>

      <section className="tg-pill-card-muted mt-6 p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#435F24]">
            <HiTrophy className="h-6 w-6" />
            <h2 className="text-sm font-black uppercase tracking-[0.18em]">
              Leaderboard
            </h2>
          </div>
          <Link
            href={routes.Leaderboard}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#435F24]"
          >
            Full board
            <HiChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mb-4 text-xs text-[#6b6560]">
          Top planters by verified trees — climb the ranks.
        </p>
        <ul className="space-y-3">
          {top.length === 0 ? (
            <li className="text-sm text-[#6b6560]">Loading preview…</li>
          ) : (
            top.map(u => (
              <li
                key={u.walletAddress}
                className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/40 px-3 py-2 text-sm backdrop-blur-sm"
              >
                <span className="font-bold text-[#111827]">#{u.rank}</span>
                <span className="flex-1 truncate px-2 font-medium text-[#374151]">
                  {u.name?.trim() || `${u.walletAddress.slice(0, 6)}…`}
                </span>
                <span className="tabular-nums font-semibold text-[#435F24]">
                  {u.treesPlanted} trees
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="mt-5 text-center">
        <Link
          href={routes.Tutorial}
          onClick={() => clearPlantingTutorialSkip()}
          className="text-[11px] font-semibold text-[#6b6560] underline decoration-[#6b6560]/40 underline-offset-2 hover:text-[#435F24]"
        >
          Watch the planting tutorial
        </Link>
      </p>
    </div>
  )
}
