'use client'

import { appConfig } from '@/config/appConfig'
import cn from 'classnames'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function LeaderboardTopTabs() {
  const pathname = usePathname()
  const { routes } = appConfig

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        'flex-1 rounded-full px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] transition-all',
        active
          ? 'tg-cta text-[#16210c] shadow-[0_8px_24px_rgba(67,95,36,0.28)]'
          : 'border border-[rgba(45,36,25,0.08)] bg-white/90 text-[#5c534a] shadow-sm hover:bg-white',
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="tg-pill-card-muted flex gap-2 p-1.5">
      {tab(
        routes.Leaderboard,
        'Trees planted',
        pathname === routes.Leaderboard,
      )}
      {tab(
        routes.LeaderboardFunded,
        'Trees funded',
        pathname === routes.LeaderboardFunded,
      )}
    </div>
  )
}
