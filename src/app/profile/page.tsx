'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { useState, useEffect, type CSSProperties } from 'react';
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
import MyActiveBets from '@/components/markets/MyActiveBets';
import { Avatar } from '@/lib/avatars';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { UsernameEditor } from '@/components/profile/UsernameEditor';
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
  borderRadius: 'var(--stl-r-md)',
  background: 'var(--stl-bg-surface)',
  border: '1px solid var(--stl-border-regular)',
  textDecoration: 'none',
  transition: 'background 150ms ease, border-color 150ms ease',
  cursor: 'pointer',
};

const ICON_CHIP_STYLE: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'var(--stl-bg-elevated)',
  border: '1px solid var(--stl-border-regular)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
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
  const t = useTranslations('profile');
  const { user, getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { logout } = useStellarAuth();
  const { state, removeMission } = useAppState();
  const [discoveryToDelete, setDiscoveryToDelete] = useState<string | null>(null);
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
            background: 'var(--stl-bg-elevated)',
            border: '1px solid var(--stl-border-regular)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={22} color="var(--stl-text-muted)" strokeWidth={1.5} />
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
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const starsDisplay = profileLoaded ? starsBalance : (starsBalance || totalStars);
  const STARS_TO_GEL = 0.012;
  const gelWorth = (starsDisplay * STARS_TO_GEL).toFixed(1);
  const rank = getRank(completed.length);
  const rankProgress = Math.min(100, (completed.length / Math.max(1, completed.length + 5)) * 100);

  const photoDiscoveries = completed.filter(m => m.photo).map(m => ({
    key: `m-${m.id}`,
    id: m.id,
    name: m.name,
    photo: m.photo!,
    date: m.timestamp,
    txId: m.txId ?? null,
  }));

  const stats = [
    {
      label: 'Stars Earned',
      value: `✦ ${starsDisplay.toLocaleString()}`,
      color: 'var(--stl-gold)',
      skeleton: !profileLoaded,
    },
    {
      label: 'Missions Done',
      value: String(completed.length),
      color: 'var(--stl-text-bright)',
      skeleton: false,
    },
    {
      label: starsDisplay > 0 ? 'Store Value' : 'NFTs Minted',
      value: starsDisplay > 0 ? `~${gelWorth}₾` : String(obsCount),
      color: 'var(--stl-green)',
      skeleton: !profileLoaded,
    },
  ];

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

        {/* HEADER */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 16, paddingBottom: 16, gap: 10,
        }}>
          <button
            onClick={() => setAvatarOpen(true)}
            aria-label="Change avatar"
            style={{
              position: 'relative', width: 80, height: 80, padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer', borderRadius: '50%',
            }}
          >
            <Avatar avatarId={profile?.avatar} initial={initial} size={80} />
            <span
              aria-hidden
              style={{
                position: 'absolute', right: -2, bottom: -2,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--stl-bg-elevated)',
                border: '1px solid var(--stl-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--stl-gold)',
              }}
            >
              <Camera size={12} />
            </span>
          </button>

          <div style={{
            textAlign: 'center', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500,
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
                  background: 'var(--stl-bg-surface)',
                  border: '1px solid var(--stl-border-regular)',
                  borderRadius: 999,
                  padding: '6px 12px',
                  cursor: 'pointer',
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

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {stats.map(s => (
            <div
              key={s.label}
              style={{
                background: 'var(--stl-bg-surface)',
                border: '1px solid var(--stl-border-regular)',
                borderRadius: 'var(--stl-r-md)',
                padding: '14px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                color: 'var(--stl-text-dim)', textAlign: 'center',
              }}>
                {s.label}
              </span>
              {s.skeleton ? (
                <Skeleton className="w-16 h-6" />
              ) : (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600,
                  color: s.color,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                }}>
                  {s.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* RANK BAR */}
        <div style={{
          background: 'var(--stl-bg-surface)',
          border: '1px solid var(--stl-border-regular)',
          borderRadius: 'var(--stl-r-md)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.14em',
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
            height: 3, borderRadius: 999, overflow: 'hidden',
            background: 'var(--stl-bg-elevated)',
          }}>
            <div style={{
              width: `${rankProgress}%`,
              height: '100%',
              background: 'var(--terracotta)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* MY ACTIVE BETS */}
        <section>
          <MyActiveBets variant="compact" title="My active bets" />
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
            <div style={{
              padding: '20px 16px', textAlign: 'center',
              background: 'var(--stl-bg-surface)',
              border: '1px solid var(--stl-border-regular)',
              borderRadius: 'var(--stl-r-md)',
            }}>
              <Package size={20} color="var(--stl-text-dim)" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 12, color: 'var(--stl-text-dim)', margin: 0 }}>
                No purchases yet
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--stl-bg-surface)',
              border: '1px solid var(--stl-border-regular)',
              borderRadius: 'var(--stl-r-md)',
              overflow: 'hidden',
            }}>
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
                      borderBottom: i < orderHistory.length - 1 ? '1px solid var(--stl-border-regular)' : 'none',
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

        {/* MY DISCOVERIES */}
        <section>
          <div style={SECTION_HEADER_STYLE}>
            <span style={KICKER_STYLE}>My discoveries · {photoDiscoveries.length}</span>
            <Link href="/nfts" style={SEE_ALL_STYLE}>
              View all <ChevronRight size={11} />
            </Link>
          </div>

          {photoDiscoveries.length === 0 ? (
            <div style={{
              padding: '20px 16px', textAlign: 'center',
              background: 'var(--stl-bg-surface)',
              border: '1px solid var(--stl-border-regular)',
              borderRadius: 'var(--stl-r-md)',
            }}>
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
                      flexShrink: 0, width: 140,
                      background: 'var(--stl-bg-surface)',
                      border: '1px solid var(--stl-border-regular)',
                      borderRadius: 'var(--stl-r-md)',
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
                      <div style={{ position: 'relative', width: '100%', height: 96 }}>
                        <Image src={d.photo} alt={d.name} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ padding: '10px 10px 10px' }}>
                        <p style={{
                          color: 'var(--stl-text-bright)',
                          fontFamily: 'var(--font-display)',
                          fontSize: 12, fontWeight: 500, margin: '0 0 3px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {d.name}
                        </p>
                        <p style={{
                          color: 'var(--stl-text-dim)', fontFamily: 'var(--font-mono)',
                          fontSize: 10, margin: '0 0 8px',
                        }}>
                          {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        {d.txId ? (
                          <a
                            href={`https://explorer.solana.com/tx/${d.txId}?cluster=${cluster}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                              background: 'var(--stl-bg-elevated)',
                              border: '1px solid var(--stl-border-green)',
                              color: 'var(--stl-green)', textDecoration: 'none',
                              fontFamily: 'var(--font-mono)',
                              textTransform: 'uppercase', letterSpacing: '0.08em',
                              fontSize: 9.5, fontWeight: 600,
                            }}
                          >
                            On-chain
                          </a>
                        ) : (
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            background: 'var(--stl-bg-elevated)',
                            border: '1px solid var(--stl-border-regular)',
                            color: 'var(--stl-text-dim)',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            fontSize: 9.5,
                          }}>
                            Local
                          </span>
                        )}
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

        {/* SETTINGS */}
        <section>
          <div style={SECTION_HEADER_STYLE}>
            <span style={KICKER_STYLE}>Settings</span>
            <Link href="/settings" style={SEE_ALL_STYLE}>
              All settings <ChevronRight size={11} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/settings#notifications" style={ROW_STYLE}>
              <div style={ICON_CHIP_STYLE}>
                <Bell size={14} color="var(--stl-gold)" />
              </div>
              <p style={ROW_LABEL_STYLE}>Notifications</p>
              <span style={ROW_VALUE_STYLE}>On</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>

            <Link href="/settings#appearance" style={ROW_STYLE}>
              <div style={ICON_CHIP_STYLE}>
                <Moon size={14} color="var(--stl-text-bright)" />
              </div>
              <p style={ROW_LABEL_STYLE}>Appearance</p>
              <span style={ROW_VALUE_STYLE}>Dark / Day</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>

            <Link href="/settings#wallet" style={ROW_STYLE}>
              <div style={ICON_CHIP_STYLE}>
                <Wallet size={14} color="var(--stl-text-bright)" />
              </div>
              <p style={ROW_LABEL_STYLE}>Wallet</p>
              <span style={ROW_VALUE_STYLE}>{addrShort ?? '—'}</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>

            <Link href="/settings#privacy" style={ROW_STYLE}>
              <div style={ICON_CHIP_STYLE}>
                <ShieldCheck size={14} color="var(--stl-green)" />
              </div>
              <p style={ROW_LABEL_STYLE}>Privacy & Data</p>
              <span style={ROW_VALUE_STYLE}>Manage</span>
              <ChevronRight size={14} color="var(--stl-text-dim)" />
            </Link>

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
        </section>

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
    </PageTransition>
  );
}
