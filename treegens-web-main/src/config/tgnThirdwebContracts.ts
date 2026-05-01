/**
 * TreeGens TGN + vault contracts via `getContract` (thirdweb v5).
 *
 * @see https://portal.thirdweb.com/typescript/v5/getContract
 * @see https://portal.thirdweb.com/typescript/v5/prepareContractCall
 */
import { getContract } from 'thirdweb'
import type { Abi } from 'viem'
import { defaultChain } from '@/config/thirdwebChain'
import {
  TGN_TOKEN_ADDRESS,
  TGN_VAULT_ADDRESS,
} from '@/config/tgnContracts'
import { client } from '@/config/thirdwebConfig'

/** Minimal ERC20 ABI for stake / allowance flows */
export const TGN_ERC20_MINIMAL_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const satisfies Abi

/** TGNVault: stake / unstake / staked balance */
export const TGN_VAULT_MINIMAL_ABI = [
  {
    name: 'stake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'unstake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getStakedBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'staker', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi

export function getTgnTokenContract() {
  return getContract({
    client,
    chain: defaultChain,
    address: TGN_TOKEN_ADDRESS,
    abi: TGN_ERC20_MINIMAL_ABI,
  })
}

export function getTgnVaultContract() {
  return getContract({
    client,
    chain: defaultChain,
    address: TGN_VAULT_ADDRESS,
    abi: TGN_VAULT_MINIMAL_ABI,
  })
}
