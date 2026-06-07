// Soulbound Telescope Passport — a Token-2022 non-transferable NFT that encodes
// the observer's reputation tier (from the Proof-of-Observation registry). Minted
// gaslessly server-side by the fee payer; users never sign. The passport is
// one-per-wallet, supply 1, mint authority removed after minting, so it can never
// be transferred or duplicated.

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  AuthorityType,
  getMintLen,
  createInitializeMintInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeMetadataPointerInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getTokenMetadata,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  type TokenMetadata,
} from '@solana/spl-token-metadata';
import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { getConnection } from './solana';
import { tierForCount } from './reputation';

const PASSPORT_NAME = 'Stellar Telescope Passport';
const PASSPORT_SYMBOL = 'STLP';

function feePayer(): Keypair | null {
  const b58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!b58) return null;
  return Keypair.fromSecretKey(bs58.decode(b58));
}

/**
 * Deterministic per-wallet mint keypair, salted with the fee-payer secret so the
 * mint's private key is NOT publicly derivable (prevents anyone from front-running
 * passport creation). Reproducible server-side without any stored mapping.
 */
function passportMintKeypair(wallet: string, payer: Keypair): Keypair {
  const seed = createHash('sha256')
    .update(Buffer.concat([payer.secretKey, Buffer.from('stellar-passport-v1:' + wallet)]))
    .digest();
  return Keypair.fromSeed(seed);
}

export function passportMintAddress(wallet: string): string | null {
  const payer = feePayer();
  if (!payer) return null;
  return passportMintKeypair(wallet, payer).publicKey.toBase58();
}

export interface PassportInfo {
  mint: string;
  name: string;
  tier: string | null;
  observations: string | null;
}

/** Read a wallet's passport (Token-2022 metadata), or null if none minted. */
export async function getPassport(wallet: string): Promise<PassportInfo | null> {
  const payer = feePayer();
  if (!payer) return null;
  const mint = passportMintKeypair(wallet, payer).publicKey;
  try {
    const md = await getTokenMetadata(getConnection(), mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
    if (!md) return null;
    const fields = Object.fromEntries(md.additionalMetadata);
    return {
      mint: mint.toBase58(),
      name: md.name,
      tier: fields.tier ?? null,
      observations: fields.observations ?? null,
    };
  } catch {
    return null;
  }
}

export interface EnsurePassportResult {
  mint: string;
  tier: string;
  action: 'created' | 'updated' | 'unchanged' | 'skipped';
  txId?: string;
}

/**
 * Ensure the observer holds a Telescope Passport reflecting their current tier.
 * Creates the soulbound mint on first qualification (Observer+); on later tier-ups
 * it updates the on-chain metadata field instead of re-minting. Best-effort:
 * callers should treat failures as non-fatal.
 */
export async function ensurePassport(
  wallet: string,
  observations: number,
): Promise<EnsurePassportResult | null> {
  const payer = feePayer();
  if (!payer) return null;

  const standing = tierForCount(observations);
  const owner = new PublicKey(wallet);
  const connection = getConnection();
  const mintKp = passportMintKeypair(wallet, payer);
  const mint = mintKp.publicKey;

  const existing = await connection.getAccountInfo(mint);

  // Below Observer: no passport. Don't create one (existing ones keep their tier).
  if (!existing && !standing.hasPassport) {
    return { mint: mint.toBase58(), tier: standing.tier.name, action: 'skipped' };
  }

  // ── Update path: passport exists, refresh tier/observations metadata ──
  if (existing) {
    const current = await getPassport(wallet);
    if (current?.tier === standing.tier.name && current?.observations === String(observations)) {
      return { mint: mint.toBase58(), tier: standing.tier.name, action: 'unchanged' };
    }
    const tx = new Transaction().add(
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority: payer.publicKey,
        field: 'tier',
        value: standing.tier.name,
      }),
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority: payer.publicKey,
        field: 'observations',
        value: String(observations),
      }),
    );
    const txId = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: 'confirmed',
    });
    return { mint: mint.toBase58(), tier: standing.tier.name, action: 'updated', txId };
  }

  // ── Create path: mint the soulbound passport ──
  const metadata: TokenMetadata = {
    mint,
    name: PASSPORT_NAME,
    symbol: PASSPORT_SYMBOL,
    uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'}/api/passport/${wallet}`,
    additionalMetadata: [
      ['tier', standing.tier.name],
      ['observations', String(observations)],
    ],
  };
  const extensions = [ExtensionType.NonTransferable, ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);
  // 4 = TLV type+length header. additionalMetadata fields are appended via
  // updateField after init, each realloc needs rent — fund with headroom so the
  // account is always rent-exempt at its final size.
  const metadataLen = 4 + pack(metadata).length;
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen + 256);

  // Tx1: allocate mint, init extensions (before mint), init mint, init metadata.
  const tx1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(mint, payer.publicKey, mint, TOKEN_2022_PROGRAM_ID),
    createInitializeNonTransferableMintInstruction(mint, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint, 0, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: payer.publicKey,
      mint,
      mintAuthority: payer.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    }),
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: payer.publicKey,
      field: 'tier',
      value: standing.tier.name,
    }),
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: payer.publicKey,
      field: 'observations',
      value: String(observations),
    }),
  );
  await sendAndConfirmTransaction(connection, tx1, [payer, mintKp], { commitment: 'confirmed' });

  // Tx2: create the owner's ATA, mint 1, then lock supply by removing mint authority.
  const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
  const tx2 = new Transaction().add(
    createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint, TOKEN_2022_PROGRAM_ID),
    createMintToInstruction(mint, ata, payer.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
    createSetAuthorityInstruction(mint, payer.publicKey, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID),
  );
  const txId = await sendAndConfirmTransaction(connection, tx2, [payer], { commitment: 'confirmed' });

  return { mint: mint.toBase58(), tier: standing.tier.name, action: 'created', txId };
}
