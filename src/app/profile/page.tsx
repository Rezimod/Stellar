'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Telescope, User, ChevronRight, Globe, Bell, Moon, LogOut, X, Settings, Camera } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Button from '@/components/shared/Button';
import PageTransition from '@/components/ui/PageTransition';
import PageContainer from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import MyActiveBets from '@/components/markets/MyActiveBets';
import { Avatar } from '@/lib/avatars';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { UsernameEditor } from '@/components/profile/UsernameEditor';
import { useProfile } from '@/hooks/useProfile';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { logout } = useStellarAuth();
  const { state } = useAppState();
  const { profile, saving, update } = useProfile();
  const [authOpen, setAuthOpen] = useState(false);

  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [obsCount, setObsCount] = useState<number>(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: string; name: string } | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => () => setConfirmSignOut(false), []);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPhoto(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedPhoto]);

  const address = stellarAddress ?? state.walletAddress ?? null;

  useEffect(() => {
    if (!address) { setProfileLoaded(true); return; }
    setProfileLoaded(false);
    const refresh = () => setRetryKey((k) => k + 1);
    window.addEventListener('stellar:stars-synced', refresh);
    Promise.allSettled([
      fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
        .then(r => r.json()).then(d => setStarsBalance(d.balance)),
      getAccessToken().then(token =>
        fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
          .then(r => r.json())
          .then(d => {
            const obs = d.observations ?? [];
            setObsCount(obs.length);
          }),
      ),
    ]).then(() => setProfileLoaded(true));
    return () => window.removeEventListener('stellar:stars-synced', refresh);
  }, [address, retryKey, getAccessToken]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authenticated) {
    return (
      <PageContainer variant="content" className="py-10 flex flex-col items-center">
        <div
          className="stl-card"
          style={{ width: '100%', maxWidth: 420, padding: '36px 28px', textAlign: 'center' }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'var(--stl-bg-surface)',
            border: '1px solid var(--stl-border-regular)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={28} color="var(--stl-text-muted)" strokeWidth={1.5} />
          </div>
          <h1
            className="stl-display-lg"
            style={{ color: 'var(--stl-text-bright)', margin: '0 0 10px' }}
          >
            Your Observatory
          </h1>
          <p className="stl-body" style={{ color: 'var(--stl-text-muted)', margin: '0 0 24px' }}>
            Sign in to view your observations, Stars balance, and rank
          </p>
          <Button variant="brass" onClick={() => setAuthOpen(true)}>Sign In</Button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </PageContainer>
    );
  }

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
  const email =
    user?.email?.address ??
    (user?.linkedAccounts.find(a => a.type === 'email') as { address?: string } | undefined)?.address ??
    null;
  const fallbackName = email
    ? email.split('@')[0]
    : address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'Astronomer';
  const displayName = profile?.username && profile.username.length > 0
    ? profile.username
    : fallbackName;
  const initial = displayName[0]?.toUpperCase() ?? '✦';
  const addrShort = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const starsDisplay = profileLoaded ? starsBalance : (starsBalance || totalStars);
  const STARS_TO_GEL = 0.012;
  const gelWorth = (starsDisplay * STARS_TO_GEL).toFixed(1);
  const rank = getRank(completed.length);

  const photoDiscoveries = completed.filter(m => m.photo).map(m => ({
    key: `m-${m.id}`,
    name: m.name,
    photo: m.photo!,
    date: m.timestamp,
    txId: m.txId ?? null,
  }));

  const nodeType = (() => {
    if (obsCount >= 5 || completed.length >= 5) {
      return { type: 'advanced' as const, label: 'Advanced Node', emoji: '🛸',
        description: 'Telescope-grade contributions + environmental data',
        color: 'var(--stl-gold)', reward: '100–500 ✦ per mission',
        upgradeHint: null };
    }
    if (completed.length >= 1 || obsCount >= 1) {
      return { type: 'observer' as const, label: 'Observer Node', emoji: '🔭',
        description: 'Verified sky observations with on-chain cNFT proofs',
        color: 'var(--stl-teal)', reward: '50–250 ✦ per mission',
        upgradeHint: 'Complete 5+ missions or submit a Bortle reading to become Advanced' };
    }
    return { type: 'passive' as const, label: 'Passive Node', emoji: '📱',
      description: 'Weather confirmations + GPS location data',
      color: 'var(--text-muted)', reward: '5–25 ✦ per check-in',
      upgradeHint: 'Complete your first mission to become an Observer' };
  })();

  return (
    <PageTransition>
      {/* Lightbox */}
      {selectedPhoto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,6,18,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: 400, width: '100%', borderRadius: 'var(--stl-r-lg)', overflow: 'hidden', border: '1px solid var(--stl-border-strong)' }}
            onClick={e => e.stopPropagation()}
          >
            <Image src={selectedPhoto.photo} alt={selectedPhoto.name} width={480} height={480} className="w-full object-cover" unoptimized />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(0deg,rgba(3,6,18,0.9),transparent)' }}>
              <p style={{ color: 'var(--stl-text-bright)', fontWeight: 600, fontSize: 14, margin: 0 }}>{selectedPhoto.name}</p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(3,6,18,0.7)', border: '1px solid var(--stl-border-regular)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={13} color="var(--stl-text-muted)" />
            </button>
          </div>
        </div>
      )}

      {/* Avatar picker */}
      <AvatarPicker
        open={avatarOpen}
        current={profile?.avatar ?? null}
        initial={initial}
        saving={saving}
        onClose={() => setAvatarOpen(false)}
        onSelect={async (id) => {
          const r = await update({ avatar: id });
          if (r.ok) setAvatarOpen(false);
        }}
      />

      <PageContainer variant="content" className="py-6 pb-10 flex flex-col gap-0">

        {/* Copy-to-clipboard toast */}
        {copied && (
          <div
            key={`toast-${copied}`}
            className="toast-fade"
            role="status"
            style={{
              position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 18px', borderRadius: 999, zIndex: 100,
              background: 'var(--stl-bg-elevated)',
              border: '1px solid var(--stl-border-strong)',
              color: 'var(--stl-text-bright)', fontSize: 13, fontWeight: 500,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            Copied to clipboard
          </div>
        )}

        <PageHeader label="OBSERVATORY" title="Your profile" />

        {/* — HEADER: Avatar + Name + Address — */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 28, gap: 14 }}>
          {/* Avatar with edit overlay */}
          <button
            onClick={() => setAvatarOpen(true)}
            aria-label="Change avatar"
            style={{
              position: 'relative', width: 96, height: 96, padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer', borderRadius: '50%',
            }}
          >
            <Avatar avatarId={profile?.avatar} initial={initial} size={96} />
            <span
              aria-hidden
              style={{
                position: 'absolute', right: -2, bottom: -2,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--stl-bg-deep)',
                border: '1px solid var(--stl-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--stl-gold)',
              }}
            >
              <Camera size={13} />
            </span>
          </button>

          {/* Name editor */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <UsernameEditor
              value={profile?.username ?? null}
              fallback={fallbackName}
              saving={saving}
              onSave={(next) => update({ username: next })}
            />
            {addrShort && (
              <button
                onClick={handleCopy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <span
                  className="stl-mono-data"
                  style={{ color: 'var(--stl-text-dim)' }}
                >
                  {addrShort}
                </span>
                {copied
                  ? <Check size={12} color="var(--stl-green)" />
                  : <Copy size={12} color="var(--stl-text-dim)" />
                }
                <a
                  href={`https://explorer.solana.com/address/${address}?cluster=${cluster}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  aria-label="View on Solana Explorer"
                >
                  <ExternalLink size={12} color="var(--stl-text-dim)" />
                </a>
              </button>
            )}
          </div>
        </div>

        {/* — STATS ROW (data cards, stl-summary-grid pattern) — */}
        <div className="stl-summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
          {[
            { value: `✦ ${starsDisplay.toLocaleString()}`, label: 'Stars Earned', color: 'var(--stl-gold)', isStars: true },
            { value: String(completed.length), label: 'Missions Done', color: 'var(--stl-text-bright)', isStars: false },
            {
              value: starsDisplay > 0 ? `~${gelWorth}₾` : String(obsCount),
              label: starsDisplay > 0 ? 'Store Value' : 'NFTs Minted',
              color: 'var(--stl-green)',
              isStars: false,
            },
          ].map(s => (
            <div key={s.label} className="stl-summary-cell">
              <span className="stl-summary-label">{s.label}</span>
              {!profileLoaded && s.label !== 'Missions Done' ? (
                <Skeleton className="w-16 h-6" />
              ) : (
                <span
                  className={`stl-summary-value${s.isStars ? ' stars-amount' : ''}`}
                  style={{ color: s.color, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em' }}
                >
                  {s.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* — RANK PROGRESSION — */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="stl-mono-kicker" style={{ color: 'var(--stl-text-muted)' }}>
              Rank · {rank.name}
            </span>
            <span className="stl-mono-data" style={{ color: 'var(--stl-text-dim)' }}>
              {completed.length} missions
            </span>
          </div>
          <div style={{
            height: 4, borderRadius: 999, overflow: 'hidden',
            background: 'var(--surface-hover)',
          }}>
            <div style={{
              width: `${Math.min(100, (completed.length / Math.max(1, completed.length + 5)) * 100)}%`,
              height: '100%',
              background: 'var(--terracotta)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* — MY ACTIVE BETS — */}
        <div style={{ marginBottom: 28 }}>
          <MyActiveBets variant="compact" title="My active bets" />
        </div>

        {/* — NETWORK STATUS — */}
        <section style={{ marginBottom: 28 }} className="flex flex-col gap-3">
          <div className="stl-cat-header">
            <span className="stl-cat-name">Network Status</span>
            <Link
              href="/network"
              className="stl-mono-data"
              style={{ marginLeft: 'auto', color: 'var(--stl-green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
            >
              View network <ChevronRight size={11} />
            </Link>
          </div>
          <div className="stl-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{nodeType.emoji}</span>
              <div style={{ flex: 1 }}>
                <p
                  className="stl-mono-data"
                  style={{
                    color: nodeType.color,
                    fontWeight: 600,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  {nodeType.label}
                </p>
                <p className="stl-body-sm" style={{ color: 'var(--stl-text-muted)', margin: '4px 0 0' }}>
                  {nodeType.description}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--stl-border-soft)', border: '1px solid var(--stl-border-soft)', borderRadius: 'var(--stl-r-md)', overflow: 'hidden' }}>
              {[
                { label: 'Missions', value: String(completed.length) },
                { label: 'Observations', value: String(obsCount) },
                { label: 'Earn rate', value: nodeType.reward },
              ].map(row => (
                <div
                  key={row.label}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--stl-bg-base)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <span className="stl-summary-label">{row.label}</span>
                  <span
                    className="stl-mono-data"
                    style={{
                      color: 'var(--stl-text-bright)',
                      fontSize: 12,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            {nodeType.upgradeHint && (
              <p className="stl-body-sm" style={{ color: 'var(--stl-text-dim)', margin: 0 }}>
                {nodeType.upgradeHint}
              </p>
            )}
          </div>
        </section>

        {/* — MY DISCOVERIES — */}
        <section style={{ marginBottom: 28 }} className="flex flex-col gap-3">
          <div className="stl-cat-header">
            <span className="stl-cat-name">My Discoveries</span>
            <span className="stl-cat-count">{photoDiscoveries.length}</span>
            <Link
              href="/missions"
              className="stl-mono-data"
              style={{ marginLeft: 'auto', color: 'var(--stl-green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
            >
              View all <ChevronRight size={11} />
            </Link>
          </div>

          {photoDiscoveries.length === 0 ? (
            <div
              className="stl-card"
              style={{ padding: '28px 20px', textAlign: 'center' }}
            >
              <Telescope size={22} color="var(--stl-text-whisper)" style={{ marginBottom: 8 }} />
              <p className="stl-body-sm" style={{ color: 'var(--stl-text-dim)', margin: 0 }}>
                Complete a mission with a photo to see your discoveries
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', marginLeft: -2, paddingLeft: 2 }}>
              {photoDiscoveries.map(d => (
                <button
                  key={d.key}
                  onClick={() => setSelectedPhoto({ photo: d.photo, name: d.name })}
                  className="stl-card"
                  style={{
                    flexShrink: 0, width: 160, overflow: 'hidden',
                    cursor: 'pointer', textAlign: 'left', padding: 0,
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: 110 }}>
                    <Image src={d.photo} alt={d.name} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <p
                      className="stl-row-obs-title"
                      style={{ margin: '0 0 3px', fontSize: 13 }}
                    >
                      {d.name}
                    </p>
                    <p className="stl-mono-data" style={{ color: 'var(--stl-text-dim)', margin: '0 0 8px' }}>
                      {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {d.txId ? (
                      <a
                        href={`https://explorer.solana.com/tx/${d.txId}?cluster=${cluster}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="stl-mono-data"
                        style={{
                          display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                          background: 'rgba(94, 234, 212,0.10)', border: '1px solid var(--stl-border-green)',
                          color: 'var(--stl-green)', textDecoration: 'none',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          fontSize: 9, fontWeight: 600,
                        }}
                      >
                        On-chain Proof
                      </a>
                    ) : (
                      <span
                        className="stl-mono-data"
                        style={{
                          display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                          background: 'var(--stl-bg-surface)', border: '1px solid var(--stl-border-regular)',
                          color: 'var(--stl-text-dim)',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          fontSize: 9,
                        }}
                      >
                        Local
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* — SETTINGS — */}
        <section style={{ marginBottom: 28 }} className="flex flex-col gap-3">
          <div className="stl-cat-header">
            <span className="stl-cat-name">Settings</span>
            <Link
              href="/settings"
              className="stl-mono-data"
              style={{ marginLeft: 'auto', color: 'var(--stl-green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Settings size={11} /> All settings
            </Link>
          </div>
          <div className="stl-card" style={{ overflow: 'hidden', padding: 0 }}>
            <Link
              href="/settings#language"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--stl-border-soft)' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(232, 130, 107,0.08)', border: '1px solid rgba(232, 130, 107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={15} color="var(--terracotta)" />
              </div>
              <p style={{ color: 'var(--stl-text-bright)', fontSize: 14, fontWeight: 500, margin: 0, flex: 1, fontFamily: 'var(--font-display)' }}>Language</p>
              <span className="stl-mono-data" style={{ color: 'var(--stl-text-muted)' }}>EN / KA</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>
            <Link
              href="/settings#notifications"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--stl-border-soft)' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(232, 130, 107,0.08)', border: '1px solid var(--stl-border-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={15} color="var(--stl-gold)" />
              </div>
              <p style={{ color: 'var(--stl-text-bright)', fontSize: 14, fontWeight: 500, margin: 0, flex: 1, fontFamily: 'var(--font-display)' }}>Notifications</p>
              <span className="stl-mono-data" style={{ color: 'var(--stl-text-muted)' }}>On</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>
            <Link
              href="/settings#appearance"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(232, 130, 107,0.10)', border: '1px solid rgba(232, 130, 107,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Moon size={15} color="var(--stl-lilac)" />
              </div>
              <p style={{ color: 'var(--stl-text-bright)', fontSize: 14, fontWeight: 500, margin: 0, flex: 1, fontFamily: 'var(--font-display)' }}>Appearance</p>
              <span className="stl-mono-data" style={{ color: 'var(--stl-text-muted)' }}>Dark / Day</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>
          </div>
        </section>

        {/* — SIGN OUT — */}
        <button
          onClick={confirmSignOut ? logout : () => setConfirmSignOut(true)}
          style={{
            width: '100%', maxWidth: 320, margin: '0 auto',
            padding: '10px 20px', borderRadius: 999,
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'transparent',
            border: `1px solid ${confirmSignOut ? 'var(--stl-border-strong)' : 'var(--stl-border-regular)'}`,
            color: confirmSignOut ? 'var(--stl-text-bright)' : 'var(--stl-text-muted)',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.02em',
          }}
        >
          <LogOut size={14} />
          {confirmSignOut ? 'Confirm sign out?' : t('signOut')}
        </button>

        {confirmSignOut && (
          <button
            onClick={() => setConfirmSignOut(false)}
            style={{ marginTop: 8, width: '100%', maxWidth: 320, margin: '8px auto 0', padding: '10px', borderRadius: 12, fontSize: 12, color: 'var(--stl-text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
          >
            Cancel
          </button>
        )}

      </PageContainer>
    </PageTransition>
  );
}
