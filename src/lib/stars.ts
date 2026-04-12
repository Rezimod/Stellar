import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import bs58 from 'bs58'

// Max stars per confidence level — mirrors /api/observe/verify reward table
export const MAX_STARS_BY_CONFIDENCE: Record<string, number> = {
  high: 80,
  medium: 40,
  low: 15,
  rejected: 0,
}
export const DAILY_STARS_CAP = 500

export async function awardStarsOnChain(
  recipientAddress: string,
  amount: number,
  reason: string
): Promise<void> {
  const mintAddress = process.env.STARS_TOKEN_MINT
  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY
  if (!mintAddress || !privateKeyB58) return

  const feePayerKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyB58))
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
    recipientKey
  )
  await mintTo(connection, feePayerKeypair, mintKey, ata.address, feePayerKeypair, BigInt(amount))
}
