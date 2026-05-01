import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** App favicon — lime mark on forest gradient (matches PWA / OG). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(145deg, #0d160a 0%, #1a3012 55%, #2d5016 100%)',
          borderRadius: 8,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#DFEA8A',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          T
        </span>
      </div>
    ),
    { ...size },
  )
}
