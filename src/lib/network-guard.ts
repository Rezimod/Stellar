import { NextResponse } from 'next/server';

// Guards value operations (mint / award / burn / transfer) against a Solana
// cluster that disagrees with the public cluster the UI and wallets use. The
// real footgun this catches: flipping NEXT_PUBLIC_SOLANA_CLUSTER to
// 'mainnet-beta' at migration but leaving SOLANA_RPC_URL pointed at (or
// defaulting to) devnet — which would silently mint real-value ops on the wrong
// network. It enforces *consistency*, not a specific network, so it is correct
// on both devnet (today) and mainnet (post-migration).

// Mirrors the devnet fallback used across the value routes.
const DEFAULT_RPC = 'https://api.devnet.solana.com';

function clusterOf(rpcUrl: string): 'devnet' | 'testnet' | 'mainnet-beta' | 'unknown' {
  const u = rpcUrl.toLowerCase();
  if (u.includes('devnet')) return 'devnet';
  if (u.includes('testnet')) return 'testnet';
  if (u.includes('mainnet')) return 'mainnet-beta';
  return 'unknown';
}

export function assertNetworkConfig(): void {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
  const effectiveRpc = process.env.SOLANA_RPC_URL ?? DEFAULT_RPC;
  const rpcCluster = clusterOf(effectiveRpc);
  // Custom/private RPC without a recognizable cluster host — can't cross-check,
  // so don't block a valid setup.
  if (rpcCluster === 'unknown') return;

  const expected = cluster === 'mainnet-beta' ? 'mainnet-beta' : cluster === 'testnet' ? 'testnet' : 'devnet';
  if (rpcCluster !== expected) {
    throw new Error(
      `Solana cluster mismatch: SOLANA_RPC_URL resolves to ${rpcCluster} but NEXT_PUBLIC_SOLANA_CLUSTER is ${cluster}. Refusing value operation.`,
    );
  }
}

// Route guard, mirrors paused(): call as the first lines of a value route.
//   const n = networkMisconfig(); if (n) return n;
export function networkMisconfig(): NextResponse | null {
  try {
    assertNetworkConfig();
    return null;
  } catch (err) {
    console.error('[network-guard]', err);
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 });
  }
}
