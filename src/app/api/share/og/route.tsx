import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('target') ?? 'Night Sky'
  const score = searchParams.get('score') ?? '0'
  const grade = searchParams.get('grade') ?? 'Good'
  const stars = searchParams.get('stars') ?? '0'
  const date = searchParams.get('date') ?? new Date().toISOString()
  const emoji = searchParams.get('emoji') ?? '🔭'

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #2C3E5C 0%, #0D1117 50%, #0B0E17 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Star field dots */}
        {[40, 120, 200, 320, 450, 550, 700, 800, 900, 1050, 150, 380, 620, 850, 980].map((x, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.6)',
              left: x,
              top: [30, 80, 150, 220, 60, 190, 40, 120, 280, 90, 340, 170, 50, 310, 240][i],
            }}
          />
        ))}

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 48px 0' }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: '#F5F1E8', letterSpacing: '-1px' }}>
            STELLAR
          </span>
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.35)' }}>
            stellarrclub.vercel.app
          </span>
        </div>

        {/* Center content */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 64, padding: '0 64px' }}>

          {/* Left — emoji + target */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 120, lineHeight: 1 }}>{emoji}</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>
              {target} Observation
            </span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)' }}>{formattedDate}</span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 200, background: 'rgba(232, 130, 107,0.15)' }} />

          {/* Right — score ring + grade */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {/* Score ring */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: '6px solid #E8826B',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(232, 130, 107,0.06)',
                boxShadow: '0 0 32px rgba(232, 130, 107,0.25)',
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 700, color: '#E8826B', lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 13, color: 'rgba(232, 130, 107,0.7)', marginTop: 2 }}>/ 100</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 600, color: '#5EEAD4' }}>{grade}</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 48px 32px',
          }}
        >
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>
            ✦ {stars} Stars earned · Sealed on Solana
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#E8826B',
              }}
            />
            <span style={{ fontSize: 18, color: '#E8826B', fontWeight: 600 }}>Solana</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
