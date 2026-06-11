'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { Suspense, useState, useEffect } from 'react';
import {
  Copy, Check, ExternalLink, Telescope, User, ChevronRight,
  Bell, Moon, Sun, LogOut, X, Camera, Package, Trash2,
  Wallet, ShieldCheck, Mail, Sparkles, ArrowUpRight, Flame, Languages,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Button from '@/components/shared/Button';
import PageTransition from '@/components/ui/PageTransition';
import PageContainer from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/lib/avatars';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { UsernameEditor } from '@/components/profile/UsernameEditor';
import { OnChainRecord } from '@/components/profile/OnChainRecord';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Section, Row, Toggle } from '@/components/shared/SettingsList';

interface OrderRow {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  paymentMethod?: string;
  amountSol: number;
  amountStars?: number;
  amountFiat: number;
  currency: string;
  status: string;
  signature: string | null;
  createdAt: string;
  shippingCity?: string | null;
  shippingCountry?: string | null;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const t = useTranslations('profile');
  const { user, getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { logout } = useStellarAuth();
  const { state, removeMission } = useAppState();
  const { theme, setTheme } = useTheme();
  const [discoveryToDelete, setDiscoveryToDelete] = useState<string | null>(null);
  const { profile, saving, update } = useProfile();
  const [authOpen, setAuthOpen] = useState(false);

  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [lifetimeEarned, setLifetimeEarned] = useState<number>(0);
  const [lifetimeBurned, setLifetimeBurned] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: string; name: string } | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderRow[]>([]);
  const [locale, setLocale] = useState('en');

  const isLight = theme === 'light';

  useEffect(() => () => setConfirmSignOut(false), []);

