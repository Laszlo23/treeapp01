import type { MetadataRoute } from 'next'
import { siteMeta } from '@/config/siteMeta'

const paths: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/auth', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/tutorial', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/tutorial/verify', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/leaderboard', priority: 0.85, changeFrequency: 'daily' },
  { path: '/leaderboard/funded', priority: 0.8, changeFrequency: 'daily' },
  { path: '/stake', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/earn', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/inbox', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/profile', priority: 0.65, changeFrequency: 'weekly' },
  { path: '/submissions', priority: 0.75, changeFrequency: 'daily' },
  { path: '/submissions/create', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/submissions/review', priority: 0.7, changeFrequency: 'daily' },
  { path: '/health-checks', priority: 0.65, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteMeta.url.replace(/\/$/, '')
  const now = new Date()
  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
