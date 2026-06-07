import { NextRequest, NextResponse } from 'next/server'
import { isValidPublicKey } from '@/lib/validate'
import { getPassport, passportMintAddress } from '@/lib/telescope-passport'

export const maxDuration = 30

// Public read + metadata endpoint for a wallet's soulbound Telescope Passport.
// Also the `uri` target baked into the Token-2022 metadata.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await params
  if (!isValidPublicKey(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const passport = await getPassport(wallet)
  const cluster = process.env.SOLANA_RPC_URL?.includes('mainnet') ? 'mainnet' : 'devnet'

  if (!passport) {
    return NextResponse.json({
      wallet,
      mint: passportMintAddress(wallet),
      passport: null,
      cluster,
    })
  }

  return NextResponse.json({
    wallet,
    mint: passport.mint,
    name: passport.name,
    description: 'Soulbound observer credential — non-transferable proof of verified astronomical observations on Stellar.',
    soulbound: true,
    attributes: [
      { trait_type: 'Tier', value: passport.tier },
      { trait_type: 'Observations', value: passport.observations },
    ],
    passport,
    cluster,
  })
}
