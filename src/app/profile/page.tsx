'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Telescope, Camera, Lock, ChevronRight, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import StarsRedemption from '@/components/shared/StarsRedemption';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import PageTransition from '@/components/ui/PageTransition';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { state, reset } = useAppState();

  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [obsCount, setObsCount] = useState<number>(0);
  const [obsStreak, setObsStreak] = useState<number>(0);
  const [recentObs, setRecentObs] = useState<{ id: string; target: string; confidence: string; stars: number; created_at: string }[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: string; name: string } | null>(null);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhoto(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedPhoto]);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) return;
    setProfileLoaded(false);
    Promise.allSettled([
      fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
        .then(r => r.json()).then(d => setStarsBalance(d.balance)),
      fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address)}`)
        .then(r => r.json())
        .then(d => {
          const obs = d.observations ?? [];
          setObsCount(obs.length);
          setRecentObs(obs.slice(0, 5));
        }),
      fetch(`/api/streak?walletAddress=${encodeURIComponent(address)}`)
        .then(r => r.json())
        .then(d => setObsStreak(d.streak ?? 0)),
    ]).finally(() => setProfileLoaded(true));
  }, [address]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await logout();
  };

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)' }}
            >
              <Telescope size={22} className="text-[#FFD166]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>{t('signUpPrompt')}</h2>
              <p className="text-slate-500 text-xs mt-0.5">{t('noDiscoveries')}</p>
            </div>
            <Button variant="brass" onClick={login} className="flex-shrink-0 !text-sm !px-4 !py-2">Sign In</Button>
          </div>
        </Card>

        {/* Blurred preview */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-[#070B14]/50 flex flex-col items-center justify-center gap-2 rounded-2xl">
            <Lock size={18} className="text-slate-400" />
            <span className="text-slate-400 text-xs font-medium">Sign in to unlock your profile</span>
          </div>
          <div className="p-5 select-none pointer-events-none flex flex-col gap-4" aria-hidden="true">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(122,95,255,0.3), rgba(20,184,166,0.2))' }} />
              <div className="flex-1">
                <div className="h-4 w-28 rounded bg-slate-800 mb-1.5" />
                <div className="h-3 w-20 rounded bg-slate-800/60 mb-1" />
                <div className="h-3 w-16 rounded bg-slate-800/40" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {['Missions', 'Stars', 'Streak'].map(l => (
                <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-slate-700 text-base font-bold">—</p>
                  <p className="text-slate-800 text-xs">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const email =
    user?.email?.address ??
    (user?.linkedAccounts.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    null;

  const displayName = email ? email.split('@')[0] : address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'Astronomer';
  const initial = displayName[0]?.toUpperCase() ?? '✦';
  const addrShort = address ? `${address.slice(0, 6)}...${address.slice(-6)}` : null;
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const starsDisplay = starsBalance || totalStars;
  const rank = getRank(completed.length);

  const missionItems = completed.map(m => ({
    key: `m-${m.id}`,
    type: 'mission' as const,
    id: m.id,
    label: m.name,
    photo: m.photo,
    stars: m.stars,
    date: m.timestamp,
    txId: m.txId,
  }));
  const obsItems = recentObs.map(o => ({
    key: `o-${o.id}`,
    type: 'observation' as const,
    id: o.id,
    label: o.target,
    photo: null,
    stars: o.stars,
    date: o.created_at,
    txId: null,
  }));
  const activityFeed = [...missionItems, ...obsItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <PageTransition>
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-5">
      <style>{`@keyframes nft-pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }`}</style>

      {/* Photo lightbox modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(7,11,20,0.92)' }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-sm w-full rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(122,95,255,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={selectedPhoto.photo}
              alt={selectedPhoto.name}
              width={480}
              height={480}
              className="w-full object-cover"
              unoptimized
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(0deg, rgba(7,11,20,0.9) 0%, transparent 100%)' }}
            >
              <p className="text-white text-sm font-semibold">{selectedPhoto.name}</p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(7,11,20,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <X size={13} className="text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* 1 — IDENTITY HEADER (social-style) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar with rank ring */}
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              padding: 2,
              background: rank.name === 'Celestial'
                ? 'linear-gradient(135deg, #FFD166, #F59E0B)'
                : rank.name === 'Pathfinder'
                ? 'linear-gradient(135deg, #A855F7, #6366F1)'
                : rank.name === 'Observer'
                ? 'linear-gradient(135deg, #38F0FF, #0EA5E9)'
                : 'rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' }}>
                  {initial}
                </span>
              </div>
            </div>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{displayName}</p>
              <span
                className="badge-pill badge-accent"
                style={{ fontSize: 10, flexShrink: 0 }}
              >
                {rank.icon} {rank.name}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
              {joinDate ? `Joined ${joinDate}` : 'Astronomer'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: String(completed.length), label: 'Missions', loading: false, color: 'var(--text-primary)' },
            { value: String(obsCount), label: 'Obs', loading: !profileLoaded, color: 'var(--accent)' },
            { value: `✦ ${starsDisplay}`, label: 'Stars', loading: !profileLoaded, color: 'var(--stars)' },
            { value: obsStreak > 0 ? `${obsStreak}d` : '—', label: 'Streak', loading: !profileLoaded, color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="card-base flex flex-col items-center gap-0.5 py-3">
              {s.loading ? (
                <div
                  className="w-10 h-5 rounded-md"
                  style={{ background: 'var(--border-default)', animation: 'nft-pulse 1.5s ease-in-out infinite' }}
                />
              ) : (
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: s.color, margin: 0, lineHeight: 1.2 }}>{s.value}</p>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Rank progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-xs">{rank.name}</span>
            {rank.nextRank && <span className="text-slate-600 text-xs">{rank.nextRank}</span>}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(rank.progressPct, 4)}%`, background: 'var(--gradient-accent)' }}
            />
          </div>
          {rank.nextRank && (() => {
            const thresholds: Record<string, number> = { Observer: 1, Pathfinder: 3, Celestial: 5 };
            const needed = (thresholds[rank.nextRank] ?? 0) - completed.length;
            return needed > 0 ? (
              <p className="text-xs text-slate-500 mt-1">{needed} mission{needed !== 1 ? 's' : ''} to {rank.nextRank}</p>
            ) : null;
          })()}
        </div>

        {/* Wallet row — subtle, secondary */}
        {addrShort && (
          <div
            className="card-base flex items-center gap-2 px-3 py-2"
          >
            <Wallet size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addrShort}</span>
            <button
              onClick={handleCopy}
              style={{ color: 'var(--text-muted)', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              title="Copy address"
            >
              {copied ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
            </button>
            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              title="View on explorer"
            >
              <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>

      {/* 2 — DISCOVERIES */}
      <Card className="!p-5">
        <p className="text-white text-sm font-semibold mb-3">Discoveries</p>
        {completed.length === 0 ? (
          <Link href="/missions" className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#38F0FF] transition-colors">
            <Telescope size={15} className="flex-shrink-0" />
            <span>Complete your first mission</span>
            <ChevronRight size={13} />
          </Link>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {completed.map(m => (
              <button
                key={m.id}
                onClick={() => m.photo ? setSelectedPhoto({ photo: m.photo, name: m.name }) : undefined}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 min-w-[80px] transition-all active:scale-95"
                style={{
                  background: 'rgba(122,95,255,0.08)',
                  border: '1px solid rgba(122,95,255,0.15)',
                  cursor: m.photo ? 'pointer' : 'default',
                }}
              >
                <div className="flex items-center justify-center" style={{ height: 40 }}>
                  <MissionIcon id={m.id} size={36} />
                </div>
                <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2 max-w-[72px]">{m.name}</p>
                <span className="text-[#FFD166] text-[10px] font-semibold">+{m.stars} ✦</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 3 — RECENT ACTIVITY */}
      {activityFeed.length > 0 && (
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">Recent Activity</p>
            <Link href="/missions" className="text-xs text-[#38F0FF] hover:underline flex items-center gap-1">
              View all <ChevronRight size={11} />
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {activityFeed.map(item => (
              <div
                key={item.key}
                className="flex items-center gap-3 py-2.5"
                onClick={() => item.type === 'mission' && item.photo ? setSelectedPhoto({ photo: item.photo, name: item.label }) : undefined}
                style={{ cursor: item.type === 'mission' && item.photo ? 'pointer' : 'default' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: item.type === 'mission' ? 'rgba(122,95,255,0.1)' : 'rgba(20,184,166,0.1)',
                    border: `1px solid ${item.type === 'mission' ? 'rgba(122,95,255,0.2)' : 'rgba(20,184,166,0.2)'}`,
                  }}
                >
                  {item.type === 'mission'
                    ? <MissionIcon id={item.id} size={16} />
                    : <Camera size={12} className="text-[#14B8A6]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{item.label}</p>
                  <p className="text-slate-600 text-xs">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <span className="text-[#FFD166] text-xs font-semibold flex-shrink-0">+{item.stars} ✦</span>
                {item.txId && (
                  <a
                    href={`https://explorer.solana.com/tx/${item.txId}?cluster=devnet`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-slate-700 hover:text-[#38F0FF] transition-colors flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4 — STARS REDEMPTION */}
      <StarsRedemption starsBalance={starsDisplay} walletAddress={address ?? undefined} />

      {/* SIGN OUT */}
      <div>
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-slate-700 text-xs tracking-widest">⋯</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <button
          onClick={confirmSignOut ? handleSignOut : () => setConfirmSignOut(true)}
          className={`w-full py-2.5 rounded-xl text-sm border transition-all ${
            confirmSignOut
              ? 'text-red-300 bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
              : 'text-red-400 hover:text-red-300 hover:bg-red-500/5 border-red-500/10'
          }`}
        >
          {confirmSignOut ? 'Confirm sign out?' : t('signOut')}
        </button>
      </div>
    </div>
    </PageTransition>
  );
}
