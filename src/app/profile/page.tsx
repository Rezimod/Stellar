'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Telescope, User, ChevronRight, Globe, Bell, Moon, LogOut, X, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Button from '@/components/shared/Button';
import PageTransition from '@/components/ui/PageTransition';
import PageContainer from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress, source: authSource } = useStellarUser();
  const { logout } = useStellarAuth();
  const { state, reset } = useAppState();
  const [authOpen, setAuthOpen] = useState(false);

  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [obsCount, setObsCount] = useState<number>(0);
  const [recentObs, setRecentObs] = useState<{ id: string; target: string; confidence: string; stars: number; created_at: string }[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: string; name: string } | null>(null);

  useEffect(() => {
    return () => setConfirmSignOut(false);
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPhoto(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedPhoto]);

  const address = stellarAddress ?? state.walletAddress ?? null;

  useEffect(() => {
    fetch('/api/price/sol').then(r => r.json()).then(d => setSolPrice(d.solPrice ?? 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!address) { setProfileLoaded(true); return; }
    setProfileLoaded(false);
    Promise.allSettled([
      fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
        .then(r => r.json()).then(d => setStarsBalance(d.balance)),
      fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address)}`)
        .then(r => r.json())
        .then(d => {
          const obs = d.observations ?? [];
          setObsCount(obs.length);
          setRecentObs(obs.slice(0, 6));
        }),
    ]).then(() => setProfileLoaded(true));
  }, [address, retryKey]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authenticated) {
    return (
      <PageContainer variant="content" className="py-10 flex flex-col items-center">
        <div style={{
          width: '100%', maxWidth: 420, borderRadius: 20, padding: '36px 28px', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={28} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
          </div>
          <h1 style={{
            color: 'white', fontWeight: 700, fontSize: 'clamp(24px, 4vw, 30px)', margin: '0 0 10px',
            fontFamily: 'var(--font-display)', letterSpacing: '-0.025em', lineHeight: 1.18,
          }}>
            Your Observatory
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
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
  const displayName = email ? email.split('@')[0] : address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'Astronomer';
  const initial = displayName[0]?.toUpperCase() ?? '✦';
  const addrShort = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const totalStars = completed.reduce((sum, m) => sum + (m.stars ?? 0), 0);
  const starsDisplay = starsBalance || totalStars;
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
        color: 'var(--stars)', reward: '100–500 ✦ per mission',
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
      color: '#9CA3AF', reward: '5–25 ✦ per check-in',
      upgradeHint: 'Complete your first mission to become an Observer' };
  })();

  return (
    <PageTransition>
      {/* Lightbox */}
      {selectedPhoto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(7,11,20,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: 400, width: '100%', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(122,95,255,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <Image src={selectedPhoto.photo} alt={selectedPhoto.name} width={480} height={480} className="w-full object-cover" unoptimized />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(0deg,rgba(7,11,20,0.9),transparent)' }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>{selectedPhoto.name}</p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(7,11,20,0.7)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={13} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>
      )}

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
              background: 'var(--color-bg-card-strong)',
              border: '1px solid var(--color-border-medium)',
              color: 'white', fontSize: 13, fontWeight: 500,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            Copied to clipboard
          </div>
        )}

        <PageHeader label="OBSERVATORY" title="Your profile" />

        {/* — HEADER: Avatar + Name + Address — */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 24, gap: 10 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%', padding: 2.5,
              background: rank.name === 'Celestial'
                ? 'linear-gradient(135deg,#FFD166,#F59E0B)'
                : rank.name === 'Pathfinder'
                ? 'linear-gradient(135deg,#A855F7,#6366F1)'
                : 'linear-gradient(135deg,#818cf8,#8B5CF6)',
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 26, color: 'white', fontFamily: 'var(--font-serif)' }}>{initial}</span>
              </div>
            </div>
          </div>

          {/* Name */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 19, margin: 0, lineHeight: 1.2 }}>{displayName}</p>
            {addrShort && (
              <button
                onClick={handleCopy}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>{addrShort}</span>
                {copied
                  ? <Check size={12} color="var(--success)" />
                  : <Copy size={12} color="rgba(255,255,255,0.3)" />
                }
                <a
                  href={`https://explorer.solana.com/address/${address}?cluster=${cluster}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={12} color="rgba(255,255,255,0.3)" />
                </a>
              </button>
            )}
          </div>
        </div>

        {/* — STATS ROW (data cards) — */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { value: `✦ ${starsDisplay.toLocaleString()}`, label: 'Stars Earned', color: 'var(--color-accent-gold)' },
            { value: String(completed.length), label: 'Missions Done', color: 'var(--color-success)' },
            { value: starsDisplay > 0 ? `~${gelWorth}₾` : String(obsCount), label: starsDisplay > 0 ? 'Store Value' : 'NFTs Minted', color: 'var(--color-accent-teal)' },
          ].map(s => (
            <div key={s.label} style={{
              borderRadius: 'var(--radius-lg)', padding: '16px 10px', textAlign: 'center',
              background: 'var(--color-bg-card-strong)',
              border: '1px solid var(--color-border-subtle)',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}>
              {!profileLoaded && s.label !== 'Missions Done' ? (
                <Skeleton
                  className={`${s.label === 'Stars Earned' ? 'w-20' : 'w-12'} h-8 mx-auto mb-1`}
                />
              ) : (
                <p
                  className={s.label === 'Stars Earned' ? 'stars-amount' : ''}
                  style={{
                    color: s.color, fontWeight: 800, fontSize: 19, margin: '0 0 4px',
                    fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s.value}
                </p>
              )}
              <p style={{
                color: 'var(--color-text-faint)', fontSize: 11, margin: 0,
                textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3,
                fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
              }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* — RANK PROGRESSION (gold gradient bar) — */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: 0,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            }}>
              Rank · {rank.name}
            </p>
            <p style={{
              color: 'var(--color-text-faint)', fontSize: 12, margin: 0,
              fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            }}>
              {completed.length} missions
            </p>
          </div>
          <div style={{
            height: 6, borderRadius: 999, overflow: 'hidden',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-subtle)',
          }}>
            <div style={{
              width: `${Math.min(100, (completed.length / Math.max(1, completed.length + 5)) * 100)}%`,
              height: '100%',
              background: 'var(--gradient-gold)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* — NETWORK STATUS — */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>Network Status</p>
            <Link href="/network" style={{ color: 'var(--success)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              View network <ChevronRight size={13} />
            </Link>
          </div>
          <div style={{
            borderRadius: 18, padding: '18px 20px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{nodeType.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: nodeType.color, fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: '0.01em' }}>
                  {nodeType.label}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '2px 0 0' }}>
                  {nodeType.description}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Missions', value: String(completed.length) },
                { label: 'Observations', value: String(obsCount) },
                { label: 'Earn rate', value: nodeType.reward },
              ].map(row => (
                <div key={row.label} style={{
                  padding: '10px 12px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {row.label}
                  </p>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: '4px 0 0', fontFamily: 'monospace' }}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
            {nodeType.upgradeHint && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, margin: 0, lineHeight: 1.45 }}>
                {nodeType.upgradeHint}
              </p>
            )}
          </div>
        </div>

        {/* — MY DISCOVERIES — */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>My Discoveries</p>
            <Link href="/missions" style={{ color: 'var(--success)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {photoDiscoveries.length === 0 ? (
            <div style={{
              borderRadius: 16, padding: '28px 20px', textAlign: 'center',
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
            }}>
              <Telescope size={22} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>Complete a mission with a photo to see your discoveries</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', marginLeft: -2, paddingLeft: 2 }}>
              {photoDiscoveries.map(d => (
                <button
                  key={d.key}
                  onClick={() => setSelectedPhoto({ photo: d.photo, name: d.name })}
                  style={{
                    flexShrink: 0, width: 160, borderRadius: 16, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', textAlign: 'left', padding: 0,
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: 110 }}>
                    <Image src={d.photo} alt={d.name} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 8px' }}>
                      {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {d.txId ? (
                      <a
                        href={`https://explorer.solana.com/tx/${d.txId}?cluster=${cluster}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'inline-block', padding: '3px 8px', borderRadius: 20,
                          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                          color: 'var(--success)', fontSize: 10, fontWeight: 600, textDecoration: 'none',
                        }}
                      >
                        On-chain Proof
                      </a>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '3px 8px', borderRadius: 20,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.3)', fontSize: 10,
                      }}>
                        Local
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* — SETTINGS — */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, margin: 0 }}>Settings</p>
            <Link href="/settings" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Settings size={13} /> All settings
            </Link>
          </div>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
            <Link href="/settings#language" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={16} color="#818cf8" />
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>Language</p>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>EN / KA</span>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>
            <Link href="/settings#notifications" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={16} color="var(--stars)" />
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>Notifications</p>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>On</span>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>
            <Link href="/settings#appearance" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Moon size={16} color="#8B5CF6" />
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>Appearance</p>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Dark / Day</span>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>
          </div>
        </div>

        {/* — SIGN OUT (secondary, calm) — */}
        <button
          onClick={confirmSignOut ? logout : () => setConfirmSignOut(true)}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 999,
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'transparent',
            border: `1px solid ${confirmSignOut ? 'var(--color-border-strong)' : 'var(--color-border-medium)'}`,
            color: confirmSignOut ? 'white' : 'rgb(226, 232, 240)',
            transition: 'all 0.2s',
          }}
        >
          <LogOut size={15} />
          {confirmSignOut ? 'Confirm sign out?' : t('signOut')}
        </button>

        {confirmSignOut && (
          <button
            onClick={() => setConfirmSignOut(false)}
            style={{ marginTop: 8, width: '100%', padding: '10px', borderRadius: 12, fontSize: 13, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}

      </PageContainer>
    </PageTransition>
  );
}
