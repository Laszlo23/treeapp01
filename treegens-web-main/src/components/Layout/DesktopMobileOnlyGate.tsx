'use client'

import { isDesktopVisiblePath } from '@/utils/desktopVisiblePaths'
import { usePathname } from 'next/navigation'

/** Shown on md+ viewports when the main shell is mobile-only. */
export function DesktopMobileOnlyGate() {
  const pathname = usePathname()
  if (isDesktopVisiblePath(pathname)) return null

  return (
    <div className="fixed inset-0 z-[5] hidden items-center justify-center bg-[#faf9f6] md:flex">
      <p className="max-w-sm px-6 text-center text-lg font-medium text-[#435F24]">
        TreeGens is optimized for mobile. Open this site on your phone, or use
        a narrow browser window for the full app.
      </p>
    </div>
  )
}
