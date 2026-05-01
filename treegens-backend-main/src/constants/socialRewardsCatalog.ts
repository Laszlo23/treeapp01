/** Server-side catalog for social reward tasks (anti-tamper point values). */
export const SOCIAL_TASK_KEYS = [
  'follow_treegens_x',
  'follow_jimi_cohen_x',
  'like_retweet_jimi_post',
  'join_telegram_treegenfam',
  'swap_tgn_share_x',
  'daily_checkin',
  'referral_share',
  'share_miniapp',
] as const

export type SocialTaskKey = (typeof SOCIAL_TASK_KEYS)[number]

export type SocialCatalogEntry = {
  title: string
  description: string
  points: number
}

export const SOCIAL_TASK_CATALOG: Record<SocialTaskKey, SocialCatalogEntry> = {
  follow_treegens_x: {
    title: 'Follow @treegens on X',
    description: 'Follow TreeGens for drops, verifier news, and program updates.',
    points: 40,
  },
  follow_jimi_cohen_x: {
    title: 'Follow @JimiCohen on X',
    description:
      'Follow Jimi Cohen for builder updates and Mangrove regeneration stories.',
    points: 40,
  },
  like_retweet_jimi_post: {
    title: 'Like & repost Jimi’s post',
    description:
      'Engage with the pinned campaign thread — boosts discovery for planters.',
    points: 55,
  },
  join_telegram_treegenfam: {
    title: 'Join Telegram (@TreegenFam)',
    description: 'Join our community Telegram for quests, AMAs, and support.',
    points: 45,
  },
  swap_tgn_share_x: {
    title: 'Swap TGN & post on X',
    description:
      'Add liquidity or swap into TGN, then share what you’re doing — tag TreeGens.',
    points: 75,
  },
  daily_checkin: {
    title: 'Daily check-in',
    description:
      'Open TreeGens once per UTC day and tap complete to streak your loyalty points.',
    points: 15,
  },
  referral_share: {
    title: 'Refer a planter',
    description:
      'Share your referral link so friends plant with your wallet tag.',
    points: 120,
  },
  share_miniapp: {
    title: 'Share TreeGens',
    description:
      'Share the mini app with someone who cares about verified reforestation.',
    points: 55,
  },
}

export function isSocialTaskKey(key: string): key is SocialTaskKey {
  return (SOCIAL_TASK_KEYS as readonly string[]).includes(key)
}
