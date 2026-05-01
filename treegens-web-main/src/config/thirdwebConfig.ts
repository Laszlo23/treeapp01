import { createThirdwebClient } from 'thirdweb'
import { publicEnv } from '@/config/publicEnv'

/**
 * thirdweb requires a non-empty clientId or secretKey. Without `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
 * the bundled SDK used to fall back to this placeholder with a console warning; omitting it
 * entirely makes `createThirdwebClient` throw and breaks the whole app on load.
 *
 * For production wallet flows, set `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` from the Thirdweb dashboard
 * and rebuild (`yarn build`) so the real id is inlined.
 *
 * @see https://portal.thirdweb.com/typescript/v5/client
 */
const PLACEHOLDER_CLIENT_ID = '00000000000000000000000000000000'

const clientId = publicEnv.thirdwebClientId || PLACEHOLDER_CLIENT_ID

if (clientId === PLACEHOLDER_CLIENT_ID && typeof console !== 'undefined') {
  console.warn(
    '[thirdweb] NEXT_PUBLIC_THIRDWEB_CLIENT_ID is unset — add a Client ID from https://thirdweb.com/dashboard for reliable wallet/RPC.',
  )
}

if (
  typeof window !== 'undefined' &&
  !publicEnv.walletConnectProjectId &&
  typeof console !== 'undefined'
) {
  console.warn(
    '[thirdweb] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is unset — WalletConnect (QR / mobile wallets) needs a Project ID from https://cloud.walletconnect.com/',
  )
}

export const client = createThirdwebClient({
  clientId,
})

/** Used by Connect modal / WalletConnect so wallets show correct app name + logo. */
export function getTreegensAppMetadata() {
  const origin =
    (typeof window !== 'undefined' && window.location.origin) ||
    publicEnv.appUrl ||
    'https://treegens.app'
  return {
    name: 'TreeGens',
    url: origin,
    description:
      'Verified tree planting — plant trees, grow mangroves, get rewarded.',
    logoUrl: `${origin}/img/treegens-logo.svg`,
  }
}
