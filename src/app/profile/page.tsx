'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Telescope, Star, Award, ShoppingBag, ChevronRight, Camera, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import StarsRedemption from '@/components/shared/StarsRedemption';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tNav = useTranslations('nav');
  const { authenticated, ready, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { state, reset } = useAppState();

  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const [obsCount, setObsCount] = useState<number | null>(null);
  const [obsStreak, setObsStreak] = useState<number | null>(null);
  const [recentObs, setRecentObs] = useState<{ id: string; target: string; confidence: string; stars: number; created_at: string }[]>([]);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance)).catch(() => {});

    fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(d => {
        const obs = d.observations ?? [];
        setObsCount(obs.length);
        setRecentObs(obs.slice(0, 3));
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

  if (!ready) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#FFD166] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-6">
        {/* Sign-in card */}
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

        {/* Preview — blurred mock profile */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-[#070B14]/50 flex flex-col items-center justify-center gap-2 rounded-2xl">
            <Lock size={18} className="text-slate-400" />
            <span className="text-slate-400 text-xs font-medium">Sign in to unlock your profile</span>
          </div>
          <div className="p-5 select-none pointer-events-none" aria-hidden="true">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-700 text-xs uppercase tracking-wider mb-1">Your Stars</p>
                <p className="text-3xl font-bold text-[#FFD166]/20">— <span className="text-xl">✦</span></p>
              </div>
              <div className="text-right">
                <p className="text-slate-700 text-xs uppercase tracking-wider mb-1">Rank</p>
                <p className="text-slate-600 text-sm font-semibold">Stargazer</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(['Observations', 'Stars ✦', 'NFTs'] as const).map(label => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-slate-700 text-base font-bold">??</p>
                  <p className="text-slate-800 text-xs">{label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-slate-700 text-[11px] uppercase tracking-wider mb-2">Recent Missions</p>
              {[{ name: 'The Moon', stars: 50 }, { name: 'Jupiter', stars: 75 }, { name: 'Orion Nebula', stars: 100 }].map(m => (
                <div key={m.name} className="flex items-center gap-3 py-2 border-b border-white/[0.03]">
                  <Lock size={10} className="text-slate-800 flex-shrink-0" />
                  <p className="text-slate-700 text-sm flex-1">{m.name}</p>
                  <span className="text-slate-800 text-xs">+{m.stars} ✦</span>
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

  const addrShort = address ? `${address.slice(0, 6)}...${address.slice(-6)}` : null;
  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const rank = getRank(completed.length);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#FFD166]" style={{ fontFamily: 'Georgia, serif' }}>
        {t('title')}
      </h1>

      {/* Stars card */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4 animate-page-enter"
        style={{
          background: 'linear-gradient(135deg, rgba(255,209,102,0.1) 0%, rgba(15,31,61,0.6) 100%)',
          border: '1px solid rgba(255,209,102,0.25)',
          animationDelay: '0ms',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">Your Stars</p>
            <p className="text-4xl font-bold text-[#FFD166]">{starsBalance || totalStars} <span className="text-2xl">✦</span></p>
            <p className="text-slate-500 text-xs mt-1">Spend Stars for discounts at astroman.ge</p>
          </div>
          <div className="text-right">
            <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">Rank</p>
            <p className="text-white text-sm font-semibold">{rank.name}</p>
          </div>
        </div>
        <a
          href="https://astroman.ge?utm_source=stellar_profile&utm_medium=app"
          target="_blank" rel="noopener noreferrer"
          className="w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all"
          style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
        >
          Spend Stars at astroman.ge →
        </a>
      </div>

      {/* Advanced — wallet details */}
      {address && (
        <details className="mt-2">
          <summary className="text-xs text-slate-700 hover:text-slate-500 cursor-pointer py-1">
            Advanced — Wallet details
          </summary>
          <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.2)] rounded-xl px-3 py-2.5 mt-2">
            <code className="font-mono text-xs text-slate-400 flex-1 truncate">{address}</code>
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#38F0FF] transition-all duration-300 flex-shrink-0">
              {copied ? <Check size={11} className="text-[#34d399]" /> : <Copy size={11} />}
              {copied ? t('copied') : t('copyAddress')}
            </button>
            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              className="text-slate-600 hover:text-[#FFD166] transition-colors flex-shrink-0"
            >
              <ExternalLink size={11} />
            </a>
          </div>
        </details>
      )}

      {/* Account info */}
      {email && (
        <div className="animate-page-enter" style={{ animationDelay: '100ms' }}>
          <Card>
            <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">{t('accountLabel')}</p>
            <p className="text-slate-200 text-sm">{email}</p>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-page-enter" style={{ animationDelay: '200ms' }}>
        {[
          { icon: <Telescope size={15} className="text-[#38F0FF]" />, label: t('statMissions'), value: completed.length, border: 'border-t-2 border-[#38F0FF]/30' },
          { icon: <Star size={15} className="text-[#FFD166]" />, label: t('statStars'), value: `${starsBalance || totalStars} ✦`, border: 'border-t-2 border-[#FFD166]/30' },
          { icon: <Award size={15} className="text-[#7A5FFF]" />, label: t('rank'), value: rank.name, border: 'border-t-2 border-[#7A5FFF]/30' },
        ].map(s => (
          <Card key={s.label} className={`text-center !p-3 ${s.border}`}>
            <div className="flex items-center justify-center mb-1">{s.icon}</div>
            <p className="text-base font-bold text-white">{s.value}</p>
            <p className="text-[var(--text-dim)] text-xs">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Stars redemption */}
      <StarsRedemption starsBalance={starsBalance || totalStars} walletAddress={address ?? undefined} />

      {/* Observation stats */}
      {(obsCount !== null || obsStreak !== null) && (
        <div className="grid grid-cols-2 gap-3 animate-page-enter" style={{ animationDelay: '250ms' }}>
          <Card className="text-center !p-3 border-t-2 border-[#14B8A6]/30">
            <div className="flex items-center justify-center mb-1"><Camera size={15} className="text-[#14B8A6]" /></div>
            <p className="text-base font-bold text-white">{obsCount ?? '—'}</p>
            <p className="text-[var(--text-dim)] text-xs">Observations</p>
          </Card>
          <Card className="text-center !p-3 border-t-2 border-[#F59E0B]/30">
            <div className="flex items-center justify-center mb-1"><span className="text-[#F59E0B] text-sm">🔥</span></div>
            <p className="text-base font-bold text-white">{obsStreak !== null ? `${obsStreak}d` : '—'}</p>
            <p className="text-[var(--text-dim)] text-xs">Obs Streak</p>
          </Card>
        </div>
      )}

      {/* Recent observations */}
      {recentObs.length > 0 && (
        <div className="animate-page-enter" style={{ animationDelay: '280ms' }}>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-semibold">Recent Observations</p>
              <Link href="/observations" className="text-xs text-[#38F0FF] hover:underline flex items-center gap-1">
                View All <ChevronRight size={11} />
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-white/5">
              {recentObs.map(obs => (
                <div key={obs.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{obs.target}</p>
                    <p className="text-slate-600 text-xs capitalize">{obs.confidence} confidence</p>
                  </div>
                  <span className="text-[#FFD166] text-xs font-semibold flex-shrink-0">+{obs.stars} ✦</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Mission history */}
      <div className="animate-page-enter" style={{ animationDelay: '300ms' }}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">{t('missionHistory')}</p>
            <Link href="/missions" className="text-xs text-[#38F0FF] hover:underline flex items-center gap-1">
              {t('goToMissions')} <ChevronRight size={11} />
            </Link>
          </div>
          {completed.length === 0 ? (
            <div className="text-center py-6">
              <Telescope size={24} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">{t('noMissionsYet')}</p>
              <Link href="/missions" className="text-xs text-[#38F0FF] hover:underline mt-1 inline-block">
                {t('startFirstMission')}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {completed.slice(-5).reverse().map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-lg">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{m.name}</p>
                    <p className="text-slate-600 text-xs">{new Date(m.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[#FFD166] text-xs font-semibold flex-shrink-0">+{m.stars} ✦</span>
                  {m.txId && (
                    <a
                      href={`https://explorer.solana.com/tx/${m.txId}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-slate-700 hover:text-[#38F0FF] transition-colors flex-shrink-0"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Purchase history */}
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">{t('purchaseHistory')}</p>
            <Link href="/marketplace" className="text-xs text-[#38F0FF] hover:underline flex items-center gap-1">
              {tNav('marketplace')} <ChevronRight size={11} />
            </Link>
          </div>
          <div className="text-center py-6">
            <ShoppingBag size={24} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">{t('noPurchasesYet')}</p>
            <Link href="/marketplace" className="text-xs text-[#FFD166] hover:underline mt-1 inline-block">
              {t('browseCta')}
            </Link>
          </div>
        </Card>
      </div>

      {/* Danger zone */}
      <div className="animate-page-enter" style={{ animationDelay: '400ms' }}>
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
