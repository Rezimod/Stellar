import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

function getEmoji(target: string): string {
  if (/moon|lunar/i.test(target)) return '🌕';
  if (/jupiter/i.test(target)) return '🪐';
  if (/saturn/i.test(target)) return '🪐';
  if (/pleiades|m45/i.test(target)) return '✨';
  if (/orion|m42/i.test(target)) return '🌌';
  if (/andromeda|m31/i.test(target)) return '🌀';
  if (/crab|m1/i.test(target)) return '💫';
  return '⭐';
}

function getRarityBorder(rarity: string): { color: string; glow: string } {
  switch (rarity) {
    case 'Celestial': return { color: '#FFD166', glow: 'rgba(255,209,102,0.45)' };
    case 'Astral':    return { color: '#A855F7', glow: 'rgba(168,85,247,0.40)' };
    case 'Stellar':   return { color: '#818cf8', glow: 'rgba(99,102,241,0.35)' };
    default:          return { color: 'rgba(255,255,255,0.08)', glow: 'rgba(0,0,0,0)' };
  }
}

function getGlowColor(target: string): string {
  if (/moon|lunar/i.test(target)) return 'rgba(255, 241, 200, 0.12)';
  if (/jupiter/i.test(target)) return 'rgba(255, 180, 100, 0.10)';
  if (/saturn/i.test(target)) return 'rgba(230, 200, 140, 0.10)';
  if (/pleiades|m45/i.test(target)) return 'rgba(150, 180, 255, 0.12)';
  if (/orion|andromeda|m42|m31/i.test(target)) return 'rgba(200, 130, 255, 0.10)';
  if (/crab|m1/i.test(target)) return 'rgba(255, 100, 100, 0.10)';
  return 'rgba(255, 255, 255, 0.08)';
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const target = searchParams.get('target');
  const ts = searchParams.get('ts') ?? String(Date.now());
  const lat = searchParams.get('lat') ?? '0';
  const lon = searchParams.get('lon') ?? '0';
  const cc = searchParams.get('cc') ?? '0';
  const stars = searchParams.get('stars') ?? '0';
  const rarity = searchParams.get('rarity') ?? 'Common';

  if (!target) {
    return new NextResponse('Missing target parameter', { status: 400 });
  }

  const rarityBorder = getRarityBorder(rarity);
  const rand = seededRandom(target + ts);
  const dots = Array.from({ length: 35 }, (_, i) => ({
    key: i,
    x: Math.floor(rand() * 600),
    y: Math.floor(rand() * 600),
    size: Math.floor(rand() * 3) + 1,
    opacity: rand() * 0.5 + 0.3,
  }));

  const emoji = getEmoji(target);
  const glowColor = getGlowColor(target);

  const dateStr = new Date(Number(ts)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const latNum = Number(lat).toFixed(1);
  const lonNum = Number(lon).toFixed(1);

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 600,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: `6px solid ${rarityBorder.color}`,
          boxShadow: rarity === 'Celestial' || rarity === 'Astral'
            ? `inset 0 0 60px ${rarityBorder.glow}`
            : 'none',
        }}
      >
        {/* Star field */}
        {dots.map(dot => (
          <div
            key={dot.key}
            style={{
              position: 'absolute',
              left: dot.x,
              top: dot.y,
              width: dot.size,
              height: dot.size,
              borderRadius: '50%',
              background: `rgba(255,255,255,${dot.opacity.toFixed(2)})`,
            }}
          />
        ))}

        {/* Rarity pill — top right */}
        {rarity !== 'Common' && (
          <div style={{
            position: 'absolute',
            top: 22, right: 22,
            padding: '5px 12px',
            borderRadius: 20,
            background: 'rgba(7,11,20,0.75)',
            border: `1.5px solid ${rarityBorder.color}`,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: rarityBorder.color,
            display: 'flex',
          }}>
            {rarity}
          </div>
        )}

        {/* Glow behind emoji */}
        <div
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: glowColor,
            display: 'flex',
          }}
        />

        {/* Center content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginTop: 16,
          }}
        >
          <span style={{ fontSize: 120, lineHeight: 1 }}>{emoji}</span>
          <span
            style={{
              fontSize: 28,
              color: 'white',
              fontWeight: 700,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            {target}
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 8,
            }}
          >
            {dateStr}
          </span>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 72,
            background: 'rgba(0,0,0,0.4)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Teal accent line */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: '#818cf8',
              display: 'flex',
            }}
          />
          {/* Three columns */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              height: '100%',
              paddingBottom: 3,
            }}
          >
            {/* Cloud */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>CLOUD</span>
              <span style={{ fontSize: 18, color: 'white', fontWeight: 600 }}>{cc}%</span>
            </div>
            {/* Stars */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>STARS</span>
              <span style={{ fontSize: 18, color: '#FFD166', fontWeight: 600 }}>+{stars}</span>
            </div>
            {/* Location */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>LOC</span>
              <span style={{ fontSize: 12, color: 'white' }}>{latNum}°, {lonNum}°</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 600,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
