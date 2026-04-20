import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const RPC = process.env.SOLANA_RPC_URL!;
const STARS_MINT = new PublicKey(process.env.STARS_TOKEN_MINT!);
const FEE_PAYER_SK = bs58.decode(process.env.FEE_PAYER_PRIVATE_KEY!);
const PROGRAM_ID = new PublicKey(process.env.PREDICTION_MARKET_PROGRAM_ID!);

const IDL_PATH = path.resolve(__dirname, "..", "src", "lib", "markets", "idl.json");

interface SeedMarket {
  id: string;
  close_time: string;
  resolution_time: string;
}

function configPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  return pda;
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const feePayer = Keypair.fromSecretKey(FEE_PAYER_SK);

  const sol = await conn.getBalance(feePayer.publicKey);
  const ata = await getAssociatedTokenAddress(STARS_MINT, feePayer.publicKey, false);
  let stars = BigInt(0);
  try {
    const acc = await getAccount(conn, ata);
    stars = acc.amount;
  } catch {}

  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const provider = new AnchorProvider(conn, new Wallet(feePayer), { commitment: "confirmed" });
  const program = new Program(idl, provider) as any;
  const cfg = await program.account.config.fetch(configPda(PROGRAM_ID));
  const nextMarketId = Number(cfg.marketCounter.toString()) + 1;

  const seedPath = path.resolve(__dirname, "..", "seed_markets.json");
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const now = new Date();
  const markets: SeedMarket[] = seed.markets;
  const pastClose = markets.filter((m) => new Date(m.close_time) < now).length;
  const futureClose = markets.length - pastClose;
  const pastResolution = markets.filter((m) => new Date(m.resolution_time) < now).length;

  console.log("==== PRE-FLIGHT ====");
  console.log("Fee payer:         ", feePayer.publicKey.toBase58());
  console.log("SOL balance:       ", (sol / LAMPORTS_PER_SOL).toFixed(4), "SOL");
  console.log("Stars balance:     ", stars.toString(), "(raw, 0 decimals)");
  console.log("nextMarketId:      ", nextMarketId);
  console.log("Seed markets total:", markets.length);
  console.log("  future close:    ", futureClose, "(live)");
  console.log("  past close:      ", pastClose, "(historical replay)");
  console.log("  past resolution: ", pastResolution, "(ready for immediate resolve)");
  console.log();
  const solNeed = 4;
  const starsNeed = BigInt(markets.length * 2);
  console.log(`SOL needed (~${solNeed}):  `, sol / LAMPORTS_PER_SOL >= solNeed ? "✅ OK" : "❌ LOW");
  console.log(`Stars needed (${starsNeed}):   `, stars >= starsNeed ? "✅ OK" : "❌ LOW");
}

main().catch((e) => { console.error(e); process.exit(1); });
