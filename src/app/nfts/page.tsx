'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { Telescope, Satellite, ExternalLink, Lock } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Link from 'next/link';
import Image from 'next/image';
import PageTransition from '@/components/ui/PageTransition';
import StaggerChildren from '@/components/ui/StaggerChildren';
import { Skeleton } from '@/components/ui/Skeleton';
import { REWARDS, MISSION_REWARD_HINTS } from '@/lib/rewards';
import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { CompletedMission } from '@/lib/types';
import PageContainer from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { getRarityInfo } from '@/lib/nft-rarity';

interface NftAttribute {
  trait_type: string;
  value: string | number;
}

interface NftAsset {
  id: string;
  photo?: string;
  _method?: 'onchain' | 'simulated';
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

function buildExplorerUrl(id: string): string {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
  // Transaction signatures are 64–88 base58 chars; addresses are 32–44
  const path = id.length > 50 ? 'tx' : 'address';
  return `https://explorer.solana.com/${path}/${id}?cluster=${cluster}`;
}

function localToNftAsset(m: CompletedMission): NftAsset {
  // Trust the stored method flag; fall back to txId shape for older completions.
  // Demo missions now produce real on-chain signatures, so they're treated like any other mint.
  const fallbackMethod = m.method ?? (m.txId.startsWith('sim') || m.txId.startsWith('gallery_') ? 'simulated' : 'onchain');
  return {
    id: m.txId,
    photo: m.photo,
    _method: fallbackMethod,
    content: {
      metadata: {
        name: `Stellar: ${m.name}`,
        attributes: [
          { trait_type: 'Mission-ID', value: m.id },
          { trait_type: 'Target', value: m.name },
          { trait_type: 'Date', value: new Date(m.timestamp).toISOString().split('T')[0] },
          { trait_type: 'Location', value: `${m.latitude.toFixed(2)}, ${m.longitude.toFixed(2)}` },
          { trait_type: 'Cloud Cover', value: `${m.sky?.cloudCover ?? 0}%` },
          { trait_type: 'Oracle Hash', value: m.sky?.oracleHash ?? '' },
          { trait_type: 'Stars Earned', value: m.stars },
        ],
      },
    },
  };
}

function NftDetailOverlay({ nft, onClose, onRetryMint, retrying }: { nft: NftAsset; onClose: () => void; onRetryMint?: () => void; retrying?: boolean }) {
  const attrs = nft.content?.metadata?.attributes;
  const name = nft.content?.metadata?.name ?? 'Stellar Observation';
  const target = getAttr(attrs, 'Target') || name.replace('Stellar: ', '') || 'Unknown';
  const date = getAttr(attrs, 'Date');
  const cloudCover = getAttr(attrs, 'Cloud Cover');
  const starCount = getAttr(attrs, 'Stars Earned') || getAttr(attrs, 'Stars');
  const loc = getAttr(attrs, 'Location') || '0, 0';
  const oracleHash = getAttr(attrs, 'Oracle Hash');
  const [lat, lon] = loc.split(',').map((s: string) => s.trim());
  const cc = cloudCover.replace('%', '') || '0';
  const ccNum = parseFloat(cc);
  const ts = date ? new Date(date).getTime() : Date.now();
  const nftImageUrl = `/api/nft-image?target=${encodeURIComponent(target)}&ts=${ts}&lat=${lat ?? 0}&lon=${lon ?? 0}&cc=${cc}&stars=${starCount || 0}`;

  const appUrl = 'https://stellarrclub.vercel.app';
  const fullImageUrl = `${appUrl}${nftImageUrl}`;
  const twitterText = encodeURIComponent(`I observed ${target} and sealed it on Solana with @StellarClub26 ✦ #Astronomy #Solana`);
  const farcasterText = encodeURIComponent(`Observed ${target} and sealed it on Solana with @StellarClub26 ✦`);

  const isDemoNft = target.toLowerCase().includes('demo') || (getAttr(attrs, 'Mission-ID') || '').startsWith('quick-') || (getAttr(attrs, 'Mission-ID') || '') === 'demo';

  const missionMatch = MISSIONS.find(m => m.name.toLowerCase() === target.toLowerCase());
  const rewardHint = missionMatch ? MISSION_REWARD_HINTS[missionMatch.id] : null;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isSimulated = nft._method === 'simulated' || nft.id.startsWith('sim');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: 'rgba(3,6,14,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative rounded-2xl overflow-hidden flex flex-col w-full max-w-lg my-8"
        style={{
          background: '#0B0E17',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          animation: 'slideUp 220ms ease-out',
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors flex-shrink-0 ml-2"
            style={{ background: 'rgba(255,255,255,0.05)', minWidth: 36, minHeight: 36 }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Observation photo — show actual captured image if available */}
        {nft.photo && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#0a0e1a',
              width: '100%',
              aspectRatio: '4 / 3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={nft.photo}
              alt="Your observation"
              style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* NFT certificate art — fallback only when no observation photo */}
        {!nft.photo && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,209,102,0.12)' }}>
            <Image
              src={nftImageUrl}
              alt={target}
              width={600}
              height={600}
              unoptimized
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        )}

        {/* Attributes grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'Target', value: target },
            { label: 'Date', value: date || 'Unknown' },
            {
              label: 'Cloud Cover',
              value: isDemoNft ? '—' : cloudCover || '—',
              color: isDemoNft ? 'rgba(255,255,255,0.6)' : ccNum < 30 ? 'var(--success)' : ccNum < 60 ? 'var(--warning)' : 'var(--error)',
            },
            { label: 'Stars Earned', value: starCount ? `✦ ${starCount}` : '—', color: 'var(--stars)' },
            { label: 'Location', value: loc },
            { label: 'Oracle Hash', value: oracleHash ? `${oracleHash.slice(0, 8)}…` : '—', mono: true },
          ].map(attr => (
            <div key={attr.label} className="card-base p-3">
              <p style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, fontFamily: 'var(--font-body)' }}>
                {attr.label}
              </p>
              <p style={{
                color: (attr as { color?: string }).color ?? 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                margin: '4px 0 0',
                fontFamily: (attr as { mono?: boolean }).mono ? 'var(--font-mono)' : 'var(--font-display)',
                wordBreak: 'break-all',
              }}>
                {attr.value}
              </p>
            </div>
          ))}
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(fullImageUrl)}`, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 0', minHeight: 44 }}
          >
            𝕏 Share
          </button>
          <button
            onClick={() => window.open(`https://warpcast.com/~/compose?text=${farcasterText}&embeds[]=${encodeURIComponent(appUrl)}`, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7', padding: '12px 0', minHeight: 44 }}
          >
            ⬡ Farcaster
          </button>
        </div>

        {/* Solana Explorer link / retry / local proof */}
        {nft.id.startsWith('sim') ? (
          <button
            onClick={onRetryMint}
            disabled={retrying || !onRetryMint}
            className="flex items-center justify-center gap-2 rounded-xl text-sm w-full"
            style={{
              background: retrying ? 'rgba(251,191,36,0.04)' : 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              color: 'var(--warning)',
              padding: '12px 0',
              minHeight: 44,
              cursor: retrying ? 'wait' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {retrying ? 'Syncing to Solana…' : 'Seal on Solana →'}
          </button>
        ) : isSimulated ? (
          <div
            className="flex items-center justify-center gap-2 rounded-xl text-sm w-full"
            style={{
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.18)',
              color: 'var(--warning)',
              padding: '12px 0',
              minHeight: 44,
            }}
          >
            Demo · local proof only
          </div>
        ) : (
          <a
            href={buildExplorerUrl(nft.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl text-sm"
            style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.15)',
              color: '#818cf8',
              textDecoration: 'none',
              padding: '12px 0',
              minHeight: 44,
            }}
          >
            <ExternalLink size={14} /> View on Solana Explorer
          </a>
        )}

        {/* Reward hint */}
        {rewardHint && (
          <div className="card-base p-4">
            <p style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Reward progress
            </p>
            <p style={{ color: 'var(--stars)', fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>
              {rewardHint}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, margin: '2px 0 0' }}>
              Redeem at astroman.ge
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function NftsPage() {
  const { getAccessToken } = usePrivy();
  const { authenticated, ready, address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const [authOpen, setAuthOpen] = useState(false);
  const [nfts, setNfts] = useState<NftAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [sort, setSort] = useState<'recent' | 'stars'>('recent');
  const [selectedNft, setSelectedNft] = useState<NftAsset | null>(null);
  const [retrying, setRetrying] = useState(false);

  const handleRetryMint = async () => {
    if (!selectedNft || !address) return;
    const mission = state.completedMissions.find(m => m.txId === selectedNft.id);
    if (!mission) return;
    setRetrying(true);
    try {
      const authToken = await getAccessToken().catch(() => null);
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          userAddress: address,
          target: mission.name,
          timestampMs: new Date(mission.timestamp).getTime(),
          lat: mission.latitude,
          lon: mission.longitude,
          cloudCover: mission.sky?.cloudCover ?? 0,
          oracleHash: mission.sky?.oracleHash ?? 'retry',
          stars: mission.stars,
        }),
      });
      if (res.ok) {
        setSelectedNft(null);
        await fetchNfts();
      }
    } finally {
      setRetrying(false);
    }
  };

  const address = stellarAddress;

  const fetchNfts = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nfts?address=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const filtered: NftAsset[] = data.items ?? [];

      setNfts(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!selectedNft) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedNft(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNft]);

