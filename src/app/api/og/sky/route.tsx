import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2C3E5C 0%, #2C3E5C 100%)',
          position: 'relative',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#F5F1E8',
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          STELLAR
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: '#A8B4C8',
            marginTop: 12,
          }}
        >
          Observe the Sky · Earn on Solana
        </div>

        {/* Stat boxes */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 32,
          }}
        >
          {['🔭 Observations', '✦ Stars', '🪐 NFTs'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '8px 16px',
                fontSize: 16,
                color: 'white',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
            stellarrclub.vercel.app
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.12)' }}>
            · Powered by Solana
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
