'use client'

import {
  completeSocialRewardsTask,
  getSocialRewardsSummary,
} from '@/services/app'
import type { ISocialRewardsSummary, ISocialRewardsTask } from '@/types'
import {
  POINTS_PER_TGN_HINT,
  SOCIAL_EXTERNAL_URLS,
  UNISWAP_ADD_LIQUIDITY_URL,
} from '@/config/socialAndDefi'
import cn from 'classnames'
import { useActiveAccount } from 'thirdweb/react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiErrorMessage, notifyError } from '@/utils/apiErrorMessage'
import {
  HiArrowTopRightOnSquare,
  HiBolt,
  HiChatBubbleLeftRight,
  HiCheck,
  HiGift,
  HiSparkles,
} from 'react-icons/hi2'
import { FaTelegramPlane } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

function taskExternalUrl(taskKey: string, referralWallet?: string): string {
  switch (taskKey) {
    case 'follow_treegens_x':
      return SOCIAL_EXTERNAL_URLS.treegensProfile
    case 'follow_jimi_cohen_x':
      return SOCIAL_EXTERNAL_URLS.jimiProfile
    case 'like_retweet_jimi_post':
      return SOCIAL_EXTERNAL_URLS.jimiCampaignPost
    case 'join_telegram_treegenfam':
      return SOCIAL_EXTERNAL_URLS.telegramTreegenFam
    case 'swap_tgn_share_x':
      return UNISWAP_ADD_LIQUIDITY_URL
    case 'daily_checkin':
      return typeof window !== 'undefined'
        ? `${window.location.origin}/earn`
        : '/earn'
    case 'referral_share':
      if (typeof window === 'undefined') return '/'
      {
        const ref = referralWallet?.trim()
        if (!ref) return `${window.location.origin}/`
        return `${window.location.origin}/?ref=${encodeURIComponent(ref)}`
      }
    case 'share_miniapp':
      return SOCIAL_EXTERNAL_URLS.shareMiniapp
    default:
      return SOCIAL_EXTERNAL_URLS.shareMiniapp
  }
}

function questCategoryLabel(taskKey: string, retired?: boolean): string {
  if (retired) return 'Archive'
  switch (taskKey) {
    case 'follow_treegens_x':
    case 'follow_jimi_cohen_x':
    case 'like_retweet_jimi_post':
      return 'X · Social'
    case 'join_telegram_treegenfam':
      return 'Telegram'
    case 'swap_tgn_share_x':
      return 'DeFi'
    case 'daily_checkin':
      return 'Daily'
    case 'referral_share':
      return 'Referral'
    case 'share_miniapp':
      return 'Spread the word'
    default:
      return 'Quest'
  }
}

type QuestTheme = {
  borderGradient: string
  blobA: string
  blobB: string
  iconBg: string
  iconRing: string
  categoryClass: string
}

