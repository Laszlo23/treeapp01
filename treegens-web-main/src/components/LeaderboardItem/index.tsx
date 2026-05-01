'use client'

import type { FC } from 'react'
import { Address } from '@/components/Address'
import { buildPublicProfilePath } from '@/config/appConfig'
import { ILeaderboardItem } from '@/types'
import cn from 'classnames'
import Image from 'next/image'
import Link from 'next/link'
import { formatWeiToMgro } from '@/utils/formatWeiToMgro'

function initials(name: string | undefined, wallet: string) {
  const n = name?.trim()
  if (n) return n.slice(0, 2).toUpperCase()
  if (wallet.length >= 6) return `${wallet.slice(2, 4)}`.toUpperCase()
  return 'TG'
}

type TreesProps = {
  variant?: 'trees'
  item: ILeaderboardItem
  className?: string
}

type FundedProps = {
  variant: 'funded'
  rank: number
  walletAddress: string
  totalBurnedMgroWei: string
  className?: string
}

type LeaderboardItemProps = TreesProps | FundedProps

export const LeaderboardItem: FC<LeaderboardItemProps> = props => {
  if (props.variant === 'funded') {
    const { rank, walletAddress, totalBurnedMgroWei, className } = props
    const burned = formatWeiToMgro(totalBurnedMgroWei)
    const href = buildPublicProfilePath(walletAddress)
    return (
      <Link
        href={href}
        className={cn(
          'tg-pill-card mb-3 flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-transform last:mb-0 active:scale-[0.99]',
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Address
            address={walletAddress}
            blobbieSize={44}
            className="truncate text-sm font-semibold text-[#1a2610]"
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-base font-black tabular-nums text-[#4d341e]">
            {burned.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            <span className="text-xs font-bold text-[#6b6560]">MGRO</span>
          </span>
          <span className="text-xs font-bold text-lime-green-3">#{rank}</span>
        </div>
      </Link>
    )
  }

  const { item, className } = props
  const href = buildPublicProfilePath(item.address)

  return (
    <Link
      href={href}
      className={cn(
        'tg-pill-card mb-3 flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-transform last:mb-0 active:scale-[0.99]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-gradient-to-br from-[#dfea8a]/95 to-[#6B8C3B]/90 text-xs font-black text-[#1a2610] shadow-md ring-2 ring-white/40">
          {initials(item.name, item.address)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#1a2610]">{item.name}</p>
          <p className="truncate text-xs font-medium text-[#6b6560]">
            {item.address.slice(0, 6)}…{item.address.slice(-4)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1">
          <Image
            src="/img/tree-outline.svg"
            alt=""
            width={22}
            height={22}
            className="opacity-90"
          />
          <span className="text-lg font-black tabular-nums text-brown-1">
            {item.treesMounted}
          </span>
        </div>
        <span className="text-sm font-black text-lime-green-3">#{item.id}</span>
      </div>
    </Link>
  )
}
