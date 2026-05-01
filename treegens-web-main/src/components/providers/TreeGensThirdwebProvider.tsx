'use client'

import type { ReactNode } from 'react'
import { useLayoutEffect } from 'react'
import { ThirdwebProvider, useConnectionManager } from 'thirdweb/react'
import { defaultChain } from '@/config/thirdwebChain'

/**
 * Registers our default EVM chain with thirdweb's connection layer so `cacheChains`
 * and wallet/RPC resolution match {@link defaultChain} app-wide.
 */
function RegisterDefaultChain() {
  const { defineChains } = useConnectionManager()
  useLayoutEffect(() => {
    defineChains([defaultChain])
  }, [defineChains])
  return null
}

/**
 * App wrapper for `thirdweb/react` — same as the SDK docs:
 * {@link https://portal.thirdweb.com/react/v5/ThirdwebProvider}
 */
export function TreeGensThirdwebProvider({ children }: { children: ReactNode }) {
  return (
    <ThirdwebProvider>
      <RegisterDefaultChain />
      {children}
    </ThirdwebProvider>
  )
}
