import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'

// STARS is a Token-2022 mint with the NonTransferable extension — a closed
// loyalty economy (earn by minting, spend by burning, never transferable).
// Single source of truth for the token program; every STARS read/write must use
// it, since classic SPL and Token-2022 derive different ATAs.
export const STARS_TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID

// Max stars per confidence level — mirrors /api/observe/verify reward table
export const MAX_STARS_BY_CONFIDENCE: Record<string, number> = {
  high: 80,
  medium: 40,
  low: 15,
  rejected: 0,
}
export const DAILY_STARS_CAP = 500

// STARS mint authority. On mainnet this is a dedicated key, kept separate from
// the hot gas/fee-payer key, so a fee-payer leak cannot mint tokens. On devnet
// the mint was created with the fee payer as authority, so it falls back to it.
// The value here MUST match the authority the mint was actually created with.
export function getStarsMintAuthority(): Keypair {
  const b58 = process.env.STARS_MINT_AUTHORITY_PRIVATE_KEY || process.env.FEE_PAYER_PRIVATE_KEY
  if (!b58) {
    throw new Error('STARS mint authority not configured (set STARS_MINT_AUTHORITY_PRIVATE_KEY or FEE_PAYER_PRIVATE_KEY)')
  }
  return Keypair.fromSecretKey(bs58.decode(b58))
}

export async function awardStarsOnChain(
  recipientAddress: string,
  amount: number,
  reason: string
): Promise<void> {
  const mintAddress = process.env.STARS_TOKEN_MINT
  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY
  if (!mintAddress || !privateKeyB58) return

  const feePayerKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58))
  const mintAuthority = getStarsMintAuthority()
  const connection = new Connection(
    process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
    'confirmed'
  )
  const recipientKey = new PublicKey(recipientAddress)
  const mintKey = new PublicKey(mintAddress)

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayerKeypair,
    mintKey,
    recipientKey,
    false,
    'confirmed',
    undefined,
    STARS_TOKEN_PROGRAM_ID,
  )
  await mintTo(
    connection,
    feePayerKeypair,
    mintKey,
    ata.address,
    mintAuthority,
    BigInt(amount),
    [],
    undefined,
    STARS_TOKEN_PROGRAM_ID,
  )
}
