import { NextRequest, NextResponse } from 'next/server'
import { isValidPublicKey } from '@/lib/validate'
import {
  fetchObserverProfile,
  fetchObservations,
  observerPda,
} from '@/lib/observation-program'

export const maxDuration = 30

// Public read: on-chain observation data is not secret. Proves the
// Proof-of-Observation registry holds real program state, independent of the DB.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await params
  if (!isValidPublicKey(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  try {
    const [profile, observations] = await Promise.all([
      fetchObserverProfile(wallet),
      fetchObservations(wallet),
    ])
    return NextResponse.json({
      wallet,
      profilePda: observerPda(wallet).toBase58(),
      profile,
      observations,
      cluster: process.env.SOLANA_RPC_URL?.includes('mainnet') ? 'mainnet' : 'devnet',
    })
  } catch (err) {
    console.error('[observe/onchain]', err)
    return NextResponse.json(
      { error: 'Failed to read on-chain registry', profile: null, observations: [] },
      { status: 502 },
    )
  }
}
