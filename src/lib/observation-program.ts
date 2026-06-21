import { AnchorProvider, BN, Program, type Idl } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import idl from './idl/stellar_observations.json';
import type { StellarObservations } from './idl/stellar_observations';
import { getConnection } from './solana';

// Map the verify pipeline's target strings to the program's u8 codes.
const TARGET_CODE: Record<string, number> = {
  moon: 0,
  planet: 1,
  stars: 2,
  constellation: 3,
  deep_sky: 4,
  unknown: 5,
};

const CONFIDENCE_CODE: Record<string, number> = {
  rejected: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export interface RecordObservationInput {
  observer: string; // wallet base58
  fileHash: string; // '0x' + 40 hex (20 bytes) from the verify pipeline
  target: string;
  identifiedObject: string;
  confidence: string;
  lat: number;
  lon: number;
  observedAtMs: number;
  oracleHash: string;
  cloudCover: number;
  stars: number;
}

function programId(): PublicKey {
  return new PublicKey(process.env.OBSERVATION_PROGRAM_ID || (idl as Idl).address!);
}

/**
 * Oracle key signs + pays for all observation writes. Devnet falls back to the fee payer.
 * Returns null unless OBSERVATION_PROGRAM_ID is explicitly set, so on networks where the
 * Proof-of-Observation program isn't deployed (e.g. mainnet pre-deploy) every on-chain
 * read/write cleanly no-ops instead of hitting a non-existent program.
 */
function oracleKeypair(): Keypair | null {
  if (!process.env.OBSERVATION_PROGRAM_ID) return null;
  const b58 = process.env.OBSERVATION_ORACLE_PRIVATE_KEY || process.env.FEE_PAYER_PRIVATE_KEY;
  if (!b58) return null;
  return Keypair.fromSecretKey(bs58.decode(b58));
}

function getProgram(connection: Connection, signer: Keypair): Program<StellarObservations> {
  const wallet = {
    publicKey: signer.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(signer);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      txs.forEach((t) => t.partialSign(signer));
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, wallet as never, {
    commitment: 'confirmed',
  });
  const programIdl = { ...(idl as Idl), address: programId().toBase58() };
  return new Program<StellarObservations>(programIdl as never, provider);
}

export function registryPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('registry')], programId())[0];
}

export function observerPda(wallet: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('observer'), new PublicKey(wallet).toBuffer()],
    programId(),
  )[0];
}

/** 20-byte file-hash buffer used as the Observation PDA seed. */
function fileHashBytes(fileHash: string): Buffer {
  const hex = fileHash.startsWith('0x') ? fileHash.slice(2) : fileHash;
  if (/^[0-9a-f]{40}$/i.test(hex)) return Buffer.from(hex, 'hex');
  // Fallback for any non-conforming id: derive a stable 20-byte digest.
  return createHash('sha256').update(fileHash).digest().subarray(0, 20);
}

export function observationPda(fileHash: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('obs'), fileHashBytes(fileHash)],
    programId(),
  )[0];
}

function sha256Bytes32(s: string): number[] {
  return Array.from(createHash('sha256').update(s ?? '').digest());
}

function toMicro(deg: number): number {
  // i32 microdegrees; clamp defensively to the i32 range.
  const v = Math.round((Number.isFinite(deg) ? deg : 0) * 1_000_000);
  return Math.max(-2_147_483_648, Math.min(2_147_483_647, v));
}

/**
 * Record a verified observation on-chain (oracle-signed, gasless for the user).
 * Returns the tx signature and the Observation PDA. Safe to call best-effort:
 * callers should `.catch` and never block the DB / Stars / cNFT path.
 */
export async function recordObservationOnChain(
  input: RecordObservationInput,
): Promise<{ txId: string; pda: string } | null> {
  const signer = oracleKeypair();
  if (!signer) return null;

  const connection = getConnection();
  const program = getProgram(connection, signer);

  const observer = new PublicKey(input.observer);
  const fhBytes = fileHashBytes(input.fileHash);
  const pda = observationPda(input.fileHash);

  const args = {
    observer,
    fileHash: Array.from(fhBytes),
    targetCode: TARGET_CODE[input.target] ?? TARGET_CODE.unknown,
    identifiedHash: sha256Bytes32(input.identifiedObject || input.target),
    confidence: CONFIDENCE_CODE[input.confidence] ?? 0,
    latMicro: toMicro(input.lat),
    lonMicro: toMicro(input.lon),
    observedAt: new BN(Math.floor(input.observedAtMs / 1000)),
    oracleHash: sha256Bytes32(input.oracleHash || ''),
    cloudCover: Math.max(0, Math.min(255, Math.round(input.cloudCover || 0))),
    starsAwarded: Math.max(0, Math.min(0xffffffff, Math.round(input.stars || 0))),
  };

  const txId = await program.methods
    .recordObservation(args)
    .accounts({ oracleAuthority: signer.publicKey })
    .rpc();

  return { txId, pda: pda.toBase58() };
}

export interface OnChainObserverProfile {
  observer: string;
  totalObservations: number;
  totalStars: number;
  firstSeen: number;
  lastSeen: number;
  revokedCount: number;
}

export async function fetchObserverProfile(
  wallet: string,
): Promise<OnChainObserverProfile | null> {
  const signer = oracleKeypair();
  if (!signer) return null;
  const program = getProgram(getConnection(), signer);
  const acct = await program.account.observerProfile.fetchNullable(observerPda(wallet));
  if (!acct) return null;
  return {
    observer: acct.observer.toBase58(),
    totalObservations: acct.totalObservations.toNumber(),
    totalStars: acct.totalStars.toNumber(),
    firstSeen: acct.firstSeen.toNumber(),
    lastSeen: acct.lastSeen.toNumber(),
    revokedCount: acct.revokedCount,
  };
}

export interface OnChainObservation {
  pda: string;
  targetCode: number;
  confidence: number;
  latMicro: number;
  lonMicro: number;
  observedAt: number;
  cloudCover: number;
  starsAwarded: number;
  revoked: boolean;
}

export async function fetchObservations(wallet: string): Promise<OnChainObservation[]> {
  const signer = oracleKeypair();
  if (!signer) return [];
  const program = getProgram(getConnection(), signer);
  // observer is the first field → offset 8 (after the account discriminator).
  const rows = await program.account.observation.all([
    { memcmp: { offset: 8, bytes: new PublicKey(wallet).toBase58() } },
  ]);
  return rows.map((r) => ({
    pda: r.publicKey.toBase58(),
    targetCode: r.account.targetCode,
    confidence: r.account.confidence,
    latMicro: r.account.latMicro,
    lonMicro: r.account.lonMicro,
    observedAt: r.account.observedAt.toNumber(),
    cloudCover: r.account.cloudCover,
    starsAwarded: r.account.starsAwarded,
    revoked: r.account.revoked,
  }));
}