function getQuestTheme(
  taskKey: string,
  completed: boolean,
  retired?: boolean,
): QuestTheme {
  if (retired) {
    return {
      borderGradient:
        'from-stone-400/50 via-amber-100/40 to-stone-300/45',
      blobA: 'bg-amber-200/25',
      blobB: 'bg-stone-400/15',
      iconBg: 'from-stone-600 to-stone-800',
      iconRing: 'ring-amber-100/40',
      categoryClass:
        'bg-stone-100/95 text-stone-700 ring-1 ring-stone-300/70',
    }
  }
  if (completed) {
    return {
      borderGradient:
        'from-emerald-400/70 via-teal-300/45 to-[#6B8C3B]/55',
      blobA: 'bg-emerald-400/25',
      blobB: 'bg-teal-300/20',
      iconBg: 'from-emerald-600 to-teal-700',
      iconRing: 'ring-emerald-200/50',
      categoryClass:
        'bg-emerald-50/95 text-emerald-900 ring-1 ring-emerald-200/80',
    }
  }
  switch (taskKey) {
    case 'follow_treegens_x':
    case 'follow_jimi_cohen_x':
      return {
        borderGradient:
          'from-slate-800/70 via-sky-500/35 to-indigo-400/40',
        blobA: 'bg-sky-400/22',
        blobB: 'bg-indigo-500/15',
        iconBg: 'from-slate-900 to-slate-800',
        iconRing: 'ring-sky-200/40',
        categoryClass:
          'bg-sky-50/95 text-sky-950 ring-1 ring-sky-200/80',
      }
    case 'like_retweet_jimi_post':
      return {
        borderGradient:
          'from-rose-500/50 via-amber-400/35 to-orange-300/40',
        blobA: 'bg-rose-400/20',
        blobB: 'bg-amber-300/18',
        iconBg: 'from-rose-600 to-orange-600',
        iconRing: 'ring-rose-200/45',
        categoryClass:
          'bg-rose-50/95 text-rose-950 ring-1 ring-rose-200/70',
      }
    case 'join_telegram_treegenfam':
      return {
        borderGradient:
          'from-sky-500/55 via-cyan-400/40 to-blue-500/45',
        blobA: 'bg-cyan-400/25',
        blobB: 'bg-blue-500/18',
        iconBg: 'from-sky-600 to-blue-700',
        iconRing: 'ring-cyan-200/50',
        categoryClass:
          'bg-cyan-50/95 text-cyan-950 ring-1 ring-cyan-200/75',
      }
    case 'swap_tgn_share_x':
      return {
        borderGradient:
          'from-[#435F24]/70 via-[#DFEA8A]/55 to-amber-500/35',
        blobA: 'bg-[#DFEA8A]/30',
        blobB: 'bg-amber-400/22',
        iconBg: 'from-[#303E1A] to-[#435F24]',
        iconRing: 'ring-[#DFEA8A]/55',
        categoryClass:
          'bg-[#f4f9ec]/95 text-[#2d4318] ring-1 ring-[#b8cf56]/60',
      }
    case 'daily_checkin':
      return {
        borderGradient:
          'from-amber-400/60 via-yellow-300/45 to-orange-400/35',
        blobA: 'bg-amber-300/28',
        blobB: 'bg-orange-200/22',
        iconBg: 'from-amber-500 to-orange-600',
        iconRing: 'ring-amber-200/55',
        categoryClass:
          'bg-amber-50/95 text-amber-950 ring-1 ring-amber-200/80',
      }
    case 'referral_share':
      return {
        borderGradient:
          'from-violet-500/50 via-fuchsia-400/38 to-purple-500/42',
        blobA: 'bg-violet-400/22',
        blobB: 'bg-fuchsia-400/18',
        iconBg: 'from-violet-600 to-purple-800',
        iconRing: 'ring-violet-200/45',
        categoryClass:
          'bg-violet-50/95 text-violet-950 ring-1 ring-violet-200/75',
      }
    case 'share_miniapp':
      return {
        borderGradient:
          'from-[#6B8C3B]/60 via-[#DFEA8A]/45 to-lime-300/40',
        blobA: 'bg-lime-300/22',
        blobB: 'bg-[#6B8C3B]/18',
        iconBg: 'from-[#6B8C3B] to-[#435F24]',
        iconRing: 'ring-lime-200/50',
        categoryClass:
          'bg-[#eef6e4]/98 text-[#2d4318] ring-1 ring-[#b8cf56]/55',
      }
    default:
      return {
        borderGradient:
          'from-[#435F24]/55 via-neutral-400/35 to-[#DFEA8A]/40',
        blobA: 'bg-[#DFEA8A]/22',
        blobB: 'bg-neutral-400/14',
        iconBg: 'from-[#435F24] to-[#303E1A]',
        iconRing: 'ring-[#DFEA8A]/40',
        categoryClass:
          'bg-neutral-50/95 text-[#1a2610] ring-1 ring-neutral-200/80',
      }
  }
}

function QuestGlyph({ taskKey }: { taskKey: string }) {
  const icon = 'h-6 w-6 text-white drop-shadow-sm'
  switch (taskKey) {
    case 'follow_treegens_x':
    case 'follow_jimi_cohen_x':
    case 'like_retweet_jimi_post':
      return <FaXTwitter className={icon} aria-hidden />
    case 'join_telegram_treegenfam':
      return <FaTelegramPlane className="h-7 w-7 text-white drop-shadow-sm" aria-hidden />
    case 'swap_tgn_share_x':
      return (
        <span className="text-sm font-black tracking-tight text-white drop-shadow-sm">
          TGN
        </span>
      )
    case 'daily_checkin':
      return <HiSparkles className={icon} aria-hidden />
    case 'referral_share':
      return <HiGift className={icon} aria-hidden />
    case 'share_miniapp':
      return <HiChatBubbleLeftRight className={icon} aria-hidden />
    default:
      return <HiBolt className={icon} aria-hidden />
  }
}

