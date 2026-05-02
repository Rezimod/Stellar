import { ImageResponse } from 'next/og';

export const alt = 'Stellar — Cosmic prediction markets on Solana';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A1735',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 32, color: '#F8F4EC', letterSpacing: 4, marginBottom: 16 }}>
          STELLAR
        </div>
        <div
          style={{
            fontSize: 64,
            color: 'white',
            fontWeight: 600,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          From Georgia&rsquo;s telescope shop to on-chain
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#A8B4C8',
            marginTop: 24,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          60,000 astronomers. Real markets. Real gear.
        </div>
        <div
          style={{
            fontSize: 18,
            color: '#A8B4C8',
            position: 'absolute',
            bottom: 40,
          }}
        >
          stellarrclub.vercel.app · Colosseum Frontier 2026
        </div>
      </div>
    ),
    { ...size },
  );
}
