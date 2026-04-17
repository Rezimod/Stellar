import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const target = p.get('t') ?? p.get('target') ?? '';
  const ts = p.get('d') ?? p.get('ts') ?? '0';
  const lat = p.get('la') ?? p.get('lat') ?? '0';
  const lon = p.get('lo') ?? p.get('lon') ?? '0';
  const cc = p.get('cc') ?? '0';
  const hash = p.get('h') ?? p.get('hash') ?? '';
  const stars = p.get('s') ?? p.get('stars') ?? '0';
  const rarity = p.get('r') ?? p.get('rarity') ?? 'Common';
  const multiplier = p.get('m') ?? p.get('multiplier') ?? '1';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app';
  const image = `${appUrl}/api/nft-image?target=${encodeURIComponent(target)}&ts=${ts}&lat=${lat}&lon=${lon}&cc=${cc}&stars=${stars}&rarity=${encodeURIComponent(rarity)}`;

  return NextResponse.json({
    name: `Stellar: ${target}`,
    description: `Verified observation of ${target}. Cloud cover ${cc}%${hash ? `, oracle ${hash}` : ''}. Sealed on Solana.`,
    image,
    external_url: appUrl,
    attributes: [
      { trait_type: 'Target', value: target },
      { trait_type: 'Date', value: new Date(Number(ts)).toISOString().split('T')[0] },
      { trait_type: 'Location', value: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}` },
      { trait_type: 'Cloud Cover', value: `${cc}%` },
      { trait_type: 'Oracle Hash', value: hash },
      { trait_type: 'Stars Earned', value: Number(stars) },
      { trait_type: 'Rarity', value: rarity },
      { trait_type: 'Streak Multiplier', value: Number(multiplier) },
    ],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
