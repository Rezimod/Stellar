import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Stellar — Photograph the sky, earn rewards';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const asset = (file: string) => readFile(join(process.cwd(), 'src/app/_og', file));

// [x, y, radius, isAmber]
const STARS: [number, number, number, boolean][] = [
  [88,52,1.5,false],[144,38,1,false],[210,68,2,false],[190,120,1,false],
  [310,44,1.5,true],[370,90,1,false],[420,58,1,false],[340,140,1.5,false],
  [500,36,1,false],[560,72,2,true],[620,48,1,false],[580,130,1.5,false],
  [700,55,1,false],[760,82,1.5,false],[820,42,1,false],[740,140,1,true],
  [920,66,2,false],[980,38,1,false],[1040,78,1.5,false],[900,130,1,false],
  [1100,50,1,true],[1140,100,1.5,false],[1070,140,1,false],[80,200,1,false],
  [170,250,1.5,false],[260,190,1,true],[460,210,2,false],[640,195,1,false],
  [780,220,1.5,false],[1020,205,1,false],[1150,230,1.5,true],[55,320,1,false],
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
        {/* Background galaxy */}
        <img src={bgUrl} width={1200} height={630}
          style={{ position: 'absolute', top: 0, left: 0 }} />

        {/* Left-to-right dark veil */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 1200, height: 630,
          background: 'linear-gradient(105deg,rgba(4,9,26,0.98) 0%,rgba(4,9,26,0.94) 28%,rgba(4,9,26,0.65) 52%,rgba(4,9,26,0.18) 70%,rgba(4,9,26,0) 85%)',
        }} />
        {/* Bottom shadow */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: 1200, height: 220,
          background: 'linear-gradient(0deg,rgba(4,9,26,0.96) 0%,rgba(4,9,26,0) 100%)',
        }} />
        {/* Amber ambient glow */}
        <div style={{
          position: 'absolute', top: 200, left: -60, width: 500, height: 340,
          background: 'radial-gradient(ellipse at center,rgba(255,179,71,0.09) 0%,rgba(255,179,71,0) 70%)',
          borderRadius: '50%',
        }} />

        {/* Star field */}
        {STARS.map(([x, y, r, isAmber], i) => (
          <div key={i} style={{
            position: 'absolute',
            width: r * 2, height: r * 2,
            borderRadius: '50%',
            background: isAmber ? 'rgba(255,179,71,0.75)' : 'rgba(255,255,255,0.55)',
            left: x, top: y,
            boxShadow: isAmber ? '0 0 4px rgba(255,179,71,0.5)' : 'none',
          }} />
        ))}

        {/* Content layer */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          padding: '52px 68px 48px',
        }}>

          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#FFB347',
              boxShadow: '0 0 8px rgba(255,179,71,0.9)',
            }} />
            <div style={{
              fontFamily: 'Orbitron', fontSize: 20, fontWeight: 600,
              letterSpacing: 10, color: 'rgba(248,244,236,0.7)',
            }}>
              STELLAR
            </div>
          </div>

          {/* Headline block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 600 }}>
            {/* Eyebrow */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 17, fontWeight: 500, letterSpacing: 2.5,
              color: 'rgba(255,179,71,0.85)',
            }}>
              <div style={{ width: 28, height: 1, background: 'rgba(255,179,71,0.55)' }} />
              THE NIGHT SKY. NOW.
            </div>

            {/* 3-line headline — separate divs, no \n (Satori limitation) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -3, lineHeight: 1.04, color: '#FFFFFF' }}>
                Look up.
              </div>
              <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -3, lineHeight: 1.04, color: '#FFFFFF' }}>
                Discover
              </div>
              <div style={{ fontSize: 80, fontWeight: 600, letterSpacing: -3, lineHeight: 1.04, color: '#FFB347' }}>
                everything.
              </div>
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 25, fontWeight: 500, lineHeight: 1.45,
              color: 'rgba(200,215,240,0.78)',
              marginTop: 4,
            }}>
              Photograph the sky. Earn Stars. Redeem for rewards at Astroman.
            </div>
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Sky Missions', 'AI Verification', 'Real Rewards'].map((tag) => (
                <div key={tag} style={{
                  fontSize: 15, fontWeight: 500,
                  color: 'rgba(248,244,236,0.60)',
                  padding: '6px 14px',
                  borderRadius: 24,
                  border: '1px solid rgba(248,244,236,0.13)',
                  background: 'rgba(248,244,236,0.04)',
                }}>
                  {tag}
                </div>
              ))}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 600,
              color: '#FFB347', letterSpacing: 0.4,
            }}>
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
