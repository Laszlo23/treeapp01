/**
 * Central place for `NEXT_PUBLIC_*` reads (inlined at build time).
 *
 * Thirdweb (see https://portal.thirdweb.com/typescript/v5/client):
 * - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` — dashboard Client ID for RPC + bundled services.
 * WalletConnect v2 (see https://docs.walletconnect.com/):
 * - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — required for WalletConnect QR / mobile pairing
 *   when using `useConnectModal` with `walletConnect: { projectId }`.
 */

function trimOrEmpty(value: string | undefined): string {
  return value?.trim() ?? ''
}

export const publicEnv = {
  /** Thirdweb dashboard Client ID (`createThirdwebClient`). */
  thirdwebClientId: trimOrEmpty(process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID),

  /**
   * WalletConnect Cloud project id — same value mobile may call `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`.
   * Pair with Thirdweb connect modal: https://portal.thirdweb.com/references/typescript/v5/useConnectModal
   */
  walletConnectProjectId: trimOrEmpty(
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  ),

  /** Browser API origin fallback for metadata / WalletConnect (see `getTreegensAppMetadata`). */
  appUrl: trimOrEmpty(process.env.NEXT_PUBLIC_APP_URL),

  /** REST API base for the TreeGens backend (`axiosInstance`). */
  apiUrl: trimOrEmpty(process.env.NEXT_PUBLIC_API_URL),

  /** Optional IPFS gateway prefix for content hashes (`ipfsGatewayUrl`). */
  ipfsGateway: trimOrEmpty(process.env.NEXT_PUBLIC_IPFS_GATEWAY),

  /** Push notifications — public VAPID key for subscription (`pushClient`). */
  vapidPublicKey: trimOrEmpty(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),

  /** SSE URL for inbox (`NotificationProvider`). */
  notifStreamUrl: trimOrEmpty(process.env.NEXT_PUBLIC_NOTIF_STREAM_URL),

  /** When `"true"`, DeFi panel shows on-chain delegation UX (`DeFiPanel`). */
  onchainDelegateEnabled:
    process.env.NEXT_PUBLIC_ONCHAIN_DELEGATE_ENABLED === 'true',
} as const
