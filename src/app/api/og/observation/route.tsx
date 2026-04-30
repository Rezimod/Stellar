import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const TARGET_EMOJIS: Record<string, string> = {
  moon: '🌕',
  jupiter: '🪐',
  saturn: '🪐',
  mars: '🔴',
  venus: '🌟',
  mercury: '⚫',
  pleiades: '✨',
  orion: '⭐',
  'orion nebula': '⭐',
  andromeda: '🌌',
  'crab nebula': '💥',
  milky: '🌌',
  'milky way': '🌌',
};

function getTargetEmoji(target: string): string {
  const key = target.toLowerCase();
  for (const [k, v] of Object.entries(TARGET_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return '🔭';
}

function parseHashToStars(hash: string): Array<{ x: number; y: number; size: number; opacity: number }> {
  const clean = hash.replace(/^0x/, '');
  const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
  for (let i = 0; i + 3 < clean.length && stars.length < 40; i += 4) {
    const x = (parseInt(clean.slice(i, i + 2), 16) / 255) * 600;
    const y = (parseInt(clean.slice(i + 2, i + 4), 16) / 255) * 600;
    const size = 1 + (parseInt(clean.slice(i, i + 1), 16) % 3);
    const opacity = 0.3 + (parseInt(clean.slice(i + 1, i + 2), 16) / 255) * 0.7;
    stars.push({ x, y, size, opacity });
  }
  return stars;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const target = searchParams.get('target') ?? 'Unknown Object';
  const ts = searchParams.get('ts') ?? '0';
  const lat = searchParams.get('lat') ?? '0';
  const lon = searchParams.get('lon') ?? '0';
  const cc = searchParams.get('cc') ?? '0';
  const stars = searchParams.get('stars') ?? '0';
  const hash = searchParams.get('hash') ?? '0x' + '0'.repeat(40);

  const date = new Date(Number(ts)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const emoji = getTargetEmoji(target);
  const starDots = parseHashToStars(hash);

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 600,
          background: '#0F1320',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: '2px solid rgba(240, 128, 92,0.15)',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Star field */}
        {starDots.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#F0805C' : '#ffffff',
              opacity: s.opacity,
            }}
          />
        ))}

        {/* Top-right location */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 20,
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
          }}
        >
          {`${Number(lat).toFixed(2)}°, ${Number(lon).toFixed(2)}°`}
        </div>

        {/* Top-left branding */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            color: '#F8F4EC',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          STELLAR
        </div>

        {/* Center content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 72 }}>{emoji}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>
            {target}
          </div>
          <div style={{ fontSize: 13, color: '#A8B4C8' }}>{date}</div>
        </div>

        {/* Bottom stats */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ color: '#A8B4C8', fontSize: 12 }}>{`☁️ ${cc}%`}</div>
            <div style={{ color: '#F0805C', fontSize: 12 }}>{`★ ${stars}`}</div>
          </div>
          <div style={{ color: '#F8F4EC', fontSize: 11, letterSpacing: 1 }}>STELLAR</div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 600,
    }
  );
}
