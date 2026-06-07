// Initializes the Proof-of-Observation registry after `anchor deploy`.
//
//   npm run setup:observations
//
// Sets the registry admin to the fee-payer wallet and the oracle authority to
// OBSERVATION_ORACLE_PRIVATE_KEY (falling back to FEE_PAYER_PRIVATE_KEY on
// devnet). Idempotent: if the registry already exists it just prints its state.

import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { AnchorProvider, BN, Program, type Idl } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import idl from '../src/lib/idl/stellar_observations.json';

// Load .env.local (tsx doesn't load it automatically).
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function nodeWallet(signer: Keypair) {
  return {
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
}

async function main() {
  const feeB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!feeB58) throw new Error('FEE_PAYER_PRIVATE_KEY not set in .env.local');

  const admin = Keypair.fromSecretKey(bs58.decode(feeB58));
  const oracleB58 = process.env.OBSERVATION_ORACLE_PRIVATE_KEY || feeB58;
  const oracleAuthority = Keypair.fromSecretKey(bs58.decode(oracleB58)).publicKey;

  const programId = new PublicKey(
    process.env.OBSERVATION_PROGRAM_ID || (idl as Idl).address!,
  );
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpc, 'confirmed');

  const provider = new AnchorProvider(connection, nodeWallet(admin) as never, {
    commitment: 'confirmed',
  });
  const programIdl = { ...(idl as Idl), address: programId.toBase58() };
  const program = new Program(programIdl as never, provider) as Program;

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    programId,
  );

  const existing = await program.account.registry.fetchNullable(registryPda);
  if (existing) {
    console.log('Registry already initialized:');
    console.log('  registry PDA      :', registryPda.toBase58());
    console.log('  admin             :', existing.admin.toBase58());
    console.log('  oracle authority  :', existing.oracleAuthority.toBase58());
    console.log('  total observations:', new BN(existing.totalObservations).toString());
    console.log('  paused            :', existing.paused);
    return;
  }

  console.log('Initializing registry...');
  console.log('  program id        :', programId.toBase58());
  console.log('  admin             :', admin.publicKey.toBase58());
  console.log('  oracle authority  :', oracleAuthority.toBase58());

  const sig = await program.methods
    .initializeRegistry(oracleAuthority)
    .accounts({ admin: admin.publicKey })
    .rpc();

  console.log('Done. tx:', sig);
  console.log('  registry PDA      :', registryPda.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
