import type { Chain } from 'thirdweb/chains'
import type { Wallet } from 'thirdweb/wallets'
import { defaultChain } from '@/config/thirdwebChain'
import { client, getTreegensAppMetadata } from '@/config/thirdwebConfig'
import { publicEnv } from '@/config/publicEnv'
import { treegensWallets } from '@/config/treegensWallets'

export type TreegensConnectModalOverrides = {
  wallets?: Wallet[]
  /** When false, only listed wallets appear (e.g. profile reconnect). */
  showAllWallets?: boolean
  chains?: readonly Chain[]
  theme?: 'dark' | 'light'
}

/**
 * Default props for `useConnectModal().connect(...)` — matches Thirdweb’s recommended
 * `client` + `chain` + `wallets` + `appMetadata` + WalletConnect `projectId`.
 *
 * @see https://portal.thirdweb.com/references/typescript/v5/useConnectModal
 */
export function getTreegensConnectModalProps(
  overrides: TreegensConnectModalOverrides = {},
) {
  const {
    wallets = treegensWallets,
    showAllWallets = true,
    chains = [defaultChain],
    theme = 'dark',
  } = overrides

  return {
    client,
    chain: defaultChain,
    chains: [...chains],
    wallets,
    appMetadata: getTreegensAppMetadata(),
    theme,
    walletConnect: {
      projectId: publicEnv.walletConnectProjectId,
    },
    showAllWallets,
  }
}
