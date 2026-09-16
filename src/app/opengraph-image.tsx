import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Stellar — Your default astronomy app';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const asset = (file: string) => readFile(join(process.cwd(), 'src/app/_og', file));

export default async function Image() {
  const [bgData, scopeData, g600, orb] = await Promise.all([
    asset('milkyway-og.jpg'),
    asset('telescope-og.png'),
    asset('geist-600.ttf'),
    asset('orbitron-600.ttf'),
  ]);
  const bgUrl = `data:image/jpeg;base64,${bgData.toString('base64')}`;
  const scopeUrl = `data:image/png;base64,${scopeData.toString('base64')}`;

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
        <img src={bgUrl} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} />

        <div style={{
          position: 'absolute', top: 0, left: 0, width: 1200, height: 630,
          background: 'linear-gradient(100deg,rgba(4,9,26,0.92) 0%,rgba(4,9,26,0.7) 40%,rgba(4,9,26,0.15) 75%,rgba(4,9,26,0) 100%)',
        }} />

        <img src={scopeUrl} width={420} height={493} style={{ position: 'absolute', right: 70, bottom: 30 }} />

        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          width: 700,
          padding: '0 72px',
        }}>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 26, fontWeight: 600,
            letterSpacing: 12, color: '#FFB347',
          }}>
            STELLAR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.06, color: '#FFFFFF' }}>
              Your default
            </div>
            <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.06, color: '#FFFFFF' }}>
              astronomy app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: g600, weight: 600, style: 'normal' },
        { name: 'Orbitron', data: orb, weight: 600, style: 'normal' },
      ],
    },
  );
}
