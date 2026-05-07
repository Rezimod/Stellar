'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { Suspense, useState, useEffect, type CSSProperties } from 'react';
import {
  Copy, Check, ExternalLink, Telescope, User, ChevronRight,
  Bell, Moon, LogOut, X, Camera, Package, Trash2,
  Wallet, ShieldCheck, Mail,
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
import AstromanRedeemModal from '@/components/profile/AstromanRedeemModal';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';

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

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  textDecoration: 'none',
  transition: 'background 150ms ease, border-color 150ms ease',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const ICON_CHIP_STYLE: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
};

const GLASS_EMPTY_STYLE: CSSProperties = {
  padding: '28px 16px',
  textAlign: 'center',
  background:
    'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(167,139,250,0.05) 0%, transparent 60%), ' +
    'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const GLASS_LIST_STYLE: CSSProperties = {
  background:
    'radial-gradient(ellipse 60% 100% at 0% 0%, rgba(167,139,250,0.06) 0%, transparent 60%), ' +
    'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 28px -18px rgba(0,0,0,0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const ROW_LABEL_STYLE: CSSProperties = {
  color: 'var(--stl-text-bright)',
  fontFamily: 'var(--font-display)',
  fontSize: 13,
  fontWeight: 500,
  margin: 0,
  flex: 1,
};

const ROW_VALUE_STYLE: CSSProperties = {
  color: 'var(--stl-text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

const SECTION_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  padding: '0 4px',
  marginBottom: 8,
};

const KICKER_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--stl-text-muted)',
};

