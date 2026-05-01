import type { MetadataRoute } from 'next'
import { siteMeta } from '@/config/siteMeta'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${siteMeta.url}/`,
    name: `${siteMeta.name} — ${siteMeta.shortTitle}`,
    short_name: siteMeta.name,
    description: siteMeta.description,
    start_url: '/',
    display: 'standalone',
    background_color: siteMeta.bgColor,
    theme_color: siteMeta.themeColor,
    orientation: 'portrait',
    scope: '/',
    lang: 'en',
    categories: ['environment', 'lifestyle', 'utilities'],
    icons: [
      {
        src: '/img/treegens-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/img/treegens-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/img/tree.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/img/tree.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/img/treegens-placeholder.svg',
        sizes: '320x640',
        type: 'image/svg+xml',
        form_factor: 'narrow',
      },
    ],
  }
}
