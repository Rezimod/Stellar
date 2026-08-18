import { describe, it, expect } from 'vitest';
import { DEMO_PASS, DEMO_WALLET, isDemoMode } from '@/lib/discovery/demo';
import { parsePassId } from '@/lib/discovery/passId';
import { determineObject } from '@/lib/discovery/rarityEngine';

describe('demo pass', () => {
  // The whole point of the demo link is that it lands on the best outcome.
  // DEMO_WALLET's tail was searched for to produce exactly this draw, so if the
  // salt or the pools move, this breaks rather than quietly demoting the demo
  // to a Common star mid-recording.
  it('draws legendary TON 618', () => {
    const object = determineObject(DEMO_WALLET, DEMO_PASS);
    expect(object.rarity).toBe('LEGENDARY');
    expect(object.id).toBe('ton-618');
    expect(object.physicalReward).toBe('Full Astroman Telescope');
    expect(object.tokens).toBe(50_000);
  });

  it('is a shareable pass id', () => {
    // Not a real address, but it has to survive the same validation as one, or
    // /discovery/<id> 404s and the OG endpoint rejects it.
    expect(parsePassId(`${DEMO_WALLET}-${DEMO_PASS}`)).toEqual({
      wallet: DEMO_WALLET,
      passNumber: DEMO_PASS,
    });
  });
});

describe('isDemoMode', () => {
  it('reads the flag from explicit search params', () => {
    expect(isDemoMode('?demo=true')).toBe(true);
    expect(isDemoMode(new URLSearchParams({ demo: 'true' }))).toBe(true);
  });

  it('accepts nothing but the exact flag', () => {
    expect(isDemoMode('')).toBe(false);
    expect(isDemoMode('?demo=1')).toBe(false);
    expect(isDemoMode('?demo=false')).toBe(false);
    expect(isDemoMode('?preview=legendary')).toBe(false);
  });
});