  useEffect(() => {
    const c = document.cookie.split(';').find(s => s.trim().startsWith('stellar_locale='));
    if (c) setLocale(c.split('=')[1]?.trim() ?? 'en');
  }, []);

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
        .then(r => r.json()).then(d => {
          setStarsBalance(d.balance ?? 0);
          setLifetimeEarned(d.lifetimeEarned ?? 0);
          setLifetimeBurned(d.lifetimeBurned ?? 0);
        }),
      getAccessToken().then(token =>
        fetch(`/api/orders?walletAddress=${encodeURIComponent(address)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
          .then(r => r.json())
          .then(d => setOrderHistory(d.orders ?? [])),
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
          style={{
            width: '100%', maxWidth: 380,
            padding: '28px 24px',
            textAlign: 'center',
            background: 'var(--stl-bg-surface)',
            border: '1px solid var(--stl-border-regular)',
            borderRadius: 'var(--stl-r-md)',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #5EEAD4 0%, #3B82F6 100%)',
            boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={22} color="#FFFFFF" strokeWidth={2.2} />
          </div>
          <h1
            style={{
              color: 'var(--stl-text-bright)',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 500,
              margin: '0 0 8px',
            }}
          >
            Your Observatory
          </h1>
          <p
            style={{
              color: 'var(--stl-text-muted)',
              fontSize: 12,
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}
          >
            Sign in to view observations, Stars balance, and rank
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
  const totalStarsLocal = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  // Server is the source of truth; fall back to local mission sum until /api/stars-balance lands.
  const balanceDisplay = profileLoaded ? starsBalance : (starsBalance || totalStarsLocal);
  const earnedDisplay = profileLoaded ? lifetimeEarned : (lifetimeEarned || totalStarsLocal);
  const burnedDisplay = profileLoaded ? lifetimeBurned : 0;
  const rank = getRank(completed.length);
  const rankProgress = Math.min(100, (completed.length / Math.max(1, completed.length + 5)) * 100);

  // Match the discoveries page: include every non-gallery mission, generate
  // the on-chain artwork as a fallback when the user didn't attach a photo.
  const hiddenIds = new Set(state.hiddenObservationIds ?? []);
  const photoDiscoveries = state.completedMissions
    .filter(m => m.status !== 'gallery' && !hiddenIds.has(m.txId))
    .map(m => {
      const ts = new Date(m.timestamp).getTime();
      const fallback = `/api/nft-image?target=${encodeURIComponent(m.name)}&ts=${ts}&lat=${m.latitude ?? 0}&lon=${m.longitude ?? 0}&cc=${m.sky?.cloudCover ?? 0}&stars=${m.stars ?? 0}`;
      return {
        key: `m-${m.id}-${m.txId}`,
        id: m.id,
        name: m.name,
        photo: m.photo && m.photo.length > 0 ? m.photo : fallback,
        date: m.timestamp,
        txId: m.txId ?? null,
      };
    });

  const dividerColor = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';
  const hairline = isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.10)';
  const tileBorder = `1px solid ${hairline}`;
  const tileBg = isLight
    ? '#FFFFFF'
    : 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)';

  const starsRows: Array<{ icon: React.ReactNode; label: string; value: number }> = [
    { icon: <Sparkles size={15} />, label: t('balance'), value: balanceDisplay },
    { icon: <ArrowUpRight size={15} />, label: t('lifetimeEarned'), value: earnedDisplay },
    { icon: <Flame size={15} />, label: t('lifetimeBurned'), value: burnedDisplay },
  ];

  const seeAllLink = (href: string, label: string) => (
    <Link href={href} style={{
      fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      {label} <ChevronRight size={11} />
    </Link>
  );

  return (
    <PageTransition>
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
              <p style={{ color: '#F4F6FB', fontWeight: 600, fontSize: 14, margin: 0 }}>{selectedPhoto.name}</p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'var(--stl-bg-surface)', border: '1px solid var(--stl-border-regular)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={13} color="var(--stl-text-muted)" />
            </button>
          </div>
        </div>
      )}

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
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {t('copied')}
        </div>
      )}

      <PageContainer variant="content" className="py-4 pb-10">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* HEADER — centered avatar, name, rank */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0 26px' }}>
            <button
              onClick={() => setAvatarOpen(true)}
              aria-label="Change avatar"
              style={{
                position: 'relative', width: 88, height: 88, padding: 0, border: 'none',
                background: 'transparent', cursor: 'pointer', borderRadius: '50%',
              }}
            >
              <Avatar avatarId={profile?.avatar} initial={initial} size={88} />
              <span
                aria-hidden
                style={{
                  position: 'absolute', right: 0, bottom: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--stl-bg-elevated)',
                  border: '1px solid var(--stl-border-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--stars)',
                }}
              >
                <Camera size={13} />
              </span>
            </button>

            <UsernameEditor
              value={profile?.username ?? null}
              fallback={fallbackName}
              saving={saving}
              onSave={(next) => update({ username: next })}
            />

            <div style={{ width: '100%', maxWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                  color: 'var(--text-primary)',
                }}>
                  {rank.name}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {completed.length} {t('statMissions').toLowerCase()}
                </span>
              </div>
              <div style={{
                height: 4, borderRadius: 999, overflow: 'hidden',
                background: isLight ? 'rgba(15,23,42,0.10)' : 'rgba(0,0,0,0.35)',
              }}>
                <div style={{
                  width: `${rankProgress}%`,
                  height: '100%',
                  background: 'var(--stars)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          </div>

          {/* ACCOUNT — email + wallet */}
          <Section title={t('accountLabel')}>
            <Row
              icon={<Mail size={15} />}
              iconBg="rgba(255, 179, 71,0.08)"
              iconColor="var(--terracotta)"
              label={email ?? 'Add Email'}
              sublabel={email ? 'Primary email' : 'Link an email address'}
              href="/settings"
            />
            <Row
              icon={<Wallet size={15} />}
              iconBg="rgba(94, 234, 212,0.08)"
              iconColor="var(--success)"
              label={addrShort ?? t('walletAddress')}
              sublabel={t('devnet')}
              onClick={handleCopy}
              right={address ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  {copied
                    ? <Check size={14} color="var(--success)" />
                    : <Copy size={14} color="var(--text-muted)" />}
                  <a
                    href={`https://explorer.solana.com/address/${address}?cluster=${cluster}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    aria-label="View on Solana Explorer"
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={14} color="var(--text-muted)" />
                  </a>
                </span>
              ) : undefined}
              last
            />
          </Section>

