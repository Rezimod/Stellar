'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Copy, Check, ExternalLink, Telescope, Star, Award, CreditCard, Wallet, ShoppingBag, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import { getStarsBalance } from '@/lib/solana';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tNav = useTranslations('nav');
  const { authenticated, ready, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { state, reset } = useAppState();

  const [balance, setBalance] = useState<number | null>(null);
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [cardMsgVisible, setCardMsgVisible] = useState(false);

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) return;
    setBalance(null);
    try {
      const pubkey = new PublicKey(address);
      const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
      conn.getBalance(pubkey)
        .then(bal => setBalance(bal / 1_000_000_000))
        .catch(() => setBalance(0));
    } catch {
      setBalance(0);
    }
    getStarsBalance(address).then(setStarsBalance).catch(() => {});
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
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20 animate-page-enter text-center">
        <Card className="p-6 sm:p-8 max-w-md mx-auto">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-pulse"
            style={{
              background: 'rgba(255,209,102,0.08)',
              border: '1px solid rgba(255,209,102,0.15)',
              boxShadow: '0 0 20px rgba(255,209,102,0.1)',
            }}
          >
            <Telescope size={26} className="text-[#FFD166]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {t('signUpPrompt')}
          </h2>
          <p className="text-slate-500 text-xs mb-2">{t('signInSubtitle')}</p>
          <p className="text-slate-400 text-sm mb-6">{t('noDiscoveries')}</p>
          <Button variant="brass" onClick={login} className="w-full">{t('signUpCta')}</Button>
        </Card>
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

      {/* Balance card */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4 animate-page-enter"
        style={{
          background: 'linear-gradient(135deg, rgba(56,240,255,0.08) 0%, rgba(15,31,61,0.6) 100%)',
          border: '1px solid rgba(56,240,255,0.2)',
          animationDelay: '0ms',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">{t('balance')}</p>
            {balance === null ? (
              <p className="text-3xl font-bold text-white/30 animate-pulse mt-0.5">···</p>
            ) : (
              <p className="text-3xl font-bold text-white animate-page-enter">{balance.toFixed(3)} <span className="text-[#38F0FF] text-xl">SOL</span></p>
            )}
            <p className="text-slate-600 text-xs mt-0.5">{t('devnet')}</p>
          </div>
          {addrShort && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#38F0FF]/70 bg-[#38F0FF]/5 px-2.5 py-1.5 rounded-lg border border-[#38F0FF]/10">
              <Wallet size={10} />
              {addrShort}
            </div>
          )}
        </div>

        {/* Wallet address row */}
        {address && (
          <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.2)] rounded-xl px-3 py-2.5">
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
        )}

        {/* Fund buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
            onClick={() => { setCardMsgVisible(true); setTimeout(() => setCardMsgVisible(false), 2500); }}
          >
            <CreditCard size={14} />
            {cardMsgVisible ? 'Coming soon' : t('addViaCard')}
          </button>
          <button
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={handleCopy}
          >
            <Wallet size={14} />
            {t('sendCrypto')}
          </button>
        </div>
      </div>

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
