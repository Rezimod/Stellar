import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { SET_001_CARDS, SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { isRarity, rarityInfo } from '@/lib/rarity';

export const alt = 'A Stellar card from Genesis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Drawn at build, one per card: the card faces are read from public/ then. */
export function generateStaticParams() {
  return SET_001_CARDS.map((c) => ({ designation: c.seed.designation }));
}

const read = (path: string) => readFile(join(process.cwd(), path));

/** A card's link preview: its face on the site's dark ground, with its name. next/og cannot draw WebP, so the face goes in as PNG. */
export default async function Image({ params }: { params: Promise<{ designation: string }> }) {
  const { designation } = await params;
  const card = SET_001_CARD_BY_DESIGNATION.get(designation.toUpperCase());
  const [g600, face] = await Promise.all([
    read('src/app/_og/geist-600.ttf'),
    card ? read(`public/cards/plate/${card.seed.designation}/card.webp`).then((b) => sharp(b).resize({ height: 760 }).png().toBuffer()).catch(() => null) : null,
  ]);
  const name = card?.seed.name ?? 'Genesis';
  const rarity = card && isRarity(card.seed.rarity) ? rarityInfo(card.seed.rarity) : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#1a0906', fontFamily: 'Geist', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', left: 560, top: -160, width: 760, height: 760, borderRadius: 760,
            background: `radial-gradient(circle, ${rarity?.color ?? '#FFB347'}40 0%, rgba(26, 9, 6, 0) 70%)`,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26, width: 700, padding: '0 80px' }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 10, color: '#FFB347' }}>STELLAR · GENESIS</div>
          <div style={{ fontSize: name.length > 22 ? 58 : 72, fontWeight: 600, letterSpacing: -2, lineHeight: 1.04, color: '#FFFFFF' }}>{name}</div>
          {rarity && (
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 6, color: rarity.color }}>{rarity.label.toUpperCase()}</div>
          )}
        </div>
        {face && (
          <img
            src={`data:image/png;base64,${face.toString('base64')}`}
            width={392}
            height={547}
            style={{ position: 'absolute', right: 110, top: 42, borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.85)' }}
          />
        )}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Geist', data: g600, weight: 600, style: 'normal' }],
    },
  );
}
