import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const target = searchParams.get('target') ?? '';
  const ts = searchParams.get('ts') ?? '0';
  const lat = searchParams.get('lat') ?? '0';
  const lon = searchParams.get('lon') ?? '0';
  const cc = searchParams.get('cc') ?? '0';
  const hash = searchParams.get('hash') ?? '';
  const stars = searchParams.get('stars') ?? '0';

  return NextResponse.json({
    name: `Stellar: ${target}`,
    description: `Verified observation of ${target}. Cloud cover ${cc}%, oracle hash ${hash}. Sealed on Solana.`,
    image: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'}/api/nft-image?target=${encodeURIComponent(target)}&ts=${ts}&lat=${lat}&lon=${lon}&cc=${cc}&stars=${stars}`,
    external_url: 'https://stellarrclub.vercel.app',
    attributes: [
      { trait_type: 'Target', value: target },
      { trait_type: 'Date', value: new Date(Number(ts)).toISOString().split('T')[0] },
      { trait_type: 'Location', value: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}` },
      { trait_type: 'Cloud Cover', value: `${cc}%` },
      { trait_type: 'Oracle Hash', value: hash },
      { trait_type: 'Stars Earned', value: Number(stars) },
    ],
  });
}
