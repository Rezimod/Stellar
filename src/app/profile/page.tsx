'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Telescope, Star, Award, Camera, Lock, ChevronRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import StarsRedemption from '@/components/shared/StarsRedemption';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { authenticated, ready, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { state, reset } = useAppState();

  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [obsCount, setObsCount] = useState<number>(0);
  const [obsStreak, setObsStreak] = useState<number>(0);
  const [timedOut, setTimedOut] = useState(false);
  const [recentObs, setRecentObs] = useState<{ id: string; target: string; confidence: string; stars: number; created_at: string }[]>([]);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});
    fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(d => {
        const obs = d.observations ?? [];
        setObsCount(obs.length);
        setRecentObs(obs.slice(0, 5));
      })
      .catch(() => {});
    fetch(`/api/streak?walletAddress=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(d => setObsStreak(d.streak ?? 0))
      .catch(() => {});
  }, [address]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await logout();
    reset();
  };

  if (!ready && !timedOut) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#FFD166] border-t-transparent animate-spin" />
      </div>
    );
  }

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
    label: m.name,
    emoji: m.emoji,
    stars: m.stars,
    date: m.timestamp,
    txId: m.txId,
  }));
  const obsItems = recentObs.map(o => ({
    key: `o-${o.id}`,
    type: 'observation' as const,
    label: o.target,
    emoji: null,
    stars: o.stars,
    date: o.created_at,
    txId: null,
  }));
  const activityFeed = [...missionItems, ...obsItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-5">

      {/* 1 — IDENTITY HEADER (social-style) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl"
            style={{ background: 'linear-gradient(135deg, #7A5FFF, #14B8A6)' }}
          >
            {initial}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-white font-bold text-lg leading-tight truncate" style={{ fontFamily: 'Georgia, serif' }}>{displayName}</p>
            <p className="text-slate-400 text-sm mt-0.5">
              {rank.icon} {rank.name}{joinDate ? ` · Joined ${joinDate}` : ''}
            </p>
          </div>
        </div>

        {/* Stats row — social style */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: completed.length, label: 'Missions' },
            { value: obsCount, label: 'Obs' },
            { value: `${starsDisplay} ✦`, label: 'Stars' },
            { value: obsStreak > 0 ? `${obsStreak}d` : '—', label: 'Streak' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <p className="text-white font-bold text-base leading-tight">{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Rank progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-xs">{rank.name}</span>
            {rank.nextRank && <span className="text-slate-600 text-xs">{rank.nextRank}</span>}
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(rank.progressPct, 4)}%`, background: 'linear-gradient(90deg, #7A5FFF, #14B8A6)' }}
            />
          </div>
        </div>

        {/* Wallet row — subtle, secondary */}
        {addrShort && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Wallet size={12} className="text-slate-600 flex-shrink-0" />
            <span className="text-slate-600 text-xs font-mono flex-1 truncate">{addrShort}</span>
            <button
              onClick={handleCopy}
              className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
              title="Copy address"
            >
              {copied ? <Check size={11} className="text-[#34d399]" /> : <Copy size={11} />}
            </button>
            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              className="text-slate-700 hover:text-slate-500 transition-colors flex-shrink-0"
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
              <div
                key={m.id}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 min-w-[80px]"
                style={{ background: 'rgba(122,95,255,0.08)', border: '1px solid rgba(122,95,255,0.15)' }}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <p className="text-white text-xs font-medium text-center leading-tight line-clamp-2 max-w-[72px]">{m.name}</p>
                <span className="text-[#FFD166] text-[10px] font-semibold">+{m.stars} ✦</span>
              </div>
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
              <div key={item.key} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: item.type === 'mission' ? 'rgba(122,95,255,0.1)' : 'rgba(20,184,166,0.1)',
                    border: `1px solid ${item.type === 'mission' ? 'rgba(122,95,255,0.2)' : 'rgba(20,184,166,0.2)'}`,
                  }}
                >
                  {item.type === 'mission'
                    ? <span className="text-sm leading-none">{item.emoji}</span>
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
  );
}
