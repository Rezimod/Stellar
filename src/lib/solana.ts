import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SOLANA_RPC_URL must be set in production');
    }
    console.warn('SOLANA_RPC_URL not set, falling back to devnet. This is OK for local development only.');
    return new Connection('https://api.devnet.solana.com', 'confirmed');
  }
  return new Connection(rpcUrl, 'confirmed');
}

export async function getStarsBalance(walletAddress: string): Promise<number> {
  if (!process.env.STARS_TOKEN_MINT) return 0;
  try {
    const connection = getConnection();
    const ata = await getAssociatedTokenAddress(
      new PublicKey(process.env.STARS_TOKEN_MINT),
      new PublicKey(walletAddress),
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    const account = await getAccount(connection, ata, undefined, TOKEN_2022_PROGRAM_ID);
    return Number(account.amount);
  } catch {
    return 0;
  }
}
