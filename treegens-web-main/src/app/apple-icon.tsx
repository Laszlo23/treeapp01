import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Apple touch icon — home-screen bookmark on iOS. */
export default function AppleIcon() {
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
            'linear-gradient(145deg, #0d160a 0%, #1a3012 45%, #3d6b1f 100%)',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#DFEA8A',
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
              lineHeight: 1,
            }}
          >
            TG
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'rgba(247,250,243,0.88)',
              letterSpacing: 2,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            }}
          >
            GROWLATION
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
