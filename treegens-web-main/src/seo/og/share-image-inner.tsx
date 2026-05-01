/**
 * Shared JSX for `opengraph-image` / `twitter-image` (next/og ImageResponse subset).
 */
export function ShareImageInner() {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 72,
        background:
          'linear-gradient(135deg, #0d160a 0%, #1a3012 38%, #2d5016 72%, #3d6b1f 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: 'linear-gradient(145deg, #DFEA8A 0%, #b8cf5c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 800,
            color: '#1a3012',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          TG
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: '#f7faf3',
              letterSpacing: -2,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            }}
          >
            TreeGens
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#DFEA8A',
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            }}
          >
            The growlation
          </span>
        </div>
      </div>
      <p
        style={{
          margin: 0,
          maxWidth: 920,
          fontSize: 34,
          lineHeight: 1.35,
          color: 'rgba(247,250,243,0.92)',
          fontWeight: 500,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        Plant with proof. Verify on Base. Grow the movement — GPS, video, rewards &
        real trees.
      </p>
      <p
        style={{
          marginTop: 36,
          fontSize: 22,
          color: 'rgba(223,234,138,0.85)',
          fontWeight: 600,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        treegens.app · Base mainnet
      </p>
    </div>
  )
}
