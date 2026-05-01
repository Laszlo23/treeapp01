'use client'

import { appConfig, shouldShowBottomNav } from '@/config/appConfig'
import { useIsDynamicRoute } from '@/hooks/useIsDynamicRoute'
import cn from 'classnames'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { HiClipboardDocumentCheck, HiUser } from 'react-icons/hi2'
import { Rectangle } from './_components/Rectangle'
import { TreeButton } from './_components/TreeButton'
import { hasSkippedPlantingTutorial } from '@/utils/plantingTutorialPreference'

export const AppBottomNav = () => {
  const router = useRouter()
  const pathname = usePathname()
  const { isLeaderboardRoute } = useIsDynamicRoute()
  const { routes } = appConfig

  if (!shouldShowBottomNav(pathname)) return null

  const isEarnActive = pathname === routes.Earn
  const isHomeActive = pathname === routes.Home && !isLeaderboardRoute
  const isProfileActive = pathname === routes.Profile

  const handleTreeButtonClick = () => {
    if (pathname === routes.Tutorial) {
      router.push(routes.TutorialVerify)
    } else if (pathname === routes.TutorialVerify) {
      router.push(routes.NewPlant)
    } else if (hasSkippedPlantingTutorial()) {
      router.push(routes.NewPlant)
    } else {
      router.push(routes.Tutorial)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-36 items-end justify-center pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="relative">
        <Rectangle />
        <div className="absolute inset-x-0 top-0 flex items-end justify-between px-5">
          <div className="flex shrink-0 flex-row gap-1">
            <div
              onClick={() => router.push(routes.Home)}
              role="button"
              className="flex w-14 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'h-1.5 w-full rounded-b-full bg-lime-gradient opacity-0 transition-opacity',
                  { 'opacity-100': isHomeActive },
                )}
              />
              <div className="flex flex-col items-center">
                <Image
                  src={
                    isLeaderboardRoute || !isHomeActive
                      ? '/img/home-icon.svg'
                      : '/img/home-icon-active.svg'
                  }
                  alt="Home"
                  width={0}
                  height={0}
                  style={{ width: '24px', height: 'auto' }}
                />
                <span
                  className={cn(
                    'text-[10px] text-lime-green-1 transition-opacity',
                    {
                      'opacity-40': isLeaderboardRoute || !isHomeActive,
                    },
                  )}
                >
                  Home
                </span>
              </div>
            </div>
            <div
              onClick={() => router.push(routes.Profile)}
              role="button"
              className="flex w-14 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'h-1.5 w-full rounded-b-full bg-lime-gradient opacity-0 transition-opacity',
                  { 'opacity-100': isProfileActive },
                )}
              />
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 items-center justify-center">
                  <HiUser
                    className={cn('h-6 w-6 text-lime-green-1', {
                      'opacity-40': !isProfileActive,
                    })}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    'text-[10px] text-lime-green-1 transition-opacity',
                    {
                      'opacity-40': !isProfileActive,
                    },
                  )}
                >
                  Profile
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-row gap-1">
            <div
              onClick={() => router.push(routes.Earn)}
              role="button"
              className="flex w-14 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'h-1.5 w-full rounded-b-full bg-lime-gradient opacity-0 transition-opacity',
                  { 'opacity-100': isEarnActive },
                )}
              />
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 items-center justify-center">
                  <HiClipboardDocumentCheck
                    className={cn('h-6 w-6 text-lime-green-1', {
                      'opacity-40':
                        !isEarnActive || isLeaderboardRoute,
                    })}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    'text-[10px] text-lime-green-1 transition-opacity',
                    {
                      'opacity-40':
                        !isEarnActive || isLeaderboardRoute,
                    },
                  )}
                >
                  Task
                </span>
              </div>
            </div>
            <div
              onClick={() => router.push(routes.Leaderboard)}
              role="button"
              className="flex w-14 shrink-0 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'h-1.5 w-full rounded-b-full bg-lime-gradient opacity-0 transition-opacity',
                  { 'opacity-100': isLeaderboardRoute },
                )}
              />
              <div className="flex flex-col items-center">
                <Image
                  src={
                    isLeaderboardRoute
                      ? '/img/leaderboard-icon-active.svg'
                      : '/img/leaderboard-icon.svg'
                  }
                  alt="Leaderboard"
                  width={24}
                  height={24}
                />
                <span
                  className={cn(
                    'mt-0.5 text-[10px] text-lime-green-1 transition-opacity',
                    {
                      'opacity-40':
                        !isLeaderboardRoute || isEarnActive,
                    },
                  )}
                >
                  Leaderboard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        onClick={handleTreeButtonClick}
        className="absolute bottom-14 -mb-1 left-1/2 -translate-x-1/2"
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleTreeButtonClick()
          }
        }}
        aria-label={
          pathname === routes.Tutorial
            ? 'Next: how to verify'
            : pathname === routes.TutorialVerify
              ? 'Get started: create submission'
              : hasSkippedPlantingTutorial()
                ? 'Create new plant submission'
                : 'Open planting tutorial'
        }
      >
        <TreeButton />
      </div>
    </div>
  )
}
