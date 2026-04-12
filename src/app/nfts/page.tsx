'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Telescope, Satellite, ExternalLink, Lock } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Link from 'next/link';
import PageTransition from '@/components/ui/PageTransition';
import StaggerChildren from '@/components/ui/StaggerChildren';
import { SkeletonGrid } from '@/components/ui/Skeleton';

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

export default function NftsPage() {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const [nfts, setNfts] = useState<NftAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [sort, setSort] = useState<'recent' | 'stars'>('recent');

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

  if (!ready || !authenticated) {
    const demoNfts = [
      { name: 'Stellar Observation #001', target: 'Moon', date: 'Apr 9, 2026', cloudCover: '12', stars: '50' },
      { name: 'Stellar Observation #002', target: 'Jupiter', date: 'Apr 8, 2026', cloudCover: '24', stars: '75' },
      { name: 'Stellar Observation #003', target: 'Orion Nebula', date: 'Apr 7, 2026', cloudCover: '41', stars: '100' },
    ];

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-6">
        <div className="card-base p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Satellite size={22} color="var(--accent)" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, margin: 0 }}>My Observations</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '2px 0 0' }}>Complete missions to mint on-chain observation NFTs.</p>
            </div>
            <button onClick={login} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12, minHeight: 36 }}>
              Sign In →
            </button>
          </div>
        </div>

        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'var(--font-display)' }}>Example Observations</p>
          <div className="grid grid-cols-2 gap-3">
            {demoNfts.map(nft => (
              <div key={nft.name} className="card-base overflow-hidden p-0 relative">
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1" style={{ backdropFilter: 'blur(2px)', background: 'rgba(7,11,20,0.5)' }}>
                  <Lock size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Sign in to mint</span>
                </div>
                <div style={{ height: 120, background: 'linear-gradient(135deg, rgba(56,240,255,0.06), rgba(122,95,255,0.08))' }} />
                <div className="p-3 select-none" aria-hidden="true">
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)' }}>{nft.name}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="badge-pill badge-accent" style={{ fontSize: 10 }}>{nft.target}</span>
                    <span className="badge-pill badge-stars" style={{ fontSize: 10 }}>✦ {nft.stars}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sortedNfts = [...nfts].sort((a, b) => {
    if (sort === 'stars') {
      const aStars = parseInt(getAttr(a.content?.metadata?.attributes, 'Stars Earned') || getAttr(a.content?.metadata?.attributes, 'Stars') || '0');
      const bStars = parseInt(getAttr(b.content?.metadata?.attributes, 'Stars Earned') || getAttr(b.content?.metadata?.attributes, 'Stars') || '0');
      return bStars - aStars;
    }
    return 0; // keep API order for recent
  });

  const totalStarsEarned = nfts.reduce((sum, item) => {
    const s = parseInt(getAttr(item.content?.metadata?.attributes, 'Stars Earned') || getAttr(item.content?.metadata?.attributes, 'Stars') || '0');
    return sum + s;
  }, 0);

  const bestCloud = nfts.reduce((best, item) => {
    const cc = parseFloat(getAttr(item.content?.metadata?.attributes, 'Cloud Cover').replace('%', '') || '100');
    return cc < best ? cc : best;
  }, 100);

  return (
    <PageTransition>
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-6">
      <BackButton />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>
          My Observations
        </h1>
        {!loading && (
          <span className="badge-pill badge-muted">{nfts.length} NFTs</span>
        )}
        {/* Sort toggle */}
        {nfts.length > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {(['recent', 'stars'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={sort === s ? 'badge-pill badge-accent' : 'badge-pill badge-muted'}
                style={{ fontSize: 11, cursor: 'pointer', border: 'none', fontFamily: 'var(--font-display)' }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {!loading && nfts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Total NFTs', value: String(nfts.length) },
            { label: 'Stars Earned', value: `✦ ${totalStarsEarned}`, gold: true },
            { label: 'Best Night', value: bestCloud < 30 ? 'Clear' : `${Math.round(bestCloud)}%`, clear: bestCloud < 30 },
          ].map(stat => (
            <div key={stat.label} className="card-base p-3 text-center">
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 18,
                color: stat.gold ? 'var(--stars)' : stat.clear ? 'var(--success)' : 'var(--text-primary)',
                margin: 0,
              }}>
                {stat.value}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && <SkeletonGrid cols={2} count={4} />}

      {/* Error */}
      {error && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Couldn&apos;t load NFTs</p>
          <button onClick={fetchNfts} className="btn-ghost" style={{ padding: '8px 20px', minHeight: 40, fontSize: 13 }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && nfts.length === 0 && (
        <div style={{ padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 60 }}>🔭</span>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--text-primary)', margin: 0 }}>
            No observations yet
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, maxWidth: 280 }}>
            Complete a sky mission to seal your first discovery on Solana
          </p>
          <Link href="/missions" className="btn-primary" style={{ textDecoration: 'none', marginTop: 8 }}>
            Start Observing →
          </Link>
        </div>
      )}

      {/* NFT Grid */}
      {!loading && !error && sortedNfts.length > 0 && (
        <StaggerChildren stagger={50} className="grid grid-cols-2 gap-3">
          {sortedNfts.map(item => {
            const name = item.content?.metadata?.name ?? 'Stellar Observation';
            const attrs = item.content?.metadata?.attributes;
            const target = getAttr(attrs, 'Target') || name.replace('Stellar: ', '') || 'Unknown';
            const date = getAttr(attrs, 'Date');
            const cloudCover = getAttr(attrs, 'Cloud Cover');
            const stars = getAttr(attrs, 'Stars Earned') || getAttr(attrs, 'Stars');
            const loc = getAttr(attrs, 'Location') || '0, 0';
            const [lat, lon] = loc.split(',').map((s: string) => s.trim());
            const cc = cloudCover.replace('%', '') || '0';
            const ts = date ? new Date(date).getTime() : Date.now();
            const nftImageUrl = `/api/nft-image?target=${encodeURIComponent(target)}&ts=${ts}&lat=${lat ?? 0}&lon=${lon ?? 0}&cc=${cc}&stars=${stars || 0}`;
            const ccNum = parseFloat(cc);

            return (
              <div
                key={item.id}
                className="card-base overflow-hidden p-0"
                style={{ transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-glow-accent)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                {/* Star map image */}
                <img
                  src={nftImageUrl}
                  alt={target}
                  style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />

                {/* Card content */}
                <div style={{ padding: 12 }}>
                  <p style={{
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </p>

                  {/* Attribute pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {target && <span className="badge-pill badge-accent" style={{ fontSize: 10 }}>{target}</span>}
                    {cloudCover && (
                      <span
                        className={`badge-pill ${ccNum < 20 ? 'badge-success' : ccNum < 50 ? 'badge-warning' : 'badge-error'}`}
                        style={{ fontSize: 10 }}
                      >
                        {ccNum < 20 ? 'Clear' : ccNum < 50 ? 'Partial' : 'Cloudy'}
                      </span>
                    )}
                    {stars && <span className="badge-pill badge-stars" style={{ fontSize: 10 }}>✦ {stars}</span>}
                  </div>

                  {/* Explorer link */}
                  <a
                    href={`https://explorer.solana.com/address/${item.id}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 8,
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} />
                    Explorer
                  </a>
                </div>
              </div>
            );
          })}
        </StaggerChildren>
      )}

      {starsBalance > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--stars)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>
          Total balance: ✦ {starsBalance} Stars
        </p>
      )}
    </div>
    </PageTransition>
  );
}
