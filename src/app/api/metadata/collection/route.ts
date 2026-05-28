import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Stellar Observations',
    symbol: 'STLR',
    description:
      'Verified astronomical observations minted as compressed NFTs on Solana. Each attestation proves a real sky observation made with Stellar, the AI-powered astronomy companion.',
    image: 'https://stellarr.club/collection-image.png',
    external_url: 'https://stellarr.club',
    seller_fee_basis_points: 0,
    properties: {
      category: 'image',
      creators: [],
    },
  });
}
