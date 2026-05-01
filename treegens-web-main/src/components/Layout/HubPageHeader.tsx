'use client'

import { routes } from '@/config/appConfig'
import { useNotifications } from '@/contexts/NotificationProvider'
import cn from 'classnames'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { HiBell } from 'react-icons/hi2'

export function HubPageHeader({
  title,
  subtitle,
  className,
  /** When set, replaces the default inbox bell (e.g. tutorial Skip link). */
  rightSlot,
}: {
  title: string
  subtitle?: string
  className?: string
  rightSlot?: ReactNode
}) {
  const { unreadCount } = useNotifications()

  return (
    <header
      className={cn(
        'mb-4 flex flex-row items-center justify-between gap-3 px-1 pt-1',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={routes.Home}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-md ring-2 ring-white/40 backdrop-blur-md"
          aria-label="TreeGens home"
        >
          <Image
            src="/img/treegens-logo.svg"
            alt=""
            fill
            className="object-contain p-1.5"
            sizes="44px"
            priority
          />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-xl font-black tracking-tight text-[#1a2610]">
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6560]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {rightSlot != null ? (
        <div className="flex shrink-0 items-center justify-end">{rightSlot}</div>
      ) : (
        <Link
          href={routes.Inbox}
          className="relative rounded-full border border-white/45 bg-white/35 p-2 text-[#1a2610] shadow-sm backdrop-blur-md transition-transform active:scale-95"
          aria-label="Inbox"
        >
          <HiBell className="h-6 w-6" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          ) : null}
        </Link>
      )}
    </header>
  )
}
