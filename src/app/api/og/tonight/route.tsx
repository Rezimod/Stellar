import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const score = Number(searchParams.get('score') ?? 72);
  const badge = searchParams.get('badge') ?? 'Great';
  const highlight1 = searchParams.get('highlight1') ?? 'Jupiter visible';
  const highlight2 = searchParams.get('highlight2') ?? 'Crescent Moon';
  const highlight3 = searchParams.get('highlight3') ?? '';
  const location = searchParams.get('location') ?? 'Tbilisi';

  const scoreColor = score >= 70 ? '#5EEAD4' : score >= 50 ? '#FFD166' : '#A8B4C8';
  const emoji = score >= 90 ? '✨' : score >= 70 ? '🌟' : score >= 50 ? '⭐' : score >= 30 ? '🌤️' : '☁️';

  const highlights = [highlight1, highlight2, highlight3].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#0A1735',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${scoreColor}12 0%, transparent 65%)`,
          transform: 'translate(-50%, -50%)',
        }} />

        {/* Top row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '32px 48px 0',
        }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#F8F4EC', letterSpacing: 2 }}>STELLAR</span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>{location}</span>
        </div>

        {/* Center — score */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 8,
        }}>
          <div style={{ display: 'flex', fontSize: 120, fontWeight: 700, color: scoreColor, lineHeight: 1, fontFamily: 'monospace' }}>
            {score}
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: scoreColor, fontWeight: 600 }}>
            {`${emoji} ${badge} Sky Tonight`}
          </div>
          <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            Sky Score /100
          </div>

          {/* Highlights row */}
          {highlights.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              {highlights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '10px 18px',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '0 48px 28px',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>
            stellarrclub.vercel.app · Powered by Solana
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
