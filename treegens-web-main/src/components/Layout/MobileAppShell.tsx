'use client'

import { AppFooter } from '@/components/Layout/AppFooter'
import { AppBottomNav } from '@/components/Layout/AppBottomNav'
import { shouldShowBottomNav } from '@/config/appConfig'
import { isDesktopVisiblePath } from '@/utils/desktopVisiblePaths'
import cn from 'classnames'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** Mobile shell: bottom padding matches classic tab bar (`h-36` + safe area). */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const navVisible = shouldShowBottomNav(pathname)
  const showOnDesktop = isDesktopVisiblePath(pathname)

  return (
    <div
      className={cn(
        'fixed inset-0 w-full overflow-y-auto overflow-x-hidden',
        showOnDesktop ? '' : 'md:hidden',
        navVisible
          ? 'pb-[calc(9rem+env(safe-area-inset-bottom,0px))]'
          : 'pb-4',
      )}
    >
      <div className="tg-page-bg min-h-full">{children}</div>
      {navVisible ? <AppFooter /> : null}
      <AppBottomNav />
    </div>
  )
}
