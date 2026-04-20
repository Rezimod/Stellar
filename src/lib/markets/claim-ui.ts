import { BN } from "@coral-xyz/anchor";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { marketPDA, vaultPDA, positionPDA } from "./pdas";
import { PROGRAM_ID, type PrivySigner, type StellarMarketsProgram } from "./client";

export interface ClaimFromUIResult {
  txSignature: TransactionSignature;
  path: "A" | "B";
}

export async function claimWinningsFromUI(
  program: StellarMarketsProgram,
  signer: PrivySigner,
  mint: PublicKey,
  marketId: number,
): Promise<ClaimFromUIResult> {
  if (!signer.isReady || !signer.publicKey) {
    throw new Error("Wallet not connected");
  }
  const user = signer.publicKey;
  const [market] = marketPDA(PROGRAM_ID, marketId);
  const [vault] = vaultPDA(PROGRAM_ID, marketId);
  const [position] = positionPDA(PROGRAM_ID, marketId, user);
  const userAta = await getAssociatedTokenAddress(mint, user, true);

  const tx = await program.methods
    .claimWinnings(new BN(marketId))
    .accountsStrict({
      user,
      market,
      marketVault: vault,
      userPosition: position,
      userTokenAccount: userAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();

  tx.feePayer = user;
  const { blockhash } = await program.provider.connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  const { signature, path } = await signer.signAndSend(tx);
  return { txSignature: signature, path };
}
