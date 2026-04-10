'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Telescope, Satellite, ExternalLink, Lock } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Link from 'next/link';

interface NftAttribute {
  trait_type: string;
  value: string | number;
}

interface NftAsset {
  id: string;
  content?: {
    metadata?: {
      name?: string;
      attributes?: NftAttribute[];
    };
  };
  grouping?: { group_key: string; group_value: string }[];
}

function getAttr(attrs: NftAttribute[] | undefined, key: string): string {
  return String(attrs?.find(a => a.trait_type === key)?.value ?? '');
}

function cloudCoverColor(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return 'text-white/50';
  if (n < 30) return 'text-green-400';
  if (n <= 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function NftsPage() {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const [nfts, setNfts] = useState<NftAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starsBalance, setStarsBalance] = useState<number>(0);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? null;

  const fetchNfts = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? 'https://api.devnet.solana.com';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: address,
            page: 1,
            limit: 100,
            displayOptions: { showUnverifiedCollections: true },
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: NftAsset[] = data?.result?.items ?? [];

      const collectionMint = process.env.NEXT_PUBLIC_COLLECTION_MINT_ADDRESS;
      const filtered = collectionMint
        ? items.filter(item =>
            item.grouping?.some(
              g => g.group_key === 'collection' && g.group_value === collectionMint
            )
          )
        : items;

      setNfts(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!authenticated || !address) return;
    fetchNfts();
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
  }, [authenticated, address, fetchNfts]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 rounded-full border-2 border-[#38F0FF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    const demoNfts = [
      { name: 'Stellar Observation #001', target: 'Moon', date: 'Apr 9, 2026', cloudCover: '12', cloudColor: 'text-green-400', stars: '50' },
      { name: 'Stellar Observation #002', target: 'Jupiter', date: 'Apr 8, 2026', cloudCover: '24', cloudColor: 'text-green-400', stars: '75' },
      { name: 'Stellar Observation #003', target: 'Orion Nebula', date: 'Apr 7, 2026', cloudCover: '41', cloudColor: 'text-amber-400', stars: '100' },
    ];

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-6">
        {/* Sign-in card */}
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(56,240,255,0.05), rgba(15,31,61,0.5))',
            border: '1px solid rgba(56,240,255,0.1)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(56,240,255,0.08)', border: '1px solid rgba(56,240,255,0.15)' }}
            >
              <Satellite size={22} className="text-[#38F0FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>My Observations</h2>
              <p className="text-slate-500 text-xs mt-0.5">Complete missions to mint on-chain observation NFTs.</p>
            </div>
            <button
              onClick={login}
              className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
            >
              Sign In →
            </button>
          </div>
        </div>

        {/* Demo NFT cards */}
        <div>
          <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-3">Example Observations</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {demoNfts.map(nft => (
              <div
                key={nft.name}
                className="relative rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Overlay */}
                <div className="absolute inset-0 z-10 backdrop-blur-[1px] bg-[#070B14]/50 flex flex-col items-center justify-center gap-1.5">
                  <Lock size={16} className="text-slate-400" />
                  <span className="text-slate-400 text-[11px] font-medium">Sign in to mint</span>
                </div>
                {/* Card content (dimmed) */}
                <div className="p-4 select-none pointer-events-none" aria-hidden="true">
                  <p className="text-slate-400 text-base font-semibold">{nft.name}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] text-[#38F0FF]/60">{nft.target}</span>
                    <span className="bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] text-white/30">{nft.date}</span>
                    <span className={`bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] opacity-40 ${nft.cloudColor}`}>{nft.cloudCover}% cloud</span>
                    <span className="bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] text-[#FFD166]/50">✦ {nft.stars}</span>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/[0.06]">
                    <span className="text-[10px] text-white/10">Compressed NFT</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#38F0FF]/20">
                      View on Explorer <ExternalLink size={10} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-6">
      <BackButton />
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
          My Observations
        </h1>
        {!loading && (
          <span className="bg-white/[0.06] px-2 py-0.5 rounded-full text-xs text-white/50">
            {nfts.length}
          </span>
        )}
        {starsBalance > 0 && (
          <span className="ml-auto text-[#FFD166] text-sm font-semibold">
            ✦ {starsBalance} Stars
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[#38F0FF] border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading your observations...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-slate-400 text-sm">Could not load NFTs — check your connection</p>
          <button
            onClick={fetchNfts}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && nfts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.1)' }}
          >
            <Telescope size={28} className="text-[#38F0FF]/50" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">No observations yet</p>
            <p className="text-slate-500 text-sm">Complete missions to mint your first observation NFT.</p>
          </div>
          <Link
            href="/missions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
          >
            Start a Mission →
          </Link>
        </div>
      )}

      {/* NFT Grid */}
      {!loading && !error && nfts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nfts.map(item => {
            const name = item.content?.metadata?.name ?? 'Stellar Observation';
            const attrs = item.content?.metadata?.attributes;
            const target = getAttr(attrs, 'Target');
            const date = getAttr(attrs, 'Date');
            const cloudCover = getAttr(attrs, 'Cloud Cover');
            const stars = getAttr(attrs, 'Stars');

            return (
              <div
                key={item.id}
                className="rounded-2xl p-4 transition-all hover:border-white/[0.12]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p className="text-white text-base font-semibold">{name}</p>

                {/* Attribute pills */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {target && (
                    <span className="bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] text-[#38F0FF]">
                      {target}
                    </span>
                  )}
                  {date && (
                    <span className="bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] text-white/50">
                      {date}
                    </span>
                  )}
                  {cloudCover && (
                    <span className={`bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] ${cloudCoverColor(cloudCover)}`}>
                      {cloudCover}% cloud
                    </span>
                  )}
                  {stars && (
                    <span className="bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px] text-[#FFD166]">
                      ✦ {stars}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="text-[10px] text-white/20">Compressed NFT</span>
                  <a
                    href={`https://explorer.solana.com/address/${item.id}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#38F0FF] hover:opacity-80 transition-opacity"
                  >
                    View on Explorer
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
