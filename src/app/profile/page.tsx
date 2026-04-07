'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Copy, Check, ExternalLink, Telescope, Star, Award } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { authenticated, ready, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { reset } = useAppState();

  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const address = wallets[0]?.address ?? null;

  useEffect(() => {
    if (!address) return;
    setBalance(null);
    const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
    conn.getBalance(new PublicKey(address))
      .then(bal => setBalance(bal / 1_000_000_000))
      .catch(() => setBalance(0));
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
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)' }}
          >
            <Telescope size={26} className="text-[#FFD166]" />
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold text-white mb-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {t('signUpPrompt')}
          </h2>
          <p className="text-slate-400 text-sm mb-6">{t('noDiscoveries')}</p>
          <Button variant="brass" onClick={login} className="w-full">
            {t('signUpCta')}
          </Button>
        </Card>
      </div>
    );
  }

  const email =
    user?.email?.address ??
    (user?.linkedAccounts.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    null;

  const addrShort = address
    ? `${address.slice(0, 8)}...${address.slice(-8)}`
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-12 animate-page-enter flex flex-col gap-4">
      <h1
        className="text-2xl sm:text-3xl font-bold text-[#FFD166]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {t('title')}
      </h1>

      {/* Account */}
      {email && (
        <Card>
          <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">Account</p>
          <p className="text-slate-200 text-sm">{email}</p>
        </Card>
      )}

      {/* Wallet */}
      {address && (
        <Card glow="cyan">
          <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-2">
            {t('walletAddress')}
          </p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs text-[#38F0FF] flex-1 truncate">{addrShort}</code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-[#38F0FF] transition-colors flex-shrink-0"
            >
              {copied
                ? <Check size={12} className="text-[#34d399]" />
                : <Copy size={12} />}
              {copied ? t('copied') : t('copyAddress')}
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[var(--text-dim)] text-xs uppercase tracking-wider mb-1">
                {t('balance')}
              </p>
              {balance === null ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#38F0FF] border-t-transparent animate-spin" />
              ) : (
                <p className="text-[#38F0FF] font-semibold">{balance.toFixed(3)} SOL</p>
              )}
            </div>
            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-[#FFD166] transition-colors"
            >
              {t('viewOnExplorer')} <ExternalLink size={10} />
            </a>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Telescope size={15} className="text-[#38F0FF]" />, label: t('observations'), value: '0' },
          { icon: <Star size={15} className="text-[#FFD166]" />, label: t('rank'), value: 'Explorer' },
          { icon: <Award size={15} className="text-[#7A5FFF]" />, label: t('discoveries'), value: '0' },
        ].map(s => (
          <Card key={s.label} className="text-center !p-3">
            <div className="flex items-center justify-center mb-1">{s.icon}</div>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[var(--text-dim)] text-xs">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full mt-2 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 border border-red-500/10 transition-all"
      >
        {t('signOut')}
      </button>
    </div>
  );
}
