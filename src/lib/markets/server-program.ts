import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import idlJson from "./idl.json";
import type { StellarMarketsProgram } from "./client";

export function getFeePayerKeypair(): Keypair {
  const sk = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!sk) throw new Error("FEE_PAYER_PRIVATE_KEY not set");
  return Keypair.fromSecretKey(bs58.decode(sk));
}

// Minimal NodeWallet replacement. @coral-xyz/anchor's ESM bundle does not expose
// `Wallet` as a runtime constructor in production builds, so we build the shape
// AnchorProvider needs by hand.
function keypairWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    payer: keypair,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
      } else {
        tx.partialSign(keypair);
      }
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      for (const tx of txs) {
        if (tx instanceof VersionedTransaction) tx.sign([keypair]);
        else (tx as Transaction).partialSign(keypair);
      }
      return txs;
    },
  };
}

export function getServerProgram(): {
  program: StellarMarketsProgram;
  connection: Connection;
  feePayer: Keypair;
} {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const feePayer = getFeePayerKeypair();
  const provider = new AnchorProvider(
    connection,
    keypairWallet(feePayer) as never,
    { commitment: "confirmed" },
  );
  const program = new Program(idlJson as never, provider) as unknown as StellarMarketsProgram;
  return { program, connection, feePayer };
}
