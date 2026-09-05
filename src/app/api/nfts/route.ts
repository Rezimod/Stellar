import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Edge runtime: a base58 shape check instead of pulling web3.js into the bundle.
const BASE58_PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address || !BASE58_PUBKEY.test(address)) {
    return NextResponse.json({ error: 'valid address required' }, { status: 400 });
  }

  const endpoint = process.env.HELIUS_RPC_URL ?? process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  const collectionMint = process.env.NEXT_PUBLIC_COLLECTION_MINT_ADDRESS;
  // The gallery reads the DAS API, which only Helius serves. Without it there
  // is nothing to list — a public RPC would only fail slowly.
  if (!endpoint || !collectionMint) return NextResponse.json({ items: [] });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getAssetsByOwner',
      params: { ownerAddress: address, page: 1, limit: 100, displayOptions: { showUnverifiedCollections: true } },
    }),
  });

  if (!res.ok) return NextResponse.json({ error: 'upstream failed' }, { status: 502 });

  const data = await res.json();
  const items = data?.result?.items ?? [];

  const filtered = items.filter((item: { grouping?: { group_key: string; group_value: string; verified?: boolean }[] }) =>
    item.grouping?.some(
      (g) =>
        g.group_key === 'collection' &&
        g.group_value === collectionMint &&
        g.verified === true
    )
  );

  return NextResponse.json({ items: filtered });
}
