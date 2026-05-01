'use client'

import {
  DOCS_SITE_URL,
  SOCIAL_EXTERNAL_URLS,
  SUPPORT_URL,
  UNISWAP_ADD_LIQUIDITY_URL,
} from '@/config/socialAndDefi'
import { FaTelegramPlane } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

/** Shared with Earn / tasks — see `globals.css` `.tg-social-pill` */
const linkClass = 'tg-social-pill'

export function AppFooter() {
  return (
    <footer
      className="mx-auto mt-10 w-full max-w-2xl px-4 pb-8 pt-4"
      aria-label="TreeGens footer"
    >
      <div className="tg-glass-panel px-5 py-5">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[#5c534a]">
          Connect & support
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={SOCIAL_EXTERNAL_URLS.treegensProfile}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <FaXTwitter className="h-3.5 w-3.5" aria-hidden />
            TreeGens
          </a>
          <a
            href={SOCIAL_EXTERNAL_URLS.jimiProfile}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <FaXTwitter className="h-3.5 w-3.5" aria-hidden />
            JimiCohen
          </a>
          <a
            href={SOCIAL_EXTERNAL_URLS.telegramTreegenFam}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <FaTelegramPlane className="h-3.5 w-3.5" aria-hidden />
            Telegram
          </a>
          <a
            href={UNISWAP_ADD_LIQUIDITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            TGN / DeFi
          </a>
          <a href={SUPPORT_URL} className={linkClass}>
            Support
          </a>
          <a href={DOCS_SITE_URL} className={linkClass}>
            Site
          </a>
        </div>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-[#6b6560]">
          Verified trees are tallied in your profile; rewards route through the
          API and on-chain programs when you claim.
        </p>
      </div>
    </footer>
  )
}
