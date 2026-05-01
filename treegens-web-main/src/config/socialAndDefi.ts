/**
 * Social + DeFi CTAs (URLs are optional; set in env for production pools/posts).
 */
export const UNISWAP_ADD_LIQUIDITY_URL =
  process.env.NEXT_PUBLIC_UNISWAP_ADD_LIQUIDITY_URL?.trim() ||
  'https://app.uniswap.org/'

/** Official X profiles & campaign assets */
export const SOCIAL_EXTERNAL_URLS = {
  /** @treegens */
  treegensProfile:
    process.env.NEXT_PUBLIC_X_TREEGENS_PROFILE_URL?.trim() ||
    'https://x.com/treegens',
  /** @JimiCohen */
  jimiProfile:
    process.env.NEXT_PUBLIC_X_JIMI_PROFILE_URL?.trim() ||
    'https://x.com/JimiCohen',
  /** Post to engage (like + RT) */
  jimiCampaignPost:
    process.env.NEXT_PUBLIC_X_CAMPAIGN_POST_URL?.trim() ||
    'https://x.com/JimiCohen/status/1830892593603035487',
  /** TreegenFam community */
  telegramTreegenFam:
    process.env.NEXT_PUBLIC_TELEGRAM_TREEGEN_FAM_URL?.trim() ||
    'https://t.me/TreegenFam',

  likePost:
    process.env.NEXT_PUBLIC_SOCIAL_LIKE_POST_URL?.trim() ||
    'https://x.com/JimiCohen/status/1830892593603035487',
  shareMiniapp:
    process.env.NEXT_PUBLIC_SOCIAL_SHARE_MINIAPP_URL?.trim() ||
    'https://treegens.app',
  shareCampaign:
    process.env.NEXT_PUBLIC_SOCIAL_SHARE_CAMPAIGN_URL?.trim() ||
    'https://x.com/JimiCohen/status/1830892593603035487',
  xSpace:
    process.env.NEXT_PUBLIC_X_SPACE_URL?.trim() || 'https://x.com/treegens',
  followX:
    process.env.NEXT_PUBLIC_X_FOLLOW_URL?.trim() ||
    process.env.NEXT_PUBLIC_X_TREEGENS_PROFILE_URL?.trim() ||
    'https://x.com/treegens',
  retweetPinned:
    process.env.NEXT_PUBLIC_X_RETWEET_URL?.trim() ||
    'https://x.com/JimiCohen/status/1830892593603035487',
} as const

export const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || 'mailto:support@treegens.app'

export const DOCS_SITE_URL =
  process.env.NEXT_PUBLIC_DOCS_URL?.trim() || 'https://treegens.app'

/** UI hint only; actual conversion is off-chain / DAO parameters */
export const POINTS_PER_TGN_HINT = Number(
  process.env.NEXT_PUBLIC_POINTS_PER_TGN_HINT || 100,
)