const SEE_ALL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--stl-green)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
};

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
  const [discoveryToDelete, setDiscoveryToDelete] = useState<string | null>(null);
  const { profile, saving, update } = useProfile();
  const [authOpen, setAuthOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-open the redeem modal when arriving from the marketplace CTA.
  useEffect(() => {
    if (searchParams?.get('redeem') === 'open' && authenticated) {
      setRedeemOpen(true);
      router.replace('/profile');
    }
  }, [searchParams, authenticated, router]);

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
              fontFamily: 'var(--font-serif)',
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

  const stats: Array<{
    label: string;
    value: string;
    tone: 'gold' | 'dark' | 'green';
    skeleton: boolean;
  }> = [
    {
      label: t('lifetimeEarned'),
      value: earnedDisplay.toLocaleString(),
      tone: 'gold',
      skeleton: !profileLoaded,
    },
    {
      label: t('balance'),
      value: balanceDisplay.toLocaleString(),
      tone: 'dark',
      skeleton: !profileLoaded,
    },
    {
      label: t('lifetimeBurned'),
      value: burnedDisplay.toLocaleString(),
      tone: 'green',
      skeleton: !profileLoaded,
    },
  ];

  const STAT_TONES: Record<'gold' | 'dark' | 'green', {
    background: string;
    border: string;
    boxShadow: string;
    valueColor: string;
    sparkColor: string;
    labelColor: string;
  }> = {
    gold: {
      background: 'linear-gradient(180deg, rgba(255,179,71,0.10) 0%, rgba(255,179,71,0.03) 100%)',
      border: '1px solid rgba(255,179,71,0.28)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px -14px rgba(255,179,71,0.45)',
      valueColor: '#FFB347',
      sparkColor: '#FFB347',
      labelColor: 'rgba(255,179,71,0.75)',
    },
    dark: {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)',
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -14px rgba(0,0,0,0.55)',
      valueColor: 'var(--stl-text-bright)',
      sparkColor: 'var(--stl-text-bright)',
      labelColor: 'var(--stl-text-dim)',
    },
    green: {
      background: 'linear-gradient(180deg, rgba(56,240,255,0.08) 0%, rgba(56,240,255,0.02) 100%)',
      border: '1px solid rgba(56,240,255,0.22)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -14px rgba(56,240,255,0.30)',
      valueColor: 'var(--stl-green)',
      sparkColor: 'var(--stl-green)',
      labelColor: 'rgba(94,234,212,0.7)',
    },
  };

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
              <p style={{ color: 'var(--stl-text-bright)', fontWeight: 600, fontSize: 14, margin: 0 }}>{selectedPhoto.name}</p>
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

      <PageContainer variant="content" className="py-4 pb-10" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

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
            Copied to clipboard
          </div>
        )}

        {/* HERO CARD — avatar + name + address + rank progress */}
        <div style={{
          position: 'relative',
          background:
            'radial-gradient(ellipse 80% 100% at 0% 0%, rgba(167,139,250,0.10) 0%, transparent 60%), ' +
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 18,
          padding: '18px 16px',
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 36px -20px rgba(91,108,255,0.35)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setAvatarOpen(true)}
              aria-label="Change avatar"
              style={{
                position: 'relative', width: 64, height: 64, padding: 0, border: 'none',
                background: 'transparent', cursor: 'pointer', borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <Avatar avatarId={profile?.avatar} initial={initial} size={64} />
              <span
                aria-hidden
                style={{
                  position: 'absolute', right: -2, bottom: -2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--stl-bg-elevated)',
                  border: '1px solid var(--stl-border-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--stl-gold)',
                }}
              >
                <Camera size={11} />
              </span>
            </button>

            <div style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column', gap: 6,
              fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500,
              alignItems: 'flex-start',
            }}>
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
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    padding: '5px 11px',
                    cursor: 'pointer',
                    maxWidth: '100%',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stl-text-muted)' }}>
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
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={12} color="var(--stl-text-dim)" />
                  </a>
                </button>
              )}
            </div>
          </div>

          {/* Rank progress — embedded in hero card */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.16em',
                color: 'var(--stl-text-bright)',
              }}>
                {rank.name}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--stl-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {completed.length} missions
              </span>
            </div>
            <div style={{
              height: 4, borderRadius: 999, overflow: 'hidden',
              background: 'rgba(0,0,0,0.35)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                width: `${rankProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #FFB347 0%, #FFB347 100%)',
                boxShadow: '0 0 8px rgba(255,179,71,0.4)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* STATS ROW — button-like glassy tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {stats.map(s => {
            const tone = STAT_TONES[s.tone];
            return (
              <div
                key={s.label}
                style={{
                  position: 'relative',
                  background: tone.background,
                  border: tone.border,
                  borderRadius: 16,
                  padding: '16px 12px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                  boxShadow: tone.boxShadow,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                  color: tone.labelColor,
                }}>
                  {s.label}
                </span>
                {s.skeleton ? (
                  <Skeleton className="w-16 h-7" />
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'baseline', gap: 5,
                    fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                    color: tone.valueColor,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}>
                    <span style={{ fontSize: 14, color: tone.sparkColor, opacity: 0.85 }}>✦</span>
                    {s.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* MY DISCOVERIES */}
        <section>
          <div style={SECTION_HEADER_STYLE}>
            <span style={KICKER_STYLE}>My discoveries · {photoDiscoveries.length}</span>
            <Link href="/nfts" style={SEE_ALL_STYLE}>
              View all <ChevronRight size={11} />
            </Link>
          </div>

          {photoDiscoveries.length === 0 ? (
            <div style={GLASS_EMPTY_STYLE}>
              <Telescope size={20} color="var(--stl-text-dim)" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 12, color: 'var(--stl-text-dim)', margin: 0 }}>
                Complete a mission with a photo to see your discoveries
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingLeft: 2, paddingRight: 2 }}>
              {photoDiscoveries.map(d => {
                const isConfirming = discoveryToDelete === d.id;
                return (
                  <div
                    key={d.key}
                    style={{
                      flexShrink: 0, width: 152,
                      background:
                        'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(167,139,250,0.06) 0%, transparent 60%), ' +
                        'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 16,
                      overflow: 'hidden', textAlign: 'left',
                      position: 'relative',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 28px -18px rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
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
                      <div style={{ position: 'relative', width: '100%', height: 104 }}>
                        <Image src={d.photo} alt={d.name} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ padding: '11px 11px 12px' }}>
                        <p style={{
                          color: 'var(--stl-text-bright)',
                          fontFamily: 'var(--font-display)',
                          fontSize: 13, fontWeight: 500, margin: '0 0 3px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {d.name}
                        </p>
                        <p style={{
                          color: 'var(--stl-text-dim)', fontFamily: 'var(--font-mono)',
                          fontSize: 10, margin: 0,
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
                        height: 22, minWidth: 22,
                        padding: isConfirming ? '0 8px' : 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        borderRadius: 999,
                        background: isConfirming ? 'var(--stl-red, rgba(251, 113, 133, 0.95))' : 'var(--stl-bg-elevated)',
                        border: `1px solid ${isConfirming ? 'var(--stl-red, rgba(251, 113, 133, 0.95))' : 'var(--stl-border-strong)'}`,
                        color: isConfirming ? '#fff' : 'var(--stl-text-bright)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700,
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
        </section>

        {/* MY PURCHASES */}
        <section>
          <div style={SECTION_HEADER_STYLE}>
            <span style={KICKER_STYLE}>My purchases · {orderHistory.length}</span>
            <Link href="/marketplace" style={SEE_ALL_STYLE}>
              Shop <ChevronRight size={11} />
            </Link>
          </div>

          {orderHistory.length === 0 ? (
            <div style={GLASS_EMPTY_STYLE}>
              <Package size={20} color="var(--stl-text-dim)" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 12, color: 'var(--stl-text-dim)', margin: 0 }}>
                No purchases yet
              </p>
            </div>
          ) : (
            <div style={GLASS_LIST_STYLE}>
              {orderHistory.map((o, i) => {
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
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      borderBottom: i < orderHistory.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <div style={{
                      position: 'relative', width: 36, height: 36, borderRadius: 8,
                      overflow: 'hidden', flexShrink: 0,
                      background: 'var(--stl-bg-elevated)',
                      border: '1px solid var(--stl-border-regular)',
                    }}>
                      {o.productImage ? (
                        <Image src={o.productImage} alt={o.productName} fill style={{ objectFit: 'contain', padding: 4 }} unoptimized />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <Package size={14} color="var(--stl-text-dim)" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: 'var(--stl-text-bright)', fontFamily: 'var(--font-display)',
                        fontSize: 13, fontWeight: 500, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {o.productName}
                      </p>
                      <p style={{
                        color: 'var(--stl-text-dim)', fontFamily: 'var(--font-mono)',
                        fontSize: 10.5, margin: '2px 0 0',
                      }}>
                        {dateStr} · {fiatLabel} · {payLabel}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span
                        style={{
                          padding: '3px 8px', borderRadius: 999,
                          fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: 'var(--stl-bg-elevated)',
                          border: `1px solid ${isPaid ? 'var(--stl-border-green)' : 'var(--stl-border-regular)'}`,
                          color: isPaid ? 'var(--stl-green)' : 'var(--stl-gold)',
                        }}
                      >
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                      {o.signature && (
                        <a
                          href={`https://explorer.solana.com/tx/${o.signature}?cluster=${cluster}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            color: 'var(--stl-text-dim)', fontFamily: 'var(--font-mono)',
                            fontSize: 10, display: 'inline-flex', alignItems: 'center',
                            gap: 3, textDecoration: 'none',
                          }}
                        >
                          tx <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SETTINGS — 2x2 tile grid + 1 wide row */}
        <section>
          <div style={SECTION_HEADER_STYLE}>
            <span style={KICKER_STYLE}>Settings</span>
            <Link href="/settings" style={SEE_ALL_STYLE}>
              All settings <ChevronRight size={11} />
            </Link>
          </div>
          {(() => {
            const TILE_BG =
              'radial-gradient(ellipse 80% 100% at 0% 0%, rgba(167,139,250,0.08) 0%, transparent 60%), ' +
              'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)';
            const TILE_STYLE: CSSProperties = {
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: '14px',
              background: TILE_BG,
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 28px -18px rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'border-color 150ms ease, transform 120ms ease',
            };
            const TILE_ICON_STYLE = (color: string): CSSProperties => ({
              width: 36, height: 36, borderRadius: 10,
              background: `${color}1A`,
              border: `1px solid ${color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            });
            const TILE_LABEL: CSSProperties = {
              color: 'var(--stl-text-bright)',
              fontFamily: 'var(--font-display)',
              fontSize: 13, fontWeight: 500, margin: 0,
              lineHeight: 1.2,
            };
            const TILE_VALUE: CSSProperties = {
              color: 'var(--stl-text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            };
            const tiles = [
              { href: '/settings#notifications', icon: Bell,        color: '#FFB347', label: 'Notifications', value: 'On' },
              { href: '/settings#appearance',    icon: Moon,        color: '#8B5CF6', label: 'Appearance',    value: 'Dark / Day' },
              { href: '/settings#wallet',        icon: Wallet,      color: '#5EEAD4', label: 'Wallet',        value: addrShort ?? '—' },
              { href: '/settings#privacy',       icon: ShieldCheck, color: '#5EEAD4', label: 'Privacy & Data', value: 'Manage' },
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {tiles.map(({ href, icon: Icon, color, label, value }) => (
                    <Link key={href} href={href} style={TILE_STYLE}>
                      <div style={TILE_ICON_STYLE(color)}>
                        <Icon size={16} color={color} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <p style={TILE_LABEL}>{label}</p>
                        <p style={TILE_VALUE}>{value}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/settings#accounts" style={ROW_STYLE}>
                  <div style={ICON_CHIP_STYLE}>
                    <Mail size={14} color="var(--stl-text-bright)" />
                  </div>
                  <p style={ROW_LABEL_STYLE}>Connected accounts</p>
                  <span style={{
                    ...ROW_VALUE_STYLE,
                    maxWidth: 140,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {email ?? '—'}
                  </span>
                  <ChevronRight size={14} color="var(--stl-text-dim)" />
                </Link>
              </div>
            );
          })()}
        </section>

        {/* REDEEM AT ASTROMAN — gold CTA, mirrors homepage primary button */}
        <button
          onClick={() => setRedeemOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 18px',
            background: 'linear-gradient(180deg, rgba(255,179,71,0.16) 0%, rgba(255,179,71,0.05) 100%)',
            border: '1px solid rgba(255,179,71,0.32)',
            borderRadius: 14,
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 30px -16px rgba(255,179,71,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'transform 120ms ease, box-shadow 200ms ease',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              color: '#FFB347',
            }}>
              Redeem at Astroman till
            </span>
            <span style={{ fontSize: 12, color: 'var(--stl-text-muted)' }}>
              Burn Stars for store credit · 100 Stars = 1 ₾ · 7-day code
            </span>
          </span>
          <span aria-hidden style={{
            color: '#FFB347', fontSize: 18,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 999,
            background: 'rgba(255,179,71,0.12)',
            border: '1px solid rgba(255,179,71,0.28)',
          }}>→</span>
        </button>

        {/* SIGN OUT */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <button
            onClick={confirmSignOut ? logout : () => setConfirmSignOut(true)}
            style={{
              width: '100%', maxWidth: 320,
              padding: '10px 20px', borderRadius: 999,
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--stl-bg-surface)',
              border: `1px solid ${confirmSignOut ? 'var(--stl-border-strong)' : 'var(--stl-border-regular)'}`,
              color: confirmSignOut ? 'var(--stl-text-bright)' : 'var(--stl-text-muted)',
              transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
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
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--stl-text-dim)',
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

      <AstromanRedeemModal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        walletAddress={address}
        balance={starsBalance}
      />
    </PageTransition>
  );
}
