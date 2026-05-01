/**
 * TGN staking contract config on **Base mainnet** (chain id 8453).
 *
 * Override with `NEXT_PUBLIC_*` for other deployments.
 *
 * **Backend parity:** same logical addresses without `NEXT_PUBLIC_`
 * (`TGN_VAULT_ADDRESS`, `TGN_TOKEN_ADDRESS`, …).
 */

export const VALIDATORS_MINIMUM_TGN_TOKENS =
  process.env.NEXT_PUBLIC_VALIDATORS_MINIMUM_TGN_TOKENS || '2000'

export const TGN_VAULT_ADDRESS =
  process.env.NEXT_PUBLIC_TGN_VAULT_ADDRESS ||
  '0x64b05503c6F2233d279E6B8B8f2Da6936dEd584C'

export const TGN_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TGN_TOKEN_ADDRESS ||
  '0xD75dfa972C6136f1c594Fec1945302f885E1ab29'

export const TGN_TOKEN_DECIMALS = Number(
  process.env.NEXT_PUBLIC_TGN_TOKEN_DECIMALS || 18,
)
