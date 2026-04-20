/**
 * Seed markets from seed_markets.json into the on-chain program.
 *
 * For each seed market:
 *   1. Skip if slug already bound (idempotent — safe to re-run)
 *   2. createMarket(resolutionTime) as fee payer
 *   3. placeBet YES 1 + NO 1 from fee payer (in parallel per market)
 *   4. Persist slug -> marketId binding to BOTH data locations after each market
 *
 * createMarket calls are serialized because PDA derivation reads the current
 * config.marketCounter — parallel creates would collide on the same PDA.
 * Bet legs within one market run in parallel (YES + NO independent positions).
 */
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const RPC = process.env.SOLANA_RPC_URL!;
const STARS_MINT = new PublicKey(process.env.STARS_TOKEN_MINT!);
const PROGRAM_ID = new PublicKey(process.env.PREDICTION_MARKET_PROGRAM_ID!);
const FEE_PAYER_SK = bs58.decode(process.env.FEE_PAYER_PRIVATE_KEY!);

const IDL_PATH = path.resolve(__dirname, "..", "src", "lib", "markets", "idl.json");
const SEED_PATH = path.resolve(__dirname, "..", "seed_markets.json");
const BINDINGS_PATHS = [
  path.resolve(__dirname, "..", "data", "market-id-bindings.json"),
  path.resolve(__dirname, "..", "src", "data", "market-id-bindings.json"),
];
const FAILURES_PATH = path.resolve(__dirname, "..", "data", "seed-failures.json");

interface SeedMarketEntry {
  id: string;
  title: string;
  category: string;
  close_time: string;
  resolution_time: string;
}

interface SeedFile {
  markets: SeedMarketEntry[];
}

function readBindings(): Record<string, number> {
  for (const p of BINDINGS_PATHS) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
  return {};
}

function writeBindings(bindings: Record<string, number>): void {
  const json = JSON.stringify(bindings, null, 2) + "\n";
  for (const p of BINDINGS_PATHS) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, json);
  }
}

function readFailures(): Record<string, string> {
  if (!fs.existsSync(FAILURES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FAILURES_PATH, "utf8"));
}

function writeFailures(failures: Record<string, string>): void {
  fs.mkdirSync(path.dirname(FAILURES_PATH), { recursive: true });
  fs.writeFileSync(FAILURES_PATH, JSON.stringify(failures, null, 2) + "\n");
}

function configPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  return pda;
}

function marketPdas(programId: PublicKey, marketId: bigint) {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(marketId);
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), idBuf],
    programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), idBuf],
    programId,
  );
  return { marketPda, vaultPda };
}

function positionPda(programId: PublicKey, marketId: bigint, user: PublicKey) {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(marketId);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), idBuf, user.toBuffer()],
    programId,
  );
  return pda;
}

async function ensureAta(
  conn: Connection,
  payer: Keypair,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(mint, owner, false);
  const info = await conn.getAccountInfo(ata);
  if (info) return ata;
  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint),
  );
  const sig = await conn.sendTransaction(tx, [payer]);
  await conn.confirmTransaction(sig, "confirmed");
  return ata;
}

