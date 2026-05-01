'use client'

import { routes } from '@/config/appConfig'
import { UNISWAP_ADD_LIQUIDITY_URL } from '@/config/socialAndDefi'
import {
  clearVerifierDelegate,
  fetchDelegators,
  setVerifierDelegate,
} from '@/services/delegationService'
import { client } from '@/config/thirdwebConfig'
import { defaultChain } from '@/config/thirdwebChain'
import { apiErrorMessage, notifyError } from '@/utils/apiErrorMessage'
import { useUser } from '@/contexts/UserProvider'
import cn from 'classnames'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  HiArrowTopRightOnSquare,
  HiSparkles,
  HiUsers,
  HiWallet,
} from 'react-icons/hi2'
import { resolveAddress } from 'thirdweb/extensions/ens'
import { useActiveAccount } from 'thirdweb/react'

const ONCHAIN_PLACEHOLDER =
  process.env.NEXT_PUBLIC_ONCHAIN_DELEGATE_ENABLED === 'true'

function shortAddr(a: string) {
  const s = a.trim()
  if (s.length < 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

export function DeFiPanel() {
  const account = useActiveAccount()
  const { user, fetchUser } = useUser()
  const [delegateOpen, setDelegateOpen] = useState(false)
  const [delegateInput, setDelegateInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [delegators, setDelegators] = useState<
    Array<{ walletAddress: string; name?: string }>
  >([])

  const loadDelegators = useCallback(async () => {
    try {
      const res = await fetchDelegators()
      const payload = res.data as {
        data?: {
          delegators?: Array<{ walletAddress: string; name?: string }>
        }
      }
      setDelegators(payload.data?.delegators ?? [])
    } catch {
      setDelegators([])
    }
  }, [])

  useEffect(() => {
    void loadDelegators()
  }, [loadDelegators])

  useEffect(() => {
    if (delegateOpen && user?.verifierDelegate) {
      setDelegateInput(user.verifierDelegate)
    }
    if (!delegateOpen) setDelegateInput('')
  }, [delegateOpen, user?.verifierDelegate])

  const resolveTarget = async (): Promise<string | null> => {
    const raw = delegateInput.trim()
    if (!raw) {
      notifyError('Enter a verifier address')
      return null
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(raw)) return raw.toLowerCase()
    try {
      const addr = await resolveAddress({
        client,
        name: raw,
        resolverChain: defaultChain,
      })
      return typeof addr === 'string' ? addr.toLowerCase() : null
    } catch {
      notifyError('Could not resolve name')
      return null
    }
  }

  const confirmDelegate = async () => {
    if (busy) return
    const target = await resolveTarget()
    if (!target) return
    try {
      setBusy(true)
      await setVerifierDelegate(target)
      toast.success('Delegation saved — your votes route to this verifier.')
      setDelegateOpen(false)
      setDelegateInput('')
      await fetchUser()
      await loadDelegators()
    } catch (e: unknown) {
      console.error(e)
      notifyError(apiErrorMessage(e, 'Delegation failed'))
    } finally {
      setBusy(false)
    }
  }

  const onClearDelegate = async () => {
    if (busy) return
    try {
      setBusy(true)
      await clearVerifierDelegate()
      toast.success('Delegation cleared')
      setDelegateOpen(false)
      setDelegateInput('')
      await fetchUser()
      await loadDelegators()
    } catch (e: unknown) {
      notifyError(apiErrorMessage(e, 'Could not clear delegation'))
    } finally {
      setBusy(false)
    }
  }

  const activeDelegate = user?.verifierDelegate?.trim()

  return (
    <section className="tg-pill-card relative overflow-hidden px-5 py-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-56 w-56 rounded-full bg-[#DFEA8A]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[#435F24]/18 blur-3xl" />

        <div className="relative mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#435F24] to-[#303E1A] text-white shadow-lg ring-2 ring-[#DFEA8A]/40">
              <HiWallet className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#435F24]">
                DeFi hub
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-[#0f160c]">
                TGN · liquidity · stake
              </p>
              <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-[#5c534a]">
                On-chain actions open in secure tabs. Off-chain delegation routes
                verifier vote credit — no tx fee.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6e4]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#435F24] ring-1 ring-[#435F24]/15">
              <HiSparkles className="h-3.5 w-3.5" aria-hidden />
              Base
            </span>
          </div>
        </div>

        <div className="relative mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#DFEA8A]/50 bg-gradient-to-br from-white/90 to-[#f4faf0]/80 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
              Wallet
            </p>
            <p className="mt-1 truncate font-mono text-xs font-semibold text-[#1a2610]">
              {account?.address ? shortAddr(account.address) : 'Connect wallet'}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/90 to-white/80 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b6560]">
              Vote delegate
            </p>
            <p className="mt-1 truncate text-xs font-bold text-[#166534]">
              {activeDelegate ? shortAddr(activeDelegate) : 'Not set'}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col gap-3">
          <button
            type="button"
            className="tg-pill-defi-action"
            onClick={() =>
              window.open(UNISWAP_ADD_LIQUIDITY_URL, '_blank', 'noopener,noreferrer')
            }
          >
            <span>Add liquidity · Uniswap</span>
            <HiArrowTopRightOnSquare className="h-5 w-5 shrink-0 text-[#435F24]" />
          </button>

          <Link href={routes.Stake} className="tg-pill-defi-action-stake">
            <span>Stake / Unstake TGN</span>
            <HiArrowTopRightOnSquare className="h-5 w-5 shrink-0 opacity-90" />
          </Link>

          <button
            type="button"
            className="tg-pill-defi-action"
            onClick={() => setDelegateOpen(true)}
          >
            <span className="flex items-center gap-2 normal-case tracking-normal">
              <HiUsers className="h-5 w-5 text-[#435F24]" aria-hidden />
              <span className="text-[0.8rem] font-bold uppercase tracking-[0.06em]">
                Delegate stake (off-chain)
              </span>
            </span>
            <span className="text-xs font-semibold normal-case tracking-normal text-[#435F24]">
              {activeDelegate ? 'Edit' : 'Set'}
            </span>
          </button>

          <button
            type="button"
            disabled={!ONCHAIN_PLACEHOLDER}
            title="Coming soon — enable NEXT_PUBLIC_ONCHAIN_DELEGATE_ENABLED"
            className={cn(
              'rounded-2xl border border-dashed px-4 py-3.5 text-sm font-semibold transition-opacity',
              ONCHAIN_PLACEHOLDER
                ? 'border-[#435F24]/35 bg-white/90 text-[#1a2610] shadow-sm active:scale-[0.99]'
                : 'cursor-not-allowed border-neutral-200 bg-neutral-50/90 text-neutral-400',
            )}
          >
            On-chain delegate {ONCHAIN_PLACEHOLDER ? '' : '(coming soon)'}
          </button>
        </div>

        {delegators.length > 0 ? (
          <div className="relative mt-5 rounded-2xl border border-[#DFEA8A]/40 bg-white/55 px-4 py-3 shadow-inner backdrop-blur-sm">
            <p className="text-xs font-bold text-[#111827]">
              Planters delegating to you ({delegators.length})
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-[#374151]">
              {delegators.slice(0, 8).map(d => (
                <li key={d.walletAddress}>
                  {d.name ? `${d.name} · ` : ''}
                  {shortAddr(d.walletAddress)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

      {delegateOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 px-3 pb-8 pt-16 backdrop-blur-md md:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delegate-title"
            className="tg-modal-sheet relative max-h-[88vh] w-full max-w-md overflow-y-auto px-6 pb-7 pt-8"
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-1 rounded-full bg-gradient-to-r from-[#DFEA8A] via-[#6B8C3B] to-[#DFEA8A]" />
            <h2
              id="delegate-title"
              className="text-xl font-black tracking-tight text-[#0f160c]"
            >
              Delegate stake
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5c534a]">
              Route your off-chain verifier vote credit to a trusted verifier.
              The address must belong to an active TreeGens verifier account.
            </p>

            <label className="mt-5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
              Verifier wallet or ENS
            </label>
            <input
              className="tg-card mt-2 w-full border border-[#435F24]/25 px-4 py-3 font-mono text-sm text-[#111827] outline-none ring-0 focus:border-[#435F24]/45"
              placeholder="0x… or name.eth"
              value={delegateInput}
              onChange={e => setDelegateInput(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="tg-cta py-3.5 text-sm font-black uppercase tracking-wide"
                disabled={busy}
                onClick={() => void confirmDelegate()}
              >
                {busy ? 'Saving…' : 'Confirm'}
              </button>
              <button
                type="button"
                className="tg-card border-[#435F24]/25 py-3.5 text-sm font-bold text-[#374151] active:scale-[0.99]"
                disabled={busy}
                onClick={() => void onClearDelegate()}
              >
                Clear
              </button>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-2xl py-2.5 text-sm font-semibold text-[#6b7280] hover:bg-black/[0.03]"
              onClick={() => setDelegateOpen(false)}
            >
              Cancel
            </button>
            <p className="mt-4 rounded-xl bg-[#f9fafb] px-3 py-2 text-[11px] leading-snug text-[#6b7280]">
              Connected:{' '}
              <span className="font-mono font-semibold text-[#374151]">
                {account?.address ?? '—'}
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
