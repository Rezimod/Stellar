import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Stellar — Your default astronomy app';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const asset = (file: string) => readFile(join(process.cwd(), 'src/app/_og', file));

const FACTS = ['7-day sky forecast', 'Live planet tracker', 'Photo-verified rewards'];

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
          background: '#060C1C',
          fontFamily: 'Geist',
        }}
      >
        <img src={bgUrl} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background:
              'linear-gradient(90deg, rgba(6,12,28,0.97) 0%, rgba(6,12,28,0.92) 26%, rgba(6,12,28,0.45) 44%, rgba(6,12,28,0) 62%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background: 'linear-gradient(0deg, rgba(6,12,28,0.85) 0%, rgba(6,12,28,0) 32%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '56px 64px 52px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#FFB347' }} />
            <div
              style={{
                fontFamily: 'Orbitron',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 8,
                color: '#F8F4EC',
              }}
            >
              STELLAR
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            <div
              style={{
                fontSize: 74,
                fontWeight: 600,
                letterSpacing: -2.5,
                lineHeight: 1.06,
                color: '#FFFFFF',
                textShadow: '0 2px 28px rgba(6,12,28,0.85)',
                maxWidth: 560,
              }}
            >
              Your default astronomy app
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.38,
                color: '#B4C0D4',
                maxWidth: 430,
                marginTop: 24,
              }}
            >
              Photograph the sky. Earn Stars. Redeem for real telescopes.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {FACTS.map((fact, i) => (
                <div key={fact} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {i > 0 && <div style={{ width: 1, height: 18, background: 'rgba(248,244,236,0.22)' }} />}
                  <div style={{ fontSize: 22, fontWeight: 500, color: 'rgba(248,244,236,0.8)' }}>{fact}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#FFB347', letterSpacing: 0.4 }}>
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
