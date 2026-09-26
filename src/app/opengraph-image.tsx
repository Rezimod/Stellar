import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Sidera — the night sky, issued in editions';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const read = (path: string) => readFile(join(process.cwd(), path));

export default async function Image() {
  const [saturn, g600] = await Promise.all([
    read('public/cards/plate/SATURN/object.svg'),
    read('src/app/_og/geist-600.ttf'),
  ]);
  const saturnUrl = `data:image/svg+xml;base64,${saturn.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#070b22',
          fontFamily: 'Geist',
          overflow: 'hidden',
        }}
      >
        <img src={saturnUrl} width={680} height={725} style={{ position: 'absolute', left: 560, top: -48 }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 1200, height: 630,
          background: 'linear-gradient(90deg, #070b22 0%, #070b22 47%, rgba(7,11,34,0) 66%)',
        }} />

        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 30,
          width: 780,
          padding: '0 80px',
        }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 14, color: '#FFB347' }}>SIDERA</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.06, color: '#FFFFFF' }}>
              The night sky,
            </div>
            <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.06, color: '#FFFFFF' }}>
              issued in editions
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 3, color: 'rgba(214,224,250,0.7)' }}>
            FIRST LIGHT · 100 CARDS · NODE 01, TBILISI
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Geist', data: g600, weight: 600, style: 'normal' }],
    },
  );
}
