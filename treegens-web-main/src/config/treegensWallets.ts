import type { Wallet } from 'thirdweb/wallets'
import { createWallet, inAppWallet } from 'thirdweb/wallets'
import { getTreegensAppMetadata } from '@/config/thirdwebConfig'

/**
 * Wallets used across connect flows — must match `AutoConnect` and connect modals
 * so the last wallet can restore on refresh (same idea as `mobile/constants/treegensWallets.ts`).
 *
 * Coinbase passes `appMetadata` per Thirdweb wallet creation options.
 *
 * @see https://portal.thirdweb.com/typescript/v5/createWallet
 */
export const treegensWallets: Wallet[] = [
  inAppWallet(),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet', {
    appMetadata: getTreegensAppMetadata(),
  }),
  createWallet('me.rainbow'),
]
