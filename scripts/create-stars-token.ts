import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { Keypair, Connection } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';

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

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('Creating Stars SPL token on devnet...');
  const mint = await createMint(
    connection,
    feePayerKeypair,
    feePayerKeypair.publicKey,
    null, // no freeze authority
    0    // 0 decimals
  );

  const mintAddress = mint.toBase58();
  console.log('Stars token created:', mintAddress);

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
