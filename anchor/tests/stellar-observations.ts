import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StellarObservations } from "../target/types/stellar_observations";
import { assert } from "chai";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const { web3 } = anchor;

describe("stellar-observations", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .StellarObservations as Program<StellarObservations>;

  const admin = (provider.wallet as anchor.Wallet).payer;
  const oracle = Keypair.generate();
  const observer = Keypair.generate().publicKey;

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    program.programId
  );
  const observerPda = (obs: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("observer"), obs.toBuffer()],
      program.programId
    )[0];
  const obsPda = (fileHash: Buffer) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("obs"), fileHash],
      program.programId
    )[0];

  const fh = (n: number) => Buffer.alloc(20, n); // 20-byte file hash
  const h32 = (n: number) => Array.from(Buffer.alloc(32, n));

  const baseArgs = (fileHash: Buffer) => ({
    observer,
    fileHash: Array.from(fileHash),
    targetCode: 1, // planet
    identifiedHash: h32(7),
    confidence: 3, // high
    latMicro: 41_716_700, // ~Tbilisi
    lonMicro: 44_783_300,
    observedAt: new anchor.BN(Math.floor(Date.now() / 1000)),
    oracleHash: h32(9),
    cloudCover: 12,
    starsAwarded: 80,
  });

  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      oracle.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  });

  it("initializes the registry", async () => {
    await program.methods
      .initializeRegistry(oracle.publicKey)
      .accounts({ admin: admin.publicKey })
      .rpc();

    const r = await program.account.registry.fetch(registryPda);
    assert.ok(r.admin.equals(admin.publicKey));
    assert.ok(r.oracleAuthority.equals(oracle.publicKey));
    assert.equal(r.paused, false);
    assert.equal(r.totalObservations.toNumber(), 0);
  });

  it("records an observation (oracle-signed) and upserts the profile", async () => {
    const fileHash = fh(1);
    await program.methods
      .recordObservation(baseArgs(fileHash))
      .accounts({ oracleAuthority: oracle.publicKey })
      .signers([oracle])
      .rpc();

    const obs = await program.account.observation.fetch(obsPda(fileHash));
    assert.ok(obs.observer.equals(observer));
    assert.equal(obs.confidence, 3);
    assert.equal(obs.starsAwarded, 80);
    assert.equal(obs.revoked, false);

    const profile = await program.account.observerProfile.fetch(
      observerPda(observer)
    );
    assert.equal(profile.totalObservations.toNumber(), 1);
    assert.equal(profile.totalStars.toNumber(), 80);

    const r = await program.account.registry.fetch(registryPda);
    assert.equal(r.totalObservations.toNumber(), 1);
  });

  it("rejects a duplicate file hash (on-chain dedup)", async () => {
    const fileHash = fh(1); // same as above
    try {
      await program.methods
        .recordObservation(baseArgs(fileHash))
        .accounts({ oracleAuthority: oracle.publicKey })
        .signers([oracle])
        .rpc();
      assert.fail("duplicate should have thrown");
    } catch (e) {
      // PDA already in use → init fails
      assert.ok(String(e).length > 0);
    }
  });

  it("rejects a non-oracle signer", async () => {
    const rogue = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      rogue.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
    try {
      await program.methods
        .recordObservation(baseArgs(fh(2)))
        .accounts({ oracleAuthority: rogue.publicKey })
        .signers([rogue])
        .rpc();
      assert.fail("rogue signer should have thrown");
    } catch (e) {
      assert.match(String(e), /Unauthorized|has_one|ConstraintHasOne/);
    }
  });

  it("blocks recording while paused, then resumes", async () => {
    await program.methods
      .setPaused(true)
      .accounts({ admin: admin.publicKey })
      .rpc();
    try {
      await program.methods
        .recordObservation(baseArgs(fh(3)))
        .accounts({ oracleAuthority: oracle.publicKey })
        .signers([oracle])
        .rpc();
      assert.fail("paused registry should reject");
    } catch (e) {
      assert.match(String(e), /RegistryPaused|paused/i);
    }
    await program.methods
      .setPaused(false)
      .accounts({ admin: admin.publicKey })
      .rpc();
    await program.methods
      .recordObservation(baseArgs(fh(3)))
      .accounts({ oracleAuthority: oracle.publicKey })
      .signers([oracle])
      .rpc();
    const profile = await program.account.observerProfile.fetch(
      observerPda(observer)
    );
    assert.equal(profile.totalObservations.toNumber(), 2);
  });

  it("revokes an observation and rolls back counters", async () => {
    const fileHash = fh(1);
    await program.methods
      .revokeObservation(Array.from(fileHash))
      .accounts({ oracleAuthority: oracle.publicKey })
      .signers([oracle])
      .rpc();

    const obs = await program.account.observation.fetch(obsPda(fileHash));
    assert.equal(obs.revoked, true);

    const profile = await program.account.observerProfile.fetch(
      observerPda(observer)
    );
    assert.equal(profile.revokedCount, 1);
    assert.equal(profile.totalObservations.toNumber(), 1); // 2 recorded - 1 revoked
    assert.equal(profile.totalStars.toNumber(), 80); // 160 recorded - 80 revoked
  });
});