function explorer(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function createOneMarket(
  program: any,
  feePayer: Keypair,
  feePayerAta: PublicKey,
  entry: SeedMarketEntry,
): Promise<{ marketId: number; createSig: string; yesSig: string; noSig: string }> {
  const cfgPda = configPda(PROGRAM_ID);
  const cfg: any = await program.account.config.fetch(cfgPda);
  const nextId = BigInt(cfg.marketCounter.toString()) + BigInt(1);
  const { marketPda, vaultPda } = marketPdas(PROGRAM_ID, nextId);
  const resolutionTs = Math.floor(new Date(entry.resolution_time).getTime() / 1000);

  const createSig = await program.methods
    .createMarket(entry.title, new BN(resolutionTs), new BN(0))
    .accountsStrict({
      creator: feePayer.publicKey,
      config: cfgPda,
      market: marketPda,
      marketVault: vaultPda,
      tokenMint: STARS_MINT,
      creatorTokenAccount: feePayerAta,
      feeRecipientTokenAccount: feePayerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: (await import("@solana/web3.js")).SystemProgram.programId,
    })
    .rpc();

  const pos = positionPda(PROGRAM_ID, nextId, feePayer.publicKey);

  const betAccounts = {
    bettor: feePayer.publicKey,
    config: cfgPda,
    market: marketPda,
    marketVault: vaultPda,
    userPosition: pos,
    bettorTokenAccount: feePayerAta,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: (await import("@solana/web3.js")).SystemProgram.programId,
  };

  // YES then NO: same position PDA gets initialized on first call; second call
  // mutates the existing account. These cannot run in parallel without a conflict.
  const yesSig = await program.methods
    .placeBet(new BN(nextId.toString()), { yes: {} }, new BN(1))
    .accountsStrict(betAccounts)
    .rpc();

  const noSig = await program.methods
    .placeBet(new BN(nextId.toString()), { no: {} }, new BN(1))
    .accountsStrict(betAccounts)
    .rpc();

  return { marketId: Number(nextId), createSig, yesSig, noSig };
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        console.log(`    ↻ retry ${attempt}/${maxAttempts - 1} after error:`, (e as Error).message?.slice(0, 80));
        await sleep(2000);
      }
    }
  }
  throw lastErr;
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const feePayer = Keypair.fromSecretKey(FEE_PAYER_SK);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const provider = new AnchorProvider(conn, new Wallet(feePayer), { commitment: "confirmed" });
  const program = new Program(idl, provider) as any;

  const solBefore = await conn.getBalance(feePayer.publicKey);
  const feePayerAta = await ensureAta(conn, feePayer, feePayer.publicKey, STARS_MINT);
  const starsBefore = (await getAccount(conn, feePayerAta)).amount;

  console.log("=== SEED MARKETS ===");
  console.log("Fee payer:", feePayer.publicKey.toBase58());
  console.log("SOL before:", (solBefore / LAMPORTS_PER_SOL).toFixed(4));
  console.log("Stars before:", starsBefore.toString());

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as SeedFile;
  const bindings = readBindings();
  const failures = readFailures();

  let seededNow = 0;
  let existing = 0;
  let failed = 0;

  for (const entry of seed.markets) {
    if (bindings[entry.id]) {
      console.log(`[skip] ${entry.id} → market #${bindings[entry.id]} (already bound)`);
      existing++;
      continue;
    }

    try {
      const result = await withRetry(() =>
        createOneMarket(program, feePayer, feePayerAta, entry),
      );
      bindings[entry.id] = result.marketId;
      writeBindings(bindings);
      // Clear any prior failure record for this slug
      if (failures[entry.id]) {
        delete failures[entry.id];
        writeFailures(failures);
      }
      console.log(
        `[seeded] ${entry.id} → market #${result.marketId}`,
        `\n    create: ${explorer(result.createSig)}`,
        `\n    yes:    ${explorer(result.yesSig)}`,
        `\n    no:     ${explorer(result.noSig)}`,
      );
      seededNow++;
    } catch (e) {
      failed++;
      const msg = (e as Error).message?.slice(0, 300) ?? String(e);
      failures[entry.id] = msg;
      writeFailures(failures);
      console.error(`[failed] ${entry.id}:`, msg);
    }
  }

  const solAfter = await conn.getBalance(feePayer.publicKey);
  const starsAfter = (await getAccount(conn, feePayerAta)).amount;

  console.log();
  console.log("=== SUMMARY ===");
  console.log("Seeded this run:", seededNow);
  console.log("Already existed:", existing);
  console.log("Failed:         ", failed);
  console.log("SOL after:  ", (solAfter / LAMPORTS_PER_SOL).toFixed(4), `(Δ ${((solAfter - solBefore) / LAMPORTS_PER_SOL).toFixed(4)})`);
  console.log("Stars after:", starsAfter.toString(), `(Δ ${(starsAfter - starsBefore).toString()})`);
  console.log("Bindings written to:");
  for (const p of BINDINGS_PATHS) console.log("  -", p);
  if (failed > 0) {
    console.log("Failures at:", FAILURES_PATH);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
