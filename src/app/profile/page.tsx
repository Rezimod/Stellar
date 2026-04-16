'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Telescope, Lock, ChevronRight, Globe, Bell, Moon, LogOut, X, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';
import Button from '@/components/shared/Button';
import PageTransition from '@/components/ui/PageTransition';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { state, reset } = useAppState();

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

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

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
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          borderRadius: 20, padding: '28px 24px', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #8B5CF6, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={24} color="white" />
          </div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 17, margin: '0 0 6px' }}>Sign in to view your profile</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px' }}>Track missions, discoveries, and Stars earned</p>
          <Button variant="brass" onClick={login}>Sign In</Button>
        </div>
      </div>
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

  const shimmer = profileLoaded ? undefined : { animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,255,255,0.06)', borderRadius: 6 };

  return (
    <PageTransition>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>

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

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>

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
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0F1623', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 26, color: 'white', fontFamily: 'Georgia, serif' }}>{initial}</span>
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
                  ? <Check size={12} color="#34d399" />
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

        {/* — STATS ROW — */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { value: `★ ${starsDisplay.toLocaleString()}`, label: 'Stars Earned', color: '#FFD166' },
            { value: String(completed.length), label: 'Missions Done', color: '#34d399' },
            { value: starsDisplay > 0 ? `~${gelWorth}₾` : String(obsCount), label: starsDisplay > 0 ? 'Store Value' : 'NFTs Minted', color: '#818cf8' },
          ].map(s => (
            <div key={s.label} style={{
              borderRadius: 16, padding: '14px 10px', textAlign: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              {!profileLoaded && s.label !== 'Missions Done' ? (
                <div style={{ ...shimmer, height: 20, width: 48, margin: '0 auto 4px' }} />
              ) : (
                <p style={{ color: s.color, fontWeight: 800, fontSize: 17, margin: '0 0 3px', fontFamily: 'monospace' }}>{s.value}</p>
              )}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* — MY DISCOVERIES — */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>My Discoveries</p>
            <Link href="/missions" style={{ color: '#34d399', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
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
                          color: '#34d399', fontSize: 10, fontWeight: 600, textDecoration: 'none',
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
                <Bell size={16} color="#FFD166" />
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

        {/* — SIGN OUT — */}
        <button
          onClick={confirmSignOut ? logout : () => setConfirmSignOut(true)}
          style={{
            width: '100%', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: confirmSignOut ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${confirmSignOut ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
            color: confirmSignOut ? '#f87171' : 'rgba(255,255,255,0.4)',
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

      </div>
    </PageTransition>
  );
}
