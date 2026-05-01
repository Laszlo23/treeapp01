'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { HiArrowLeft, HiArrowPath, HiLockClosed, HiUsers, HiWallet } from 'react-icons/hi2'
import cn from 'classnames'
import {
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { defaultChain } from '@/config/thirdwebChain'
import {
  TGN_TOKEN_ADDRESS as TOKEN_ADDRESS,
  TGN_TOKEN_DECIMALS as TOKEN_DECIMALS,
  TGN_VAULT_ADDRESS as VAULT_ADDRESS,
  VALIDATORS_MINIMUM_TGN_TOKENS,
} from '@/config/tgnContracts'
import {
  getTgnTokenContract,
  getTgnVaultContract,
} from '@/config/tgnThirdwebContracts'
import { useActiveAccount, useSwitchActiveWalletChain } from 'thirdweb/react'
import {
  checkVerifierStatus,
  getCurrentUser,
  requestVerifierStatus,
} from '@/services/app'
import { notifyError } from '@/utils/apiErrorMessage'

function formatAmount(amount: bigint, decimals = TOKEN_DECIMALS): string {
  const negative = amount < 0n
  const value = negative ? -amount : amount
  const base = 10n ** BigInt(decimals)
  const integer = value / base
  const fraction = (value % base)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  return `${negative ? '-' : ''}${integer.toString()}${fraction ? '.' + fraction : ''}`
}

function parseAmount(input: string, decimals = TOKEN_DECIMALS): bigint | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (!/^\d*(?:\.\d*)?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) return null
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals)
  try {
    return (
      BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded || '0')
    )
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export default function StakePage() {
  const router = useRouter()
  const account = useActiveAccount()
  const switchChain = useSwitchActiveWalletChain()
  const [isVerifier, setIsVerifier] = useState<boolean>(false)
  const tokenContract = useMemo(
    () => getTgnTokenContract(),
    [TOKEN_ADDRESS],
  )
  const vaultContract = useMemo(
    () => getTgnVaultContract(),
    [VAULT_ADDRESS],
  )

  const [symbol, setSymbol] = useState<string>('TGN')
  const [tokenBalance, setTokenBalance] = useState<string>('0')
  const [stakedBalance, setStakedBalance] = useState<string>('0')
  const [stakedBalanceWei, setStakedBalanceWei] = useState<bigint>(0n)
  const [inputAmount, setInputAmount] = useState<string>('')
  const [unstakeAmount, setUnstakeAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [isUnstaking, setIsUnstaking] = useState<boolean>(false)
  const [isRequestingVerifier, setIsRequestingVerifier] =
    useState<boolean>(false)
  const [isSyncingBalances, setIsSyncingBalances] = useState<boolean>(false)
  const [allowanceWei, setAllowanceWei] = useState<bigint>(0n)
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'delegate'>(
    'stake',
  )

  const MIN_VERIFIER_TOKENS = BigInt(Number(VALIDATORS_MINIMUM_TGN_TOKENS))
  const MIN_VERIFIER_WEI = MIN_VERIFIER_TOKENS * 10n ** BigInt(TOKEN_DECIMALS)

  const meetsVerifierStakeThreshold = useMemo(
    () => stakedBalanceWei >= MIN_VERIFIER_WEI,
    [stakedBalanceWei, MIN_VERIFIER_WEI],
  )

  const refreshAllowance = useCallback(async (): Promise<bigint> => {
    if (!account?.address) {
      setAllowanceWei(0n)
      return 0n
    }
    const allowance = (await readContract({
      contract: tokenContract,
      method: 'allowance',
      params: [account.address, VAULT_ADDRESS],
    })) as bigint
    setAllowanceWei(allowance)
    return allowance
  }, [account?.address, tokenContract])

  const loadBalances = useCallback(async () => {
    if (!account?.address) return
    try {
      const [bal, staked, sym] = await Promise.all([
        readContract({
          contract: tokenContract,
          method: 'balanceOf',
          params: [account.address],
        }) as Promise<bigint>,
        readContract({
          contract: vaultContract,
          method: 'getStakedBalance',
          params: [account.address],
        }) as Promise<bigint>,
        readContract({
          contract: tokenContract,
          method: 'symbol',
          params: [],
        }).catch(() => 'TGN') as Promise<string>,
      ])
      setTokenBalance(formatAmount(bal))
      setStakedBalance(formatAmount(staked))
      setStakedBalanceWei(staked)
      if (sym) setSymbol(sym)
      await refreshAllowance()
    } catch (err) {
      console.error('Failed to load balances:', err)
      notifyError('Failed to load balances')
    }
  }, [account?.address, tokenContract, vaultContract, refreshAllowance])

  const syncVerifierFromApi = useCallback(async () => {
    if (!account?.address) return
    try {
      const { data } = await checkVerifierStatus(account.address)
      setIsVerifier(Boolean(data?.data?.isVerifier))
    } catch {
      setIsVerifier(false)
    }
  }, [account?.address])

  const refreshScreen = useCallback(async () => {
    await loadBalances()
    await syncVerifierFromApi()
  }, [loadBalances, syncVerifierFromApi])

  useEffect(() => {
    void loadBalances()
  }, [loadBalances])

  useEffect(() => {
    if (!account?.address) {
      setIsLoading(false)
      setIsApproving(false)
      setIsUnstaking(false)
      setIsRequestingVerifier(false)
      setIsSyncingBalances(false)
      setInputAmount('')
      setUnstakeAmount('')
      setTokenBalance('0')
      setStakedBalance('0')
      setStakedBalanceWei(0n)
      setAllowanceWei(0n)
      setSymbol('TGN')
      setIsVerifier(false)
    } else {
      void syncVerifierFromApi()
    }
  }, [account?.address, syncVerifierFromApi])

  const handleSyncBalances = async () => {
    try {
      setIsSyncingBalances(true)
      await refreshScreen()
    } finally {
      setIsSyncingBalances(false)
    }
  }

  const handleApprove = async () => {
    if (!account?.address) {
      notifyError('Connect your wallet first')
      return
    }

    const amountWei = parseAmount(inputAmount)
    if (amountWei === null || amountWei <= 0n) {
      notifyError('Enter a valid amount')
      return
    }

    try {
      setIsApproving(true)
      await switchChain(defaultChain)

      const currentAllowance = await refreshAllowance()
      if (currentAllowance >= amountWei) {
        toast('Approval already sufficient for this amount.', { icon: 'ℹ️' })
        return
      }

      if (currentAllowance > 0n) {
        const resetTx = prepareContractCall({
          contract: tokenContract,
          method: 'approve',
          params: [VAULT_ADDRESS, 0n],
        })
        const resetRes = await sendTransaction({
          account,
          transaction: resetTx,
        })
        await waitForReceipt(resetRes)
      }

      const approveTx = prepareContractCall({
        contract: tokenContract,
        method: 'approve',
        params: [VAULT_ADDRESS, amountWei],
      })
      const approveRes = await sendTransaction({
        account,
        transaction: approveTx,
      })
      await waitForReceipt(approveRes)

      let updatedAllowance = 0n
      for (let attempt = 0; attempt < 15; attempt++) {
        updatedAllowance = await refreshAllowance()
        if (updatedAllowance >= amountWei) break
        await sleep(400)
      }

      if (updatedAllowance < amountWei) {
        throw new Error('Approval not reflected yet. Please try again.')
      }

      toast.success('Approval successful. You can now stake.')
    } catch (err: unknown) {
      console.error('Approve failed:', err)
      const message =
        typeof err === 'string'
          ? err
          : (err as Error)?.message || 'Approval failed'
      notifyError(message)
    } finally {
      setIsApproving(false)
    }
  }

  const handleStake = async () => {
    if (!account?.address) {
      notifyError('Connect your wallet first')
      return
    }

    const amountWei = parseAmount(inputAmount)
    if (amountWei === null || amountWei <= 0n) {
      notifyError('Enter a valid amount')
      return
    }

    try {
      setIsLoading(true)
      await switchChain(defaultChain)

      const currentAllowance = await refreshAllowance()
      if (currentAllowance < amountWei) {
        notifyError('Approval required before staking. Tap Approve first.')
        return
      }

      const stakeTx = prepareContractCall({
        contract: vaultContract,
        method: 'stake',
        params: [amountWei],
      })
      const stakeRes = await sendTransaction({ account, transaction: stakeTx })
      await waitForReceipt(stakeRes)

      const nextStakedWei = stakedBalanceWei + amountWei
      setStakedBalanceWei(nextStakedWei)
      setStakedBalance(formatAmount(nextStakedWei))

      const prevTokenWei = parseAmount(tokenBalance) ?? 0n
      const nextTokenWei =
        prevTokenWei >= amountWei ? prevTokenWei - amountWei : 0n
      setTokenBalance(formatAmount(nextTokenWei))

      await refreshAllowance()
      await syncVerifierFromApi()

      toast.success('Stake successful')
      setInputAmount('')
    } catch (err: unknown) {
      console.error('Stake failed:', err)
      const message = (err as Error)?.message || 'Transaction failed'
      notifyError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnstake = async () => {
    if (!account?.address) {
      notifyError('Connect your wallet first')
      return
    }

    const amountWei = parseAmount(unstakeAmount)
    if (amountWei === null || amountWei <= 0n) {
      notifyError('Enter a valid amount')
      return
    }

    try {
      setIsUnstaking(true)

      await switchChain(defaultChain)

      const unstakeTx = prepareContractCall({
        contract: vaultContract,
        method: 'unstake',
        params: [amountWei],
      })
      const unstakeRes = await sendTransaction({
        account,
        transaction: unstakeTx,
      })
      await waitForReceipt(unstakeRes)

      const nextStakedWei =
        stakedBalanceWei >= amountWei ? stakedBalanceWei - amountWei : 0n
      setStakedBalanceWei(nextStakedWei)
      setStakedBalance(formatAmount(nextStakedWei))

      const prevTokenWei = parseAmount(tokenBalance) ?? 0n
      const nextTokenWei = prevTokenWei + amountWei
      setTokenBalance(formatAmount(nextTokenWei))

      try {
        await requestVerifierStatus(account.address)
      } catch {
        /* low-key: no toast — backend may re-evaluate / revoke verifier when stake drops */
      }
      await syncVerifierFromApi()

      setUnstakeAmount('')
      toast.success('Unstake successful')
    } catch (err: unknown) {
      console.error('Unstake failed:', err)
      const message = (err as Error)?.message || 'Transaction failed'
      notifyError(message)
    } finally {
      setIsUnstaking(false)
    }
  }

  const handleRequestVerifier = async () => {
    if (!account?.address) {
      notifyError('Connect your wallet first')
      return
    }

    // Check stake requirement on-chain first
    if (stakedBalanceWei < MIN_VERIFIER_WEI) {
      notifyError(
        `You need at least ${VALIDATORS_MINIMUM_TGN_TOKENS} TGN staked to request verifier`,
      )
      return
    }

    try {
      setIsRequestingVerifier(true)
      const { data } = await requestVerifierStatus(account.address)
      const granted = data.data.eligible
      if (granted) {
        toast.success('Congrats! You are now a verifier!')
      } else {
        toast('You are not eligible yet', { icon: 'ℹ️' })
      }
      const userRes = await getCurrentUser()
      setIsVerifier(Boolean(userRes.data.data.isVerifier))
      await loadBalances()
    } catch (err: unknown) {
      console.error('Verifier request failed:', err)
      const message = (err as Error)?.message || 'Request failed'
      notifyError(message)
    } finally {
      setIsRequestingVerifier(false)
    }
  }

  const isStakeTab = activeTab === 'stake'
  const activeAmount = isStakeTab ? inputAmount : unstakeAmount
  const setActiveAmount = isStakeTab ? setInputAmount : setUnstakeAmount
  const stakeAmountWei = parseAmount(inputAmount)
  const hasValidStakeAmount = stakeAmountWei != null && stakeAmountWei > 0n
  const needsApproval =
    isStakeTab && hasValidStakeAmount && allowanceWei < (stakeAmountWei ?? 0n)
  const isActionLoading = isStakeTab ? isLoading || isApproving : isUnstaking
  const canApprove =
    !!account?.address && hasValidStakeAmount && !isActionLoading
  const canStake =
    !!account?.address &&
    hasValidStakeAmount &&
    !needsApproval &&
    !isActionLoading
  const canUnstake = !!account?.address && !isActionLoading

  return (
    <div className="relative min-h-screen flex-1 pb-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-8%,rgba(223,234,138,0.35),transparent_50%),linear-gradient(to_bottom,#faf9f6,#eef6e4_45%,#faf9f6)]"
        aria-hidden
      />

      <header className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-white/50 bg-white/75 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl p-2 text-[#111] transition hover:bg-black/[0.06] active:scale-95"
          aria-label="Back"
        >
          <HiArrowLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h1 className="text-[20px] font-black tracking-tight text-[#142010]">
            Stake
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6b6560]">
            TGN vault
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSyncBalances()}
          disabled={!account?.address || isSyncingBalances}
          className="rounded-xl p-2 text-[#111] transition hover:bg-black/[0.06] disabled:opacity-40 active:scale-95"
          aria-label="Refresh balances"
        >
          <HiArrowPath
            className={`h-6 w-6 ${isSyncingBalances ? 'animate-spin' : ''}`}
          />
        </button>
      </header>

      <div className="relative z-0 px-4 pb-14 pt-5">
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600/35 via-[#6B8C3B]/25 to-lime-400/30 p-[1.5px] shadow-lg">
            <div className="flex h-full flex-col rounded-[14px] bg-gradient-to-br from-white/95 to-emerald-50/50 px-4 py-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2 text-emerald-950/85">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-inner ring-1 ring-emerald-200/60">
                  <HiWallet className="h-5 w-5 text-emerald-900" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                  Wallet
                </span>
              </div>
              <p className="text-xl font-black tabular-nums leading-tight tracking-tight text-[#0f160c]">
                {tokenBalance}
              </p>
              <p className="mt-0.5 text-xs font-bold text-[#435F24]">{symbol}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#435F24]/55 via-[#DFEA8A]/35 to-amber-400/25 p-[1.5px] shadow-lg">
            <div className="flex h-full flex-col rounded-[14px] bg-gradient-to-br from-white/95 to-[#f4f9ec]/70 px-4 py-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2 text-[#2d4318]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#dfea8a] to-[#c5d46a] shadow-inner ring-1 ring-[#b8cf56]/60">
                  <HiLockClosed className="h-5 w-5 text-[#303E1A]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                  Staked
                </span>
              </div>
              <p className="text-xl font-black tabular-nums leading-tight tracking-tight text-[#0f160c]">
                {stakedBalance}
              </p>
              <p className="mt-0.5 text-xs font-bold text-[#435F24]">{symbol}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="flex max-w-full flex-row gap-1 rounded-full border border-white/60 bg-white/50 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('stake')}
              className={cn(
                'rounded-full px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide transition sm:px-5 sm:text-sm',
                activeTab === 'stake'
                  ? 'bg-gradient-to-r from-[#dfea8a] to-[#b8cf56] text-[#1a2610] shadow-md ring-2 ring-white/80'
                  : 'text-[#5c534a] hover:text-[#1a2610]',
              )}
            >
              Stake
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unstake')}
              className={cn(
                'rounded-full px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide transition sm:px-5 sm:text-sm',
                activeTab === 'unstake'
                  ? 'bg-gradient-to-r from-[#dfea8a] to-[#b8cf56] text-[#1a2610] shadow-md ring-2 ring-white/80'
                  : 'text-[#5c534a] hover:text-[#1a2610]',
              )}
            >
              Unstake
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delegate')}
              className={cn(
                'rounded-full px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide transition sm:px-5 sm:text-sm',
                activeTab === 'delegate'
                  ? 'bg-gradient-to-r from-[#dfea8a] to-[#b8cf56] text-[#1a2610] shadow-md ring-2 ring-white/80'
                  : 'text-[#5c534a] hover:text-[#1a2610]',
              )}
            >
              Verifier
            </button>
          </div>
        </div>

        {activeTab !== 'delegate' ? (
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-[#435F24]/30 via-[#DFEA8A]/25 to-emerald-400/25 p-[1.5px] shadow-xl">
            <div className="rounded-[14px] bg-gradient-to-b from-white/92 to-white/70 p-5 backdrop-blur-xl">
              <label
                htmlFor="stake-amount"
                className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#5c534a]"
              >
                Amount
              </label>
              <div className="tg-field flex flex-row items-center overflow-hidden">
                <input
                  id="stake-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={activeAmount}
                  onChange={e => setActiveAmount(e.target.value)}
                  disabled={!account?.address || isActionLoading}
                  className="min-w-0 flex-1 border-0 bg-transparent p-3.5 pr-2 text-lg font-semibold text-[#0f160c] placeholder:text-[#9ca3af] focus:ring-0 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() =>
                    isStakeTab
                      ? setInputAmount(tokenBalance)
                      : setUnstakeAmount(stakedBalance)
                  }
                  disabled={!account?.address || isActionLoading}
                  className="mr-2 rounded-xl bg-gradient-to-r from-[#435F24] to-[#303E1A] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-md disabled:opacity-50"
                >
                  Max
                </button>
              </div>

              {isStakeTab ? (
                <button
                  type="button"
                  onClick={needsApproval ? handleApprove : handleStake}
                  disabled={needsApproval ? !canApprove : !canStake}
                  className="tg-cta mt-6 flex w-full items-center justify-center py-3.5 text-base font-bold disabled:pointer-events-none disabled:opacity-45"
                >
                  {isActionLoading ? (
                    <span
                      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#16210c]/30 border-t-[#16210c]"
                      aria-hidden
                    />
                  ) : (
                    needsApproval ? 'Approve for vault' : 'Stake TGN'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUnstake}
                  disabled={!canUnstake}
                  className="mt-6 flex w-full items-center justify-center rounded-2xl border-2 border-[#f1340e]/35 bg-gradient-to-r from-[#ffebd5] to-[#ffdbd3] py-3.5 text-base font-bold text-[#b91c1c] shadow-lg transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45"
                >
                  {isUnstaking ? (
                    <span
                      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#b91c1c]/30 border-t-[#b91c1c]"
                      aria-hidden
                    />
                  ) : (
                    'Unstake from vault'
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/35 via-[#6B8C3B]/28 to-teal-400/28 p-[1.5px] shadow-xl">
            <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-emerald-50/95 via-white/85 to-white/70 px-5 py-5 backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-emerald-300/25 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#435F24] to-[#6B8C3B] shadow-lg ring-2 ring-white/70">
                  <HiUsers className="h-6 w-6 text-white" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-black text-[#142010]">
                    Verifier registration
                  </h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#435F24]">
                    Stake · delegate · review
                  </p>
                </div>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-[#374151]">
                Staking locks TGN in the vault. <strong>Delegating</strong> here
                registers you as a <strong>verifier</strong> so your stake backs
                submission reviews.
              </p>
              <ol className="relative mt-3 list-decimal space-y-2 pl-5 text-sm text-[#374151]">
                <li>
                  Use <strong>Stake</strong> to deposit (at least{' '}
                  {VALIDATORS_MINIMUM_TGN_TOKENS} {symbol} to request verifier).
                </li>
                <li>
                  Tap <strong>Become a verifier</strong> when your stake
                  qualifies.
                </li>
              </ol>
              {!isVerifier ? (
                meetsVerifierStakeThreshold ? (
                  <div className="relative mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={handleRequestVerifier}
                      disabled={!account?.address || isRequestingVerifier}
                      className="tg-cta inline-flex min-w-[12rem] items-center justify-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      {isRequestingVerifier ? (
                        <>
                          <span
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#16210c]/30 border-t-[#16210c]"
                            aria-hidden
                          />
                          Requesting…
                        </>
                      ) : (
                        'Become a verifier'
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="relative mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-center text-sm font-medium text-amber-950">
                    Stake at least{' '}
                    <span className="font-bold">
                      {VALIDATORS_MINIMUM_TGN_TOKENS} {symbol}
                    </span>{' '}
                    first, then return here.
                  </p>
                )
              ) : (
                <p className="relative mt-5 rounded-2xl border border-emerald-300/60 bg-emerald-100/70 p-4 text-center text-sm font-semibold text-emerald-950">
                  You&apos;re a verifier — thank you for backing fair reviews.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab !== 'delegate' && !isVerifier ? (
          meetsVerifierStakeThreshold ? (
            <p className="mt-4 text-center text-sm text-[#4d534a]">
              Next:{' '}
              <button
                type="button"
                className="font-bold text-[#435F24] underline decoration-[#DFEA8A] underline-offset-2"
                onClick={() => setActiveTab('delegate')}
              >
                Verifier tab
              </button>{' '}
              to register.
            </p>
          ) : (
            <p className="mt-4 text-center text-sm text-[#6b6560]">
              Stake{' '}
              <span className="font-bold text-[#435F24]">
                {VALIDATORS_MINIMUM_TGN_TOKENS}+ {symbol}
              </span>
              , then open{' '}
              <button
                type="button"
                className="font-bold text-[#435F24] underline decoration-[#DFEA8A] underline-offset-2"
                onClick={() => setActiveTab('delegate')}
              >
                Verifier
              </button>
              .
            </p>
          )
        ) : null}
      </div>
    </div>
  )
}