          {/* STARS */}
          <Section title={t('statStars')} action={seeAllLink('/earn', 'Earn')}>
            {starsRows.map((row, i) => (
              <Row
                key={row.label}
                icon={row.icon}
                iconBg="rgba(255, 179, 71,0.08)"
                iconColor="var(--stars)"
                label={row.label}
                right={profileLoaded ? (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                    color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {row.value.toLocaleString()}
                  </span>
                ) : <Skeleton className="w-12 h-4" />}
                last={i === starsRows.length - 1}
              />
            ))}
          </Section>

          {/* ON-CHAIN RECORD — Proof of Observation registry (renders only when present) */}
          {address && (
            <div id="wallet" style={{ scrollMarginTop: 88, marginBottom: 22 }}>
              <OnChainRecord wallet={address} />
            </div>
          )}

          {/* MY DISCOVERIES */}
          <Section
            title={`${t('discoveries')} · ${photoDiscoveries.length}`}
            action={seeAllLink('/nfts', 'View all')}
          >
            {photoDiscoveries.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <Telescope size={20} color="var(--text-muted)" style={{ marginBottom: 6 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  {t('noDiscoveries')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: 12 }}>
                {photoDiscoveries.map(d => {
                  const isConfirming = discoveryToDelete === d.id;
                  return (
                    <div
                      key={d.key}
                      style={{
                        flexShrink: 0, width: 148,
                        background: tileBg,
                        border: tileBorder,
                        borderRadius: 12,
                        overflow: 'hidden', textAlign: 'left',
                        position: 'relative',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto({ photo: d.photo, name: d.name })}
                        style={{
                          display: 'block', width: '100%', padding: 0, border: 'none',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: 100 }}>
                          <Image src={d.photo} alt={d.name} fill style={{ objectFit: 'cover' }} unoptimized />
                        </div>
                        <div style={{ padding: '10px 11px 11px' }}>
                          <p style={{
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-display)',
                            fontSize: 13, fontWeight: 500, margin: '0 0 3px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {d.name}
                          </p>
                          <p style={{
                            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                            fontSize: 12, margin: 0,
                          }}>
                            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-label={isConfirming ? 'Confirm delete discovery' : 'Delete discovery'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isConfirming) {
                            removeMission(d.id);
                            setDiscoveryToDelete(null);
                          } else {
                            setDiscoveryToDelete(d.id);
                          }
                        }}
                        onBlur={() => isConfirming && setDiscoveryToDelete(null)}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          height: 24, minWidth: 24,
                          padding: isConfirming ? '0 8px' : 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          borderRadius: 999,
                          background: isConfirming ? 'var(--error)' : 'var(--stl-bg-elevated)',
                          border: `1px solid ${isConfirming ? 'var(--error)' : 'var(--stl-border-strong)'}`,
                          color: isConfirming ? '#fff' : 'var(--stl-text-bright)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}
                      >
                        <Trash2 size={10} />
                        {isConfirming && <span>Delete</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* MY PURCHASES */}
          <Section
            title={`${t('purchaseHistory')} · ${orderHistory.length}`}
            action={seeAllLink('/marketplace', 'Shop')}
          >
            {orderHistory.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <Package size={20} color="var(--text-muted)" style={{ marginBottom: 6 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  {t('noPurchasesYet')}
                </p>
              </div>
            ) : (
              orderHistory.map((o, i) => {
                const date = new Date(o.createdAt);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const isPaid = o.status === 'paid';
                const isStars = o.paymentMethod === 'stars';
                const fiatLabel = `${o.amountFiat % 1 !== 0 ? o.amountFiat.toFixed(2) : o.amountFiat.toLocaleString()} ${o.currency}`;
                const payLabel = isStars
                  ? `✦ ${(o.amountStars ?? 0).toLocaleString()}`
                  : `${o.amountSol >= 1 ? o.amountSol.toFixed(3) : o.amountSol.toFixed(4)} SOL`;
                return (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13,
                      padding: '12px 16px',
                      borderBottom: i < orderHistory.length - 1 ? `1px solid ${dividerColor}` : 'none',
                    }}
                  >
                    <div style={{
                      position: 'relative', width: 36, height: 36, borderRadius: 10,
                      overflow: 'hidden', flexShrink: 0,
                      background: tileBg,
                      border: tileBorder,
                    }}>
                      {o.productImage ? (
                        <Image src={o.productImage} alt={o.productName} fill style={{ objectFit: 'contain', padding: 4 }} unoptimized />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <Package size={14} color="var(--text-muted)" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
                        fontSize: 14, fontWeight: 500, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {o.productName}
                      </p>
                      <p style={{
                        color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                        fontSize: 11, margin: '2px 0 0',
                      }}>
                        {dateStr} · {fiatLabel} · {payLabel}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span
                        style={{
                          padding: '3px 8px', borderRadius: 999,
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.1em',
                          border: `1px solid ${isPaid ? 'var(--success)' : hairline}`,
                          color: isPaid ? 'var(--success)' : 'var(--stars)',
                        }}
                      >
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                      {o.signature && (
                        <a
                          href={`https://explorer.solana.com/tx/${o.signature}?cluster=${cluster}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                            fontSize: 11, display: 'inline-flex', alignItems: 'center',
                            gap: 3, textDecoration: 'none',
                          }}
                        >
                          tx <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Section>

          {/* SETTINGS */}
          <Section title="Settings" action={seeAllLink('/settings', 'All settings')}>
            <Row
              icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
              iconBg="rgba(255, 179, 71,0.08)"
              iconColor="var(--terracotta)"
              label={theme === 'dark' ? 'Dark Mode' : 'Day Mode'}
              sublabel={theme === 'dark' ? 'Deep space theme' : 'Bright daytime theme'}
              right={<Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />}
            />
            <Row
              icon={<Bell size={15} />}
              iconBg="rgba(255, 179, 71,0.08)"
              iconColor="var(--terracotta)"
              label="Notifications"
              sublabel="Planets, sky events, weather"
              href="/settings#notifications"
            />
            <Row
              icon={<Languages size={15} />}
              iconBg="rgba(94, 234, 212,0.08)"
              iconColor="var(--success)"
              label="Language"
              sublabel={locale === 'ka' ? 'ქართული' : 'English'}
              href="/settings"
            />
            <Row
              icon={<ShieldCheck size={15} />}
              iconBg="rgba(94, 234, 212,0.08)"
              iconColor="var(--success)"
              label="Privacy & Data"
              sublabel="Policy, terms, your data"
              href="/settings#privacy"
              last
            />
          </Section>

          {/* SIGN OUT */}
          <Section title="Account Actions">
            <Row
              icon={<LogOut size={15} />}
              iconBg="rgba(251, 113, 133,0.06)"
              iconColor="var(--error)"
              label={confirmSignOut ? 'Confirm sign out?' : t('signOut')}
              onClick={() => {
                if (confirmSignOut) logout();
                else setConfirmSignOut(true);
              }}
              danger
              last
            />
          </Section>

          {confirmSignOut && (
            <button
              onClick={() => setConfirmSignOut(false)}
              style={{
                display: 'block', margin: '-12px auto 0',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-muted)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '6px 12px',
                letterSpacing: '0.05em',
              }}
            >
              Cancel
            </button>
          )}

        </div>
      </PageContainer>
    </PageTransition>
  );
}
