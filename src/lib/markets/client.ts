import {
  AnchorProvider,
  Idl,
  Program,
  Wallet,
  setProvider,
} from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import idlJson from "./idl.json";
import type { StellarMarkets } from "./stellar_markets";

export const PROGRAM_ID = new PublicKey(
  (idlJson as { address: string }).address,
);

export type StellarMarketsProgram = Program<StellarMarkets>;

export interface AnchorWalletLike {
  publicKey: PublicKey;
  signTransaction<T extends Transaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]>;
}

export interface PrivySignAndSendResult {
  signature: string;
  path: "A" | "B";
}

export interface PrivySigner {
  publicKey: PublicKey | null;
  isReady: boolean;
  signAndSend(tx: Transaction): Promise<PrivySignAndSendResult>;
}

export function getProgram(
  wallet: AnchorWalletLike,
  connection: Connection,
): StellarMarketsProgram {
  const provider = new AnchorProvider(connection, wallet as unknown as Wallet, {
    commitment: "confirmed",
  });
  setProvider(provider);
  return new Program(idlJson as unknown as Idl, provider) as unknown as StellarMarketsProgram;
}

class ReadOnlyWallet implements AnchorWalletLike {
  readonly publicKey: PublicKey;
  constructor(public readonly keypair: Keypair) {
    this.publicKey = keypair.publicKey;
  }
  async signTransaction<T extends Transaction>(_tx: T): Promise<T> {
    throw new Error("ReadOnlyWallet cannot sign transactions");
  }
  async signAllTransactions<T extends Transaction>(_txs: T[]): Promise<T[]> {
    throw new Error("ReadOnlyWallet cannot sign transactions");
  }
}

// Cache one read-only Program per connection (keyed by RPC endpoint) so that
// every component that calls `useReadOnlyProgram` shares the same instance
// instead of allocating a new Anchor Program + Keypair per mount.
const _readOnlyPrograms = new Map<string, StellarMarketsProgram>();

export function getReadOnlyProgram(connection: Connection): StellarMarketsProgram {
  const key = connection.rpcEndpoint;
  const existing = _readOnlyPrograms.get(key);
  if (existing) return existing;
  const wallet = new ReadOnlyWallet(Keypair.generate());
  const provider = new AnchorProvider(connection, wallet as unknown as Wallet, {
    commitment: "confirmed",
  });
  const program = new Program(idlJson as unknown as Idl, provider) as unknown as StellarMarketsProgram;
  _readOnlyPrograms.set(key, program);
  return program;
}