function TaskCard({
  task,
  busy,
  onOpen,
  onComplete,
}: {
  task: ISocialRewardsTask
  busy: boolean
  onOpen: () => void
  onComplete: () => void
}) {
  const theme = getQuestTheme(task.taskKey, task.completed, task.retired)
  const cat = questCategoryLabel(task.taskKey, task.retired)

  return (
    <article className="group tg-pill-card relative overflow-hidden transition duration-300 hover:-translate-y-0.5">
      <div
        className={cn(
          'relative overflow-hidden rounded-[1.15rem] bg-gradient-to-b from-white/97 via-white/92 to-[#f7faf4]/95',
          task.completed && 'from-emerald-50/95 via-white/90 to-teal-50/35',
          task.retired && 'from-stone-50/95 via-white/90 to-amber-50/40',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute bottom-2 left-3 top-10 w-[3px] rounded-full opacity-65',
            task.retired
              ? 'bg-gradient-to-b from-stone-400/70 to-transparent'
              : task.completed
                ? 'bg-gradient-to-b from-emerald-500/75 to-transparent'
                : 'bg-gradient-to-b from-[#6B8C3B]/80 via-[#DFEA8A]/55 to-transparent',
          )}
          aria-hidden
        />

        <div className="relative px-4 pb-4 pt-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={cn(
                'flex h-[3.35rem] w-[3.35rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-2',
                theme.iconBg,
                theme.iconRing,
              )}
            >
              <QuestGlyph taskKey={task.taskKey} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
                    theme.categoryClass,
                  )}
                >
                  {cat}
                </span>
                <div
                  className={cn(
                    'flex min-w-[4.5rem] flex-col items-center justify-center rounded-2xl px-3 py-2 shadow-md ring-1',
                    task.retired
                      ? 'bg-stone-200/80 ring-stone-400/30'
                      : task.completed
                        ? 'bg-gradient-to-br from-emerald-200/95 to-teal-100/90 ring-emerald-400/35'
                        : 'bg-gradient-to-br from-[#f2f7d4] via-[#DFEA8A] to-[#c5d46a] ring-[#435F24]/25',
                  )}
                >
                  {task.retired ? (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-stone-600">
                        Legacy
                      </span>
                      <HiCheck className="mt-0.5 h-5 w-5 text-stone-700" />
                    </>
                  ) : task.completed ? (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-900/80">
                        Done
                      </span>
                      <span className="text-base font-black tabular-nums text-emerald-950">
                        +{task.points}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#3d4f22]/80">
                        Earn
                      </span>
                      <span className="text-lg font-black tabular-nums leading-none text-[#1a2610]">
                        +{task.points}
                      </span>
                      <span className="mt-0.5 text-[9px] font-semibold text-[#435F24]/70">
                        pts
                      </span>
                    </>
                  )}
                </div>
              </div>

              <h3 className="mt-2.5 text-[1.05rem] font-bold leading-snug tracking-tight text-[#131c0f]">
                {task.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#4a5246]">
                {task.description}
              </p>
            </div>
          </div>

          {task.retired ? (
            <div className="relative mt-4 flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-stone-50/80 px-3 py-2.5 text-xs font-medium text-stone-700 backdrop-blur-sm">
              <HiCheck className="h-4 w-4 shrink-0 text-stone-500" />
              Recorded on your profile — points already credited.
            </div>
          ) : (
            <div className="relative mt-5 flex flex-col gap-2.5 border-t border-[#dfe8d4]/80 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={onOpen}
                disabled={busy}
                className="tg-pill-row-btn min-h-[3rem]"
              >
                <HiArrowTopRightOnSquare className="h-4 w-4 opacity-80" />
                Open link
              </button>
              <button
                type="button"
                onClick={onComplete}
                disabled={busy || task.completed}
                className={cn(
                  'tg-cta inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold',
                  'disabled:pointer-events-none disabled:opacity-40',
                )}
              >
                {task.completed ? (
                  <>
                    <HiCheck className="h-5 w-5" />
                    Claimed
                  </>
                ) : busy ? (
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#16210c]/30 border-t-[#16210c]"
                    aria-hidden
                  />
                ) : (
                  <>
                    <HiSparkles className="h-4 w-4 opacity-90" />
                    Mark complete
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function QuestSkeleton() {
  return (
    <div className="tg-pill-card overflow-hidden p-4">
      <div className="flex gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-neutral-200/80" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-24 animate-pulse rounded-full bg-neutral-200/70" />
          <div className="h-4 w-[88%] animate-pulse rounded-md bg-neutral-200/60" />
          <div className="h-3 w-[72%] animate-pulse rounded-md bg-neutral-200/50" />
        </div>
      </div>
    </div>
  )
}

type Props = { onUpdated?: () => void }

export function SocialQuestList({ onUpdated }: Props) {
  const activeAccount = useActiveAccount()
  const referralWallet = activeAccount?.address

  const [data, setData] = useState<ISocialRewardsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyTask, setBusyTask] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await getSocialRewardsSummary()
      const envelope = res.data
      const summary = envelope?.data
      setData(
        summary != null
          ? summary
          : { pointsTotal: 0, tasks: [] },
      )
    } catch (e) {
      console.error(e)
      const msg = apiErrorMessage(e, 'Could not load rewards')
      setLoadError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openTaskLink = async (taskKey: string) => {
    const url = taskExternalUrl(taskKey, referralWallet)
    if (
      taskKey === 'referral_share' &&
      referralWallet &&
      typeof navigator !== 'undefined'
    ) {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Referral link copied')
      } catch {
        notifyError('Could not copy')
      }
      return
    }
    if (taskKey === 'share_miniapp' && typeof navigator !== 'undefined') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'TreeGens',
            text: 'Verify real trees on-chain.',
            url: SOCIAL_EXTERNAL_URLS.shareMiniapp,
          })
          return
        } catch {
          /* fallback */
        }
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const markComplete = async (taskKey: string) => {
    try {
      setBusyTask(taskKey)
      const res = await completeSocialRewardsTask(taskKey)
      const d = res.data.data
      toast.success(
        d.newlyCompleted
          ? `+${d.pointsEarned} points earned`
          : 'Already credited for this one',
      )
      await load()
      onUpdated?.()
    } catch (err: unknown) {
      console.error(err)
        notifyError('Task update failed')
    } finally {
      setBusyTask(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {loadError && !loading ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-950 shadow-sm"
        >
          <p className="font-semibold">Rewards unavailable</p>
          <p className="mt-1 leading-relaxed opacity-95">{loadError}</p>
          <button
            type="button"
            className="tg-cta mt-3 inline-flex rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="tg-pill-card relative overflow-hidden px-5 py-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#DFEA8A]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-[#6B8C3B]/20 blur-3xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#435F24]">
              <span className="tg-social-pill flex h-10 w-10 shrink-0 items-center justify-center !p-0 shadow-md ring-2 ring-[#DFEA8A]/70">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#DFEA8A] to-[#9ea74e]">
                  <HiGift className="h-4 w-4 text-[#1a2610]" aria-hidden />
                </span>
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#435F24]/90">
                  Rewards orbit
                </p>
                <p className="text-xs text-[#5c534a]">Your loyalty balance</p>
              </div>
            </div>
            {loading ? (
              <div className="h-16 w-48 animate-pulse rounded-2xl bg-neutral-200/90" />
            ) : (
              <>
                <p className="text-4xl font-black tabular-nums tracking-tight text-[#0f160c] sm:text-5xl">
                  {data?.pointsTotal ?? 0}
                  <span className="ml-1.5 text-xl font-bold text-[#5c534a] sm:text-2xl">
                    pts
                  </span>
                </p>
                <p className="max-w-md text-sm leading-relaxed text-[#4d534a]">
                  Points accrue in your TreeGens profile; convert toward{' '}
                  <span className="font-semibold text-[#435F24]">TGN</span> at
                  program milestones (~{POINTS_PER_TGN_HINT} pts guide). Use the
                  DeFi panel for on-chain swaps.
                </p>
              </>
            )}
          </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="tg-social-pill flex h-10 w-10 shrink-0 items-center justify-center !p-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#435F24] to-[#303E1A] text-white shadow-md">
              <HiBolt className="h-4 w-4" aria-hidden />
            </span>
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#1a2610]">
              Social quests
            </h2>
            <p className="text-[11px] font-medium text-[#6b6560]">
              Premium tasks · tap a card to start
            </p>
          </div>
        </div>
        <p className="mb-5 mt-2 text-xs leading-relaxed text-[#6b6560]">
          Open the destination, complete the action, then mark complete — we sync
          with your account.
        </p>
        <div className="tg-pill-card-muted relative p-4 sm:p-5">
          <div className="pointer-events-none absolute left-6 top-0 h-px w-16 bg-gradient-to-r from-[#DFEA8A]/0 via-[#DFEA8A] to-[#DFEA8A]/0" />
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#435F24]/85">
            Task deck · each card saves to your profile
          </p>
          <div className="flex flex-col gap-4">
            {loading ? (
              <>
                <QuestSkeleton />
                <QuestSkeleton />
                <QuestSkeleton />
              </>
            ) : loadError ? (
              <p className="py-6 text-center text-sm text-[#6b6560]">
                Use <span className="font-semibold text-[#435F24]">Retry</span>{' '}
                above to reload quests.
              </p>
            ) : (data?.tasks ?? []).length === 0 ? (
              <div className="tg-pill-card rounded-2xl border-dashed border-[#435F24]/28 px-5 py-10 text-center">
                <p className="text-sm font-bold text-[#374151]">
                  No quests loaded yet
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
                  Pull to refresh after signing in, or check your connection —
                  tasks appear here when the rewards API responds.
                </p>
                <button
                  type="button"
                  className="tg-cta mt-5 inline-flex rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-wide"
                  onClick={() => void load()}
                >
                  Retry load
                </button>
              </div>
            ) : (
              (data?.tasks ?? []).map(t => (
                <TaskCard
                  key={t.taskKey}
                  task={t}
                  busy={busyTask !== null}
                  onOpen={() => void openTaskLink(t.taskKey)}
                  onComplete={() => void markComplete(t.taskKey)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
