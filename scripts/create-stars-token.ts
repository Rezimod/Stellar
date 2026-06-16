import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  ExtensionType,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  createInitializeNonTransferableMintInstruction,
  createInitializeMintInstruction,
} from '@solana/spl-token';

// Load .env.local (tsx doesn't load it automatically)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function setEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (regex.test(content)) return content.replace(regex, line);
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

async function main() {
  const privateKeyB58 = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!privateKeyB58) throw new Error('FEE_PAYER_PRIVATE_KEY not set in .env.local');

  const secretKey = bs58.decode(privateKeyB58);
  const feePayerKeypair = Keypair.fromSecretKey(secretKey);

  const connection = new Connection(
    process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
    'confirmed',
  );

  console.log('Creating Stars Token-2022 (NonTransferable) mint...');
  // NonTransferable = a closed loyalty economy: points can be minted (earned) and
  // burned (spent) but never transferred between wallets. 0 decimals; no freeze
  // authority. Mint authority is STARS_MINT_AUTHORITY when set (a dedicated key,
  // kept separate from the hot fee payer for mainnet); otherwise the fee payer
  // (fine for devnet). The server signs mintTo with the matching private key —
  // see getStarsMintAuthority() in src/lib/stars.ts.
  const mintAuthority = process.env.STARS_MINT_AUTHORITY
    ? new PublicKey(process.env.STARS_MINT_AUTHORITY)
    : feePayerKeypair.publicKey;
  console.log('Mint authority:', mintAuthority.toBase58(),
    process.env.STARS_MINT_AUTHORITY ? '(dedicated STARS_MINT_AUTHORITY)' : '(fee payer — devnet default)');
  const mintKeypair = Keypair.generate();
  const extensions = [ExtensionType.NonTransferable];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: feePayerKeypair.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // NonTransferable must be initialized BEFORE the mint itself.
    createInitializeNonTransferableMintInstruction(mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0,
      mintAuthority,
      null,
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  await sendAndConfirmTransaction(connection, tx, [feePayerKeypair, mintKeypair], {
    commitment: 'confirmed',
  });

  const mintAddress = mintKeypair.publicKey.toBase58();
  console.log('Stars Token-2022 mint created:', mintAddress);

  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  envContent = setEnvVar(envContent, 'STARS_TOKEN_MINT', mintAddress);
  fs.writeFileSync(envPath, envContent);

  console.log('\n=== Done ===');
  console.log(`STARS_TOKEN_MINT=${mintAddress}`);
  console.log('.env.local updated');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
