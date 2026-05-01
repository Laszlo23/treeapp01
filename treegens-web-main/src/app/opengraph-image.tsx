import { ImageResponse } from 'next/og'
import { ShareImageInner } from '@/seo/og/share-image-inner'
import { siteMeta } from '@/config/siteMeta'

export const runtime = 'edge'

export const alt = siteMeta.ogTitle
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(<ShareImageInner />, {
    ...size,
  })
}
