import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Stellar — Photograph the sky, earn rewards';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const asset = (file: string) => readFile(join(process.cwd(), 'src/app/_og', file));

// Constellation dot positions [x, y, r] — hand-placed to feel organic
const STARS = [
  [88,  52,  1.5], [144, 38,  1],   [210, 68,  2],   [190, 120, 1],
  [310, 44,  1.5], [370, 90,  1],   [420, 58,  1],   [340, 140, 1.5],
  [500, 36,  1],   [560, 72,  2],   [620, 48,  1],   [580, 130, 1.5],
  [700, 55,  1],   [760, 82,  1.5], [820, 42,  1],   [740, 140, 1],
  [920, 66,  2],   [980, 38,  1],   [1040,78,  1.5], [900, 130, 1],
  [1100,50,  1],   [1140,100, 1.5], [1070,140, 1],   [80,  200, 1],
  [170, 250, 1.5], [260, 190, 1],   [460, 210, 2],   [640, 195, 1],
  [780, 220, 1.5], [1020,205, 1],   [1150,230, 1.5], [55,  320, 1],
];

export default async function Image() {
  const [bgData, g500, g600, orb] = await Promise.all([
    asset('andromeda-og.jpg'),
    asset('geist-500.ttf'),
    asset('geist-600.ttf'),
    asset('orbitron-600.ttf'),
  ]);
  const bgUrl = `data:image/jpeg;base64,${bgData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#04091A',
          fontFamily: 'Geist',
          overflow: 'hidden',
        }}
      >
        {/* Background galaxy photo — right-side crop */}
        <img
          src={bgUrl}
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
        />

        {/* Dark veil — heavy left, fades right so galaxy glows through */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, width: 1200, height: 630,
            background: 'linear-gradient(105deg, rgba(4,9,26,0.98) 0%, rgba(4,9,26,0.94) 28%, rgba(4,9,26,0.65) 52%, rgba(4,9,26,0.18) 70%, rgba(4,9,26,0.0) 85%)',
          }}
        />
        {/* Bottom shadow so footer text is always readable */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, width: 1200, height: 220,
            background: 'linear-gradient(0deg, rgba(4,9,26,0.96) 0%, rgba(4,9,26,0) 100%)',
          }}
        />
        {/* Ambient amber glow — centre-left */}
        <div
          style={{
            position: 'absolute', top: 180, left: -80, width: 560, height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(255,179,71,0.10) 0%, rgba(255,179,71,0) 70%)',
          }}
        />

        {/* Star field overlay — tiny white dots */}
        {(STARS as [number,number,number][]).map(([x, y, r], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: r * 2, height: r * 2,
              borderRadius: '50%',
              background: i % 5 === 0
                ? 'rgba(255,179,71,0.7)'
                : 'rgba(255,255,255,0.55)',
              left: x, top: y,
              boxShadow: i % 5 === 0 ? '0 0 4px rgba(255,179,71,0.5)' : undefined,
            }}
          />
        ))}

        {/* Content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '52px 68px 48px',
          }}
        >
          {/* Top — wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#FFB347',
                boxShadow: '0 0 8px rgba(255,179,71,0.9)',
              }}
            />
            <div
              style={{
                fontFamily: 'Orbitron', fontSize: 20, fontWeight: 600,
                letterSpacing: 10, color: 'rgba(248,244,236,0.75)',
              }}
            >
              STELLAR
            </div>
          </div>

          {/* Centre — headline block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>
            {/* Eyebrow */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 18, fontWeight: 500, letterSpacing: 2.5,
                color: 'rgba(255,179,71,0.85)',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ width: 28, height: 1, background: 'rgba(255,179,71,0.6)' }} />
              The night sky. Now.
            </div>

            {/* Main headline */}
            <div
              style={{
                fontSize: 80,
                fontWeight: 600,
                letterSpacing: -3,
                lineHeight: 1.02,
                color: '#FFFFFF',
                textShadow: '0 0 60px rgba(255,179,71,0.18), 0 2px 24px rgba(4,9,26,0.9)',
              }}
            >
              Look up.{'\n'}Discover{'\n'}<span style={{ color: '#FFB347' }}>everything.</span>
            </div>

            {/* Sub */}
            <div
              style={{
                fontSize: 26, fontWeight: 500, lineHeight: 1.4,
                color: 'rgba(200,215,240,0.80)',
              }}
            >
              Photograph the sky. Earn Stars.{'\n'}Redeem for rewards at Astroman.
            </div>
          </div>

          {/* Bottom — domain + subtle pill tags */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Sky Missions', 'AI Verification', 'Real Rewards'].map((tag) => (
                <div
                  key={tag}
                  style={{
                    fontSize: 16, fontWeight: 500,
                    color: 'rgba(248,244,236,0.65)',
                    padding: '6px 16px',
                    borderRadius: 24,
                    border: '1px solid rgba(248,244,236,0.14)',
                    background: 'rgba(248,244,236,0.05)',
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 22, fontWeight: 600,
                color: '#FFB347', letterSpacing: 0.4,
                textShadow: '0 0 20px rgba(255,179,71,0.4)',
              }}
            >
              stellarr.club
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: g500, weight: 500, style: 'normal' },
        { name: 'Geist', data: g600, weight: 600, style: 'normal' },
        { name: 'Orbitron', data: orb, weight: 600, style: 'normal' },
      ],
    },
  );
}