  useEffect(() => {
    if (!authenticated || !address) return;
    fetchNfts();
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
  }, [authenticated, address, fetchNfts]);

  // Must be above early return — Rules of Hooks require unconditional hook calls
  const allNfts = useMemo<NftAsset[]>(() => {
    const dasIds = new Set(nfts.map(n => n.id));
    const localAssets = state.completedMissions
      .filter(m => m.status !== 'gallery' && !dasIds.has(m.txId))
      .map(localToNftAsset);
    return [...nfts, ...localAssets];
  }, [nfts, state.completedMissions]);

  if (!ready || !authenticated) {
    const demoNfts = [
      { name: 'Stellar Observation #001', target: 'Moon', date: 'Apr 9, 2026', cloudCover: '12', stars: '50' },
      { name: 'Stellar Observation #002', target: 'Jupiter', date: 'Apr 8, 2026', cloudCover: '24', stars: '75' },
      { name: 'Stellar Observation #003', target: 'Orion Nebula', date: 'Apr 7, 2026', cloudCover: '41', stars: '100' },
    ];

    return (
      <PageContainer variant="wide" className="py-6 sm:py-10 animate-page-enter flex flex-col gap-6">
        <div className="card-base p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Satellite size={22} color="var(--accent)" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, margin: 0 }}>My Observations</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '2px 0 0' }}>Sign in to view your observation NFTs.</p>
            </div>
            <button onClick={() => setAuthOpen(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12, minHeight: 36 }}>
              Sign In →
            </button>
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
          </div>
        </div>

        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'var(--font-display)' }}>Example Observations</p>
          <div className="grid grid-cols-2 gap-3">
            {demoNfts.map(nft => (
              <div key={nft.name} className="card-base overflow-hidden p-0 relative">
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1" style={{ backdropFilter: 'blur(3px)', background: 'rgba(7,11,20,0.55)' }}>
                  <Lock size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Sign in to view</span>
                </div>
                <div style={{ height: 120, background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(122,95,255,0.08))' }} />
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
      </PageContainer>
    );
  }

  // Pre-compute per-NFT stats once so sort/totals don't re-parse attributes on every render.
  const nftStats = useMemo(
    () =>
      allNfts.map((item) => {
        const attrs = item.content?.metadata?.attributes;
        const stars = parseInt(getAttr(attrs, 'Stars Earned') || getAttr(attrs, 'Stars') || '0');
        const cloud = parseFloat(getAttr(attrs, 'Cloud Cover').replace('%', '') || '100');
        return { item, stars, cloud };
      }),
    [allNfts],
  );

  const sortedNfts = useMemo(() => {
    if (sort !== 'stars') return allNfts;
    return [...nftStats].sort((a, b) => b.stars - a.stars).map((s) => s.item);
  }, [allNfts, nftStats, sort]);

  const totalStarsEarned = useMemo(
    () => nftStats.reduce((sum, s) => sum + s.stars, 0),
    [nftStats],
  );

  const bestCloud = useMemo(
    () => nftStats.reduce((best, s) => (s.cloud < best ? s.cloud : best), 100),
    [nftStats],
  );

  return (
    <>
    {selectedNft && <NftDetailOverlay nft={selectedNft} onClose={() => setSelectedNft(null)} onRetryMint={(selectedNft.id.startsWith('sim') || state.completedMissions.some(m => m.txId === selectedNft.id && m.status !== 'gallery')) ? handleRetryMint : undefined} retrying={retrying} />}
    <PageTransition>
    <PageContainer variant="wide" className="py-6 sm:py-10 flex flex-col gap-6">
      <BackButton />

      {/* Header */}
      <PageHeader
        label="YOUR DISCOVERIES"
        title="My Observations"
        subtitle="Each one sealed on Solana."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!loading && (
              <span className="badge-pill badge-muted">{allNfts.length} NFTs</span>
            )}
            {allNfts.length > 1 && (
              <div style={{ display: 'flex', gap: 4 }}>
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
        }
      />

      {/* Stats bar */}
      {!loading && allNfts.length > 0 && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Total NFTs', value: String(allNfts.length) },
            { label: 'Stars Earned', value: `✦ ${totalStarsEarned}`, gold: true },
            { label: 'Best Night', value: bestCloud < 30 ? 'Clear' : `${Math.round(bestCloud)}%`, clear: bestCloud < 30 },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: 14, textAlign: 'center',
              background: 'var(--color-bg-card-strong)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              transition: 'border-color 0.2s ease',
            }}>
              <p
                className={stat.gold ? 'stars-amount' : ''}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 19,
                  color: stat.gold ? 'var(--color-accent-gold)' : stat.clear ? 'var(--color-success)' : 'var(--text-primary)',
                  margin: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                {stat.value}
              </p>
              <p style={{
                color: 'var(--color-text-faint)', fontSize: 11, margin: '4px 0 0',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono)',
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Collection progress */}
        {(() => {
          const ownedTargets = allNfts.map(n => {
            const missionId = getAttr(n.content?.metadata?.attributes, 'Mission-ID');
            if (missionId && MISSIONS.find(m => m.id === missionId)) return missionId;
            const t = getAttr(n.content?.metadata?.attributes, 'Target');
            return MISSIONS.find(m => m.name.toLowerCase() === t.toLowerCase())?.id;
          }).filter(Boolean) as string[];
          const uniqueOwned = [...new Set(ownedTargets)];

          const celestialReward = REWARDS.find(r => r.id === 'complete-all');
          const celestialMissions = celestialReward?.requiredMissions ?? [];
          const celestialCompleted = celestialMissions.filter(id => uniqueOwned.includes(id)).length;
          const celestialTotal = celestialMissions.length;

          if (celestialTotal === 0 || celestialCompleted === 0) return null;

          return (
            <div className="card-base p-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Celestial collection
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>
                    {celestialCompleted}/{celestialTotal} observations
                  </p>
                </div>
                <p style={{
                  color: celestialCompleted === celestialTotal ? 'var(--success)' : 'var(--stars)',
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                }}>
                  {celestialCompleted === celestialTotal ? '🏆 Complete!' : `${Math.round((celestialCompleted / celestialTotal) * 100)}%`}
                </p>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-card-strong)', marginTop: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 999,
                  width: `${(celestialCompleted / celestialTotal) * 100}%`,
                  background: celestialCompleted === celestialTotal
                    ? 'var(--color-success)'
                    : 'var(--gradient-gold)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
              {celestialCompleted < celestialTotal && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {celestialMissions.map(mId => {
                    const m = MISSIONS.find(ms => ms.id === mId);
                    if (!m) return null;
                    const owned = uniqueOwned.includes(mId);
                    return (
                      <span
                        key={mId}
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: owned ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${owned ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          color: owned ? 'var(--success)' : 'var(--text-muted)',
                        }}
                      >
                        {owned ? '✓ ' : ''}{m.emoji} {m.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-3">Could not load — try again</p>
          <button onClick={fetchNfts} className="text-teal-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && allNfts.length === 0 && (
        <div style={{ padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <Telescope size={44} color="rgba(255,255,255,0.45)" strokeWidth={1.4} />
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--text-primary)', margin: 0 }}>
            Your observatory awaits
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, maxWidth: 320 }}>
            Complete a sky mission to seal your first discovery on-chain.
          </p>
          <Link href="/missions" className="btn-primary" style={{ textDecoration: 'none', marginTop: 8 }}>
            Start a mission →
          </Link>
        </div>
      )}

      {/* NFT Grid */}
      {!loading && !error && allNfts.length > 0 && (
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
            const rarityStr = getAttr(attrs, 'Rarity') || 'Common';
            const rarity = getRarityInfo(rarityStr);

            return (
              <div
                key={item.id}
                className="nft-card overflow-hidden p-0"
                style={{
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s',
                  cursor: 'pointer',
                  background: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-xl)',
                  border: rarity.rarity === 'Common'
                    ? '1px solid var(--color-border-subtle)'
                    : `1px solid ${rarity.color}40`,
                  boxShadow: rarity.rarity === 'Celestial' ? `0 0 24px ${rarity.color}20` : undefined,
                }}
                onClick={() => setSelectedNft(item)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedNft(item); }}
                role="button"
                tabIndex={0}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-card-hover)';
                  if (rarity.rarity === 'Common') {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-medium)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-card)';
                  if (rarity.rarity === 'Common') {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-subtle)';
                  }
                }}
              >
                {/* Framed image area — dark inner panel with playful tilt on hover */}
                <div style={{
                  position: 'relative', width: 'calc(100% - 16px)', height: 160, margin: 8,
                  background: 'var(--color-bg-card-strong)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}>
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={target}
                      className="nft-planet"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).src = nftImageUrl; }}
                    />
                  ) : (
                    <Image
                      src={nftImageUrl}
                      alt={target}
                      fill
                      unoptimized
                      className="nft-planet"
                      style={{ objectFit: 'contain' }}
                      loading="lazy"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/placeholder-nft.svg'; }}
                    />
                  )}
                </div>

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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                    {rarity.rarity !== 'Common' && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 9999,
                          background: `${rarity.color}15`,
                          border: `1px solid ${rarity.color}40`,
                          color: rarity.color,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                        }}
                      >
                        {rarity.glyph} {rarity.label}
                      </span>
                    )}
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

                  {/* Explorer link — only shown when on-chain */}
                  {!item.id.startsWith('sim') && item._method !== 'simulated' && (
                    <a
                      href={buildExplorerUrl(item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
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
                  )}
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
    </PageContainer>
    </PageTransition>
    </>
  );
}
