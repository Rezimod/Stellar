// @vitest-environment node
// web3.js PDA derivation needs node's ed25519 on-curve check, not jsdom's.
import { describe, it, expect } from 'vitest';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  registryPda,
  observerPda,
  observationPda,
} from '@/lib/observation-program';

const PROGRAM_ID = 't17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT';

describe('observation-program PDA derivation', () => {
  it('derives a stable registry PDA owned by the program', () => {
    const a = registryPda();
    const b = registryPda();
    expect(a.toBase58()).toBe(b.toBase58());
    // Matches the canonical registry seed under the deployed program.
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from('registry')],
      new PublicKey(PROGRAM_ID),
    );
    expect(a.toBase58()).toBe(expected.toBase58());
  });

  it('derives a deterministic observer PDA per wallet', () => {
    const wallet = Keypair.generate().publicKey.toBase58();
    expect(observerPda(wallet).toBase58()).toBe(observerPda(wallet).toBase58());
    const other = Keypair.generate().publicKey.toBase58();
    expect(observerPda(wallet).toBase58()).not.toBe(observerPda(other).toBase58());
  });

  it('treats 0x-prefixed and raw file hashes identically (dedup key)', () => {
    const hex = 'a'.repeat(40);
    expect(observationPda('0x' + hex).toBase58()).toBe(observationPda(hex).toBase58());
  });

  it('derives distinct observation PDAs for distinct file hashes', () => {
    const one = observationPda('0x' + '1'.repeat(40));
    const two = observationPda('0x' + '2'.repeat(40));
    expect(one.toBase58()).not.toBe(two.toBase58());
  });

  it('accepts non-conforming ids via fallback hashing', () => {
    // Any string still yields a valid 32-byte PDA (sha256 fallback path).
    const pda = observationPda('not-a-hex-hash');
    expect(() => new PublicKey(pda.toBase58())).not.toThrow();
  });
});
