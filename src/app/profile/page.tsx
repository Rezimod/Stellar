'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { Suspense, useState, useEffect } from 'react';
import {
  ExternalLink, Telescope, User, ChevronRight, Flag, History, Settings,
  Bell, Moon, Sun, LogOut, X, Package, Trash2,
  ShieldCheck, Gift,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { getRank, RANK_THRESHOLDS } from '@/lib/rewards';
import { PRODUCTS } from '@/lib/products';
import { computeMarketplaceStarsPrice } from '@/lib/stars-economy';
import Button from '@/components/shared/Button';
import PageTransition from '@/components/ui/PageTransition';
import PageContainer from '@/components/layout/PageContainer';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { UsernameEditor } from '@/components/profile/UsernameEditor';
import { OnChainRecord } from '@/components/profile/OnChainRecord';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Section, Row, Toggle } from '@/components/shared/SettingsList';
import { profileTokens } from '@/components/profile/profileTheme';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileSidebar, type SidebarItem } from '@/components/profile/ProfileSidebar';
import { ProgressCard } from '@/components/profile/ProgressCard';
import { EmptyStateCard } from '@/components/profile/EmptyStateCard';

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

  const switchLocale = (l: string) => {
    if (l === locale) return;
    document.cookie = `stellar_locale=${l}; path=/; max-age=31536000`;
    setLocale(l);
    window.location.reload();
  };

  if (!authenticated) {
    return (
      <PageContainer variant="content" className="py-10 flex flex-col items-center">
        <div
          style={{
            width: '100%', maxWidth: 380,
            padding: '28px 24px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 20,
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #5EEAD4 0%, #3B82F6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={22} color="#FFFFFF" strokeWidth={2.2} />
          </div>
          <h1
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            {t('title')}
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}
          >
            {t('signUpPrompt')}
          </p>
          <Button variant="brass" onClick={() => setAuthOpen(true)}>{t('signUpCta')}</Button>
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
  const dateLocale = locale === 'ka' ? 'ka-GE' : 'en-US';

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStarsLocal = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  // Server is the source of truth; fall back to local mission sum until /api/stars-balance lands.
  const balanceDisplay = profileLoaded ? starsBalance : (starsBalance || totalStarsLocal);
  const earnedDisplay = profileLoaded ? lifetimeEarned : (lifetimeEarned || totalStarsLocal);
  const burnedDisplay = profileLoaded ? lifetimeBurned : 0;
  const rank = getRank(completed.length);

  // Real catalog teaser: cheapest in-stock products priced in Stars vs balance.
  const giftCandidates = PRODUCTS
    .filter(p => p.inStock)
    .map(p => ({ id: p.id, image: p.image, stars: computeMarketplaceStarsPrice(p.priceGEL, 'GEL') }))
    .sort((a, b) => a.stars - b.stars);
  const giftsWithinReach = giftCandidates.filter(g => g.stars <= balanceDisplay).length;
  const giftPreview = giftCandidates.slice(0, 4);

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

  const tk = profileTokens(isLight);
  const { hairline, divider: dividerColor } = tk;
  const cardBg = isLight ? '#FFFFFF' : 'var(--surface)';
  const clusterLabel = cluster.startsWith('mainnet') ? 'Solana mainnet' : t('devnet');
  const nextRankText = rank.nextRank ? t('nextRank', { rank: rank.nextRank }) : t('maxRank');
  const missionsText = `${completed.length} ${t('statMissions').toLowerCase()}`;

  // Real rank thresholds become the milestone track — current rank highlighted.
  const milestones = RANK_THRESHOLDS.map((r, i) => {
    const next = RANK_THRESHOLDS[i + 1];
    return {
      name: r.name,
      reached: completed.length >= r.min,
      current: completed.length >= r.min && (!next || completed.length < next.min),
    };
  });

  const sidebarItems: SidebarItem[] = [
    { key: 'overview', label: t('overview'), icon: <User size={16} />, active: true },
    { key: 'missions', label: t('statMissions'), icon: <Flag size={16} />, count: completed.length, href: '/missions' },
    { key: 'discoveries', label: t('discoveries'), icon: <Telescope size={16} />, count: photoDiscoveries.length, href: '/nfts' },
    { key: 'gifts', label: t('gifts'), icon: <Gift size={16} />, count: giftsWithinReach, href: '/marketplace' },
    { key: 'history', label: t('history'), icon: <History size={16} />, href: '/observations' },
    { key: 'settings', label: t('settingsTitle'), icon: <Settings size={16} />, href: '/settings' },
  ];

  const seeAllLink = (href: string, label: string) => (
    <Link href={href} style={{
      fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-purple)',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      {label} <ChevronRight size={11} />
    </Link>
  );

  const countTag = (n: number) => (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
  );

  return (
    <PageTransition>
      {selectedPhoto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(3,6,18,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: 400, width: '100%', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)' }}
            onClick={e => e.stopPropagation()}
          >
            <Image src={selectedPhoto.photo} alt={selectedPhoto.name} width={480} height={480} className="w-full object-cover" unoptimized />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(0deg,rgba(3,6,18,0.9),transparent)' }}>
              <p style={{ color: '#F4F6FB', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, margin: 0 }}>{selectedPhoto.name}</p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close"
              style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(3,6,18,0.7)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={13} color="#F4F6FB" />
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
          className="toast-fade"
          role="status"
          style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 18px', borderRadius: 999, zIndex: 100,
            background: 'var(--bg-elevated)',
            border: `1px solid ${hairline}`,
            color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
          }}
        >
          {t('copied')}
        </div>
      )}

      <div className="profile-page" style={{ position: 'relative' }}>
        {/* decorative cosmic glow — scoped to the profile page */}
        {!isLight && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: -80, right: '8%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: 40, left: '-6%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)' }} />
          </div>
        )}

        <PageContainer variant="wide" className="py-6 pb-16">
          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* HERO */}
            <ProfileHero
              tokens={tk}
              avatarId={profile?.avatar}
              initial={initial}
              onAvatarClick={() => setAvatarOpen(true)}
              nameSlot={
                <UsernameEditor
                  value={profile?.username ?? null}
                  fallback={fallbackName}
                  saving={saving}
                  onSave={(next) => update({ username: next })}
                />
              }
              displayName={displayName}
              statusLabel={rank.name}
              tagline={t('tagline')}
              addrShort={addrShort}
              address={address}
              explorerHref={address ? `https://explorer.solana.com/address/${address}?cluster=${cluster}` : null}
              clusterLabel={clusterLabel}
              copied={copied}
              onCopy={handleCopy}
              copyLabel={t('copyAddress')}
              loaded={profileLoaded}
              balance={balanceDisplay}
              earned={earnedDisplay}
              burned={burnedDisplay}
              statLabels={{ total: t('totalStars'), earned: t('lifetimeEarned'), burned: t('lifetimeBurned') }}
            />

            {/* DASHBOARD GRID */}
            <div className="grid gap-4 mt-4 items-start grid-cols-1 md:grid-cols-2 lg:grid-cols-[280px_minmax(0,1.4fr)_minmax(0,1fr)]">

              {/* SIDEBAR */}
              <div className="md:col-span-2 lg:col-span-1">
                <ProfileSidebar
                  tokens={tk}
                  items={sidebarItems}
                  status={{
                    kicker: t('stargazerStatus'),
                    rankName: rank.name,
                    nextRankText,
                    progressPct: rank.progressPct,
                    missionsText,
                  }}
                />
              </div>

              {/* CENTER COLUMN */}
              <div className="flex flex-col gap-4">
                <ProgressCard
                  tokens={tk}
                  kicker={t('stargazerProgress')}
                  countLabel={missionsText}
                  milestones={milestones}
                  nextLabel={nextRankText}
                  hint={rank.nextRank ? t('progressHint', { rank: rank.nextRank }) : t('maxRank')}
                />

                <EmptyStateCard
                  tokens={tk}
                  kicker={t('discoveries')}
                  headerRight={photoDiscoveries.length > 0 ? seeAllLink('/nfts', t('viewAll')) : countTag(0)}
                  flushBody={photoDiscoveries.length > 0}
                  empty={photoDiscoveries.length === 0 ? {
                    icon: <Telescope size={26} />,
                    title: t('noDiscoveries'),
                    subtitle: t('discoveriesHint'),
                    cta: { label: t('startObserving'), href: '/observe' },
                  } : undefined}
                >
                  {photoDiscoveries.length > 0 ? (
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: 16 }}>
                      {photoDiscoveries.map(d => {
                        const isConfirming = discoveryToDelete === d.id;
                        return (
                          <div
                            key={d.key}
                            style={{
                              flexShrink: 0, width: 148,
                              background: cardBg,
                              border: `1px solid ${hairline}`,
                              borderRadius: 14,
                              overflow: 'hidden', textAlign: 'left',
                              position: 'relative',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto({ photo: d.photo, name: d.name })}
                              style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <div style={{ position: 'relative', width: '100%', height: 100 }}>
                                <Image src={d.photo} alt={d.name} fill style={{ objectFit: 'cover' }} unoptimized />
                              </div>
                              <div style={{ padding: '10px 11px 11px' }}>
                                <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {d.name}
                                </p>
                                <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12, margin: 0 }}>
                                  {new Date(d.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              aria-label={isConfirming ? 'Confirm delete discovery' : 'Delete discovery'}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isConfirming) { removeMission(d.id); setDiscoveryToDelete(null); }
                                else { setDiscoveryToDelete(d.id); }
                              }}
                              onBlur={() => isConfirming && setDiscoveryToDelete(null)}
                              style={{
                                position: 'absolute', top: 6, right: 6,
                                height: 24, minWidth: 24,
                                padding: isConfirming ? '0 8px' : 0,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                borderRadius: 999,
                                background: isConfirming ? 'var(--error)' : 'var(--bg-elevated)',
                                border: `1px solid ${isConfirming ? 'var(--error)' : hairline}`,
                                color: isConfirming ? '#FFFFFF' : 'var(--text-primary)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                              }}
                            >
                              <Trash2 size={10} />
                              {isConfirming && <span>{t('delete')}</span>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : undefined}
                </EmptyStateCard>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-4">
                {/* GIFTS */}
                <EmptyStateCard
                  tokens={tk}
                  kicker={t('gifts')}
                  headerRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{t('giftsReach', { count: giftsWithinReach })}</span>}
                  empty={giftsWithinReach === 0 ? {
                    icon: <Gift size={26} />,
                    title: t('noGiftsReach'),
                    subtitle: t('giftsHint'),
                    cta: { label: t('viewGifts'), href: '/marketplace' },
                  } : undefined}
                >
                  {giftsWithinReach > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {giftPreview.map((g, i) => (
                          <span key={g.id} style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1px solid ${hairline}`, background: '#FFFFFF', marginLeft: i === 0 ? 0 : -10 }}>
                            <Image src={g.image} alt="" fill sizes="38px" style={{ objectFit: 'cover' }} unoptimized />
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/marketplace"
                        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 20px', borderRadius: 12, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'var(--accent-purple)', background: isLight ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.32)' }}
                      >
                        {t('viewGifts')}
                      </Link>
                    </div>
                  ) : undefined}
                </EmptyStateCard>

                {/* PURCHASE HISTORY */}
                <EmptyStateCard
                  tokens={tk}
                  kicker={t('purchaseHistory')}
                  headerRight={orderHistory.length > 0 ? seeAllLink('/marketplace', t('shop')) : countTag(0)}
                  flushBody={orderHistory.length > 0}
                  empty={orderHistory.length === 0 ? {
                    icon: <Package size={26} />,
                    title: t('noPurchasesYet'),
                    subtitle: t('purchasesHint'),
                    cta: { label: t('goToShop'), href: '/marketplace' },
                  } : undefined}
                >
                  {orderHistory.length > 0 ? (
                    <div>
                      {orderHistory.map((o, i) => {
                        const dateStr = new Date(o.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
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
                              padding: '12px 22px',
                              borderBottom: i < orderHistory.length - 1 ? `1px solid ${dividerColor}` : 'none',
                            }}
                          >
                            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: cardBg, border: `1px solid ${hairline}` }}>
                              {o.productImage ? (
                                <Image src={o.productImage} alt={o.productName} fill style={{ objectFit: 'contain', padding: 4 }} unoptimized />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                  <Package size={14} color="var(--text-muted)" />
                                </div>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {o.productName}
                              </p>
                              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11, margin: '2px 0 0' }}>
                                {dateStr} · {fiatLabel} · {payLabel}
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                              <span style={{ padding: '3px 8px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', border: `1px solid ${isPaid ? 'var(--success)' : hairline}`, color: isPaid ? 'var(--success)' : 'var(--stars)' }}>
                                {isPaid ? t('paid') : t('pending')}
                              </span>
                              {o.signature && (
                                <a href={`https://explorer.solana.com/tx/${o.signature}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                                  tx <ExternalLink size={9} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : undefined}
                </EmptyStateCard>
              </div>
            </div>

            {/* ON-CHAIN RECORD — Proof of Observation registry (renders only when present) */}
            {address && (
              <div id="wallet" style={{ scrollMarginTop: 88, marginTop: 16 }}>
                <OnChainRecord wallet={address} />
              </div>
            )}

            {/* SETTINGS + ACCOUNT — functional controls preserved */}
            <div style={{ maxWidth: 760, marginTop: 16 }}>
              <Section title={t('settingsTitle')} action={seeAllLink('/settings', t('allSettings'))}>
                <Row
                  icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                  iconBg="rgba(255, 179, 71,0.08)"
                  iconColor="var(--terracotta)"
                  label={theme === 'dark' ? t('darkMode') : t('dayMode')}
                  sublabel={theme === 'dark' ? t('themeSubDark') : t('themeSubDay')}
                  right={<Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />}
                />
                <Row
                  icon={<Bell size={15} />}
                  iconBg="rgba(255, 179, 71,0.08)"
                  iconColor="var(--terracotta)"
                  label={t('notifications')}
                  sublabel={t('notificationsSub')}
                  href="/settings#notifications"
                />
                <Row
                  icon={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{locale === 'ka' ? 'ქა' : 'EN'}</span>}
                  iconBg="rgba(94, 234, 212,0.08)"
                  iconColor="var(--success)"
                  label={t('language')}
                  right={
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {([['en', 'EN'], ['ka', 'ქა']] as const).map(([code, label]) => {
                        const active = locale === code;
                        return (
                          <button
                            key={code}
                            onClick={() => switchLocale(code)}
                            style={{
                              padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                              background: active ? 'var(--accent)' : 'transparent',
                              border: `1px solid ${active ? 'var(--accent)' : hairline}`,
                              color: active ? '#1A1306' : 'var(--text-secondary)',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </span>
                  }
                />
                <Row
                  icon={<ShieldCheck size={15} />}
                  iconBg="rgba(94, 234, 212,0.08)"
                  iconColor="var(--success)"
                  label={t('privacy')}
                  sublabel={t('privacySub')}
                  href="/settings#privacy"
                  last
                />
              </Section>

              <Section title={t('accountActions')}>
                <Row
                  icon={<LogOut size={15} />}
                  iconBg="rgba(251, 113, 133,0.06)"
                  iconColor="var(--error)"
                  label={confirmSignOut ? t('confirmSignOutQ') : t('signOut')}
                  onClick={() => { if (confirmSignOut) logout(); else setConfirmSignOut(true); }}
                  danger
                  last
                />
              </Section>

              {confirmSignOut && (
                <button
                  onClick={() => setConfirmSignOut(false)}
                  style={{ display: 'block', margin: '-12px auto 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', letterSpacing: '0.05em' }}
                >
                  {t('cancel')}
                </button>
              )}
            </div>

          </div>
        </PageContainer>
      </div>
    </PageTransition>
  );
}
