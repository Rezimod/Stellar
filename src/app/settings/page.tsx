'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Sun, Moon, Bell, BellOff, Shield,
  Mail, Phone, Chrome, Copy, Check, ExternalLink,
  LogOut, Trash2, ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppState } from '@/hooks/useAppState';
import { getRank } from '@/lib/rewards';

const STARS_TO_GEL = 0.012; // 1 Star ≈ 0.012 GEL (100 Stars ≈ 1.2 GEL store credit)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        margin: '0 0 10px 4px',
      }}>
        {title}
      </p>
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 60% 100% at 0% 0%, rgba(167,139,250,0.06) 0%, transparent 60%), ' +
          'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 28px -18px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  icon, iconBg, iconColor, label, sublabel, right, onClick, href, danger, first, last,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  const inner = (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
        cursor: onClick || href ? 'pointer' : 'default',
        background: 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (onClick || href) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: iconBg,
        border: `1px solid ${iconColor}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: danger ? 'var(--error)' : 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 14, fontWeight: 500, margin: 0,
          letterSpacing: '-0.005em',
        }}>{label}</p>
        {sublabel && <p style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11, margin: '2px 0 0',
        }}>{sublabel}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      {(onClick || href) && !right && <ChevronRight size={15} color="var(--text-muted)" />}
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 46, height: 26, borderRadius: 13, padding: 2, cursor: 'pointer', border: 'none',
        background: on ? 'var(--accent)' : 'var(--border-default)',
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: 'white',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const { user, linkEmail, linkPhone, unlinkEmail, unlinkPhone } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { logout } = useStellarAuth();
  const { state, reset } = useAppState();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [locale, setLocale] = useState('en');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [starsBalance, setStarsBalance] = useState(0);
  const [solPrice, setSolPrice] = useState(0);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const address = stellarAddress ?? state.walletAddress ?? null;

  useEffect(() => {
    const c = document.cookie.split(';').find(s => s.trim().startsWith('stellar_locale='));
    if (c) setLocale(c.split('=')[1]?.trim() ?? 'en');
  }, []);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(address)}`)
      .then(r => r.json()).then(d => setStarsBalance(d.balance ?? 0)).catch(() => {});
  }, [address]);

  useEffect(() => {
    fetch('/api/price/sol').then(r => r.json()).then(d => setSolPrice(d.solPrice ?? 0)).catch(() => {});
  }, []);

  const switchLocale = (l: string) => {
    document.cookie = `stellar_locale=${l}; path=/; max-age=31536000`;
    setLocale(l);
    window.location.reload();
  };

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completed = state.completedMissions.filter(m => m.status === 'completed');
  const rank = getRank(completed.length);
  const totalStars = starsBalance || completed.reduce((s, m) => s + (m.stars ?? 0), 0);
  const gelWorth = (totalStars * STARS_TO_GEL).toFixed(2);

  const email = user?.email?.address ??
    (user?.linkedAccounts.find(a => a.type === 'email') as { address?: string } | undefined)?.address;
  const phone = (user?.linkedAccounts.find(a => a.type === 'phone') as { number?: string } | undefined)?.number;
  const hasGoogle = user?.linkedAccounts.some(a => a.type === 'google_oauth');

  if (!authenticated) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Sign in to access settings.</p>
        <Link href="/profile" style={{ color: 'var(--accent)', fontSize: 14, marginTop: 12, display: 'inline-block' }}>← Back to Profile</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0 22px' }}>
        <button
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <ChevronLeft size={17} color="var(--text-secondary)" />
        </button>
        <h1 style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 22,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Settings
        </h1>
      </div>

      {/* ── ACCOUNT ── */}
      <Section title="Account">
        {/* Email */}
        <Row
          icon={<Mail size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={email ? email : 'Add Email'}
          sublabel={email ? 'Primary email' : 'Link an email address'}
          onClick={email ? undefined : () => linkEmail()}
          right={email ? (
            <button onClick={() => unlinkEmail(email)} style={{ color: 'var(--text-muted)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
          ) : undefined}
          last={!phone && !hasGoogle}
        />
        {/* Phone */}
        <Row
          icon={<Phone size={15} />}
          iconBg="rgba(94, 234, 212,0.08)"
          iconColor="var(--success)"
          label={phone ? phone : 'Add Phone'}
          sublabel={phone ? 'Linked phone' : 'Add SMS login'}
          onClick={phone ? undefined : () => linkPhone()}
          right={phone ? (
            <button onClick={() => unlinkPhone(phone)} style={{ color: 'var(--text-muted)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
          ) : undefined}
          last={!hasGoogle}
        />
        {/* Google */}
        {hasGoogle && (
          <Row
            icon={<Chrome size={15} />}
            iconBg="rgba(255, 179, 71,0.08)"
            iconColor="var(--stars)"
            label="Google Account"
            sublabel="Connected"
            last
          />
        )}
      </Section>

      {/* ── WALLET ── */}
      {address && (
        <Section title="Wallet">
          <Row
            icon={<Shield size={15} />}
            iconBg="rgba(255, 179, 71,0.08)"
            iconColor="var(--terracotta)"
            label={`${address.slice(0, 8)}...${address.slice(-6)}`}
            sublabel="Embedded Solana wallet"
            onClick={handleCopy}
            right={
              <div style={{ display: 'flex', gap: 10 }}>
                {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} color="var(--text-muted)" />}
                <a href={`https://explorer.solana.com/address/${address}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                  <ExternalLink size={15} color="var(--text-muted)" />
                </a>
              </div>
            }
            last
          />
        </Section>
      )}

      {/* ── STARS ── */}
      <Section title="Stars">
        <div style={{ padding: '16px 16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              { value: `✦ ${totalStars.toLocaleString()}`, label: 'Balance', color: 'var(--stars)' },
              { value: `~${gelWorth} ₾`, label: 'Store Value', color: 'var(--success)' },
              { value: rank.name, label: rank.icon, color: 'var(--terracotta)' },
            ].map(s => (
              <div key={s.label} style={{
                borderRadius: 12,
                padding: '12px 8px 11px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                <p style={{
                  color: s.color, fontWeight: 700, fontSize: 16,
                  margin: '0 0 4px',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}>{s.value}</p>
                <p style={{
                  color: 'var(--text-muted)', fontSize: 9.5, margin: 0,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  lineHeight: 1.3,
                }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rank progress */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.16em',
              }}>{rank.icon} {rank.name}</span>
              {rank.nextRank && <span style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
              }}>{rank.nextRank} →</span>}
            </div>
            <div style={{
              height: 4, borderRadius: 999,
              background: 'rgba(0,0,0,0.35)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                height: '100%', borderRadius: 999,
                width: `${Math.max(rank.progressPct, 4)}%`,
                background: 'linear-gradient(90deg, #FFB347 0%, #FFB347 100%)',
                boxShadow: '0 0 8px rgba(255,179,71,0.4)',
                transition: 'width 0.7s',
              }} />
            </div>
          </div>

          {/* SOL price info */}
          {solPrice > 0 && (
            <p style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5, margin: 0,
              textAlign: 'center',
              letterSpacing: '0.04em',
            }}>
              SOL ${solPrice.toFixed(0)} · 100 Stars ≈ {(100 * STARS_TO_GEL).toFixed(2)} ₾ store credit
            </p>
          )}
        </div>
      </Section>

      {/* ── APPEARANCE ── */}
      <Section title="Appearance">
        <Row
          icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          iconBg={theme === 'dark' ? 'rgba(255, 179, 71,0.08)' : 'rgba(255, 179, 71,0.1)'}
          iconColor={theme === 'dark' ? 'var(--terracotta)' : 'var(--terracotta)'}
          label={theme === 'dark' ? 'Dark Mode' : 'Day Mode'}
          sublabel={theme === 'dark' ? 'Deep space theme' : 'Bright daytime theme'}
          onClick={undefined}
          right={<Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />}
          last
        />
      </Section>

      {/* ── LANGUAGE ── */}
      <Section title="Language">
        <div style={{ padding: 12, display: 'flex', gap: 10 }}>
          {[
            { code: 'en', label: 'English', flag: '🇺🇸' },
            { code: 'ka', label: 'ქართული', flag: '🇬🇪' },
          ].map(l => {
            const active = locale === l.code;
            return (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                style={{
                  flex: 1, padding: '14px 10px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  background: active
                    ? 'linear-gradient(180deg, rgba(255,179,71,0.16) 0%, rgba(255,179,71,0.04) 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(255,179,71,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                  boxShadow: active
                    ? 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px -14px rgba(255,179,71,0.45)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: 22 }}>{l.flag}</span>
                <span style={{
                  color: active ? 'var(--terracotta)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}>{l.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── NOTIFICATIONS ── */}
      <Section title="Notifications">
        <Row
          icon={notificationsOn ? <Bell size={15} /> : <BellOff size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--stars)"
          label="Sky Alerts"
          sublabel="Notify when conditions are perfect"
          right={<Toggle on={notificationsOn} onToggle={() => setNotificationsOn(v => !v)} />}
          last
        />
      </Section>

      {/* ── DANGER ZONE ── */}
      <Section title="Account Actions">
        <Row
          icon={<Trash2 size={15} />}
          iconBg="rgba(251, 113, 133,0.06)"
          iconColor="var(--error)"
          label={confirmReset ? 'Confirm reset?' : 'Reset Observations'}
          sublabel="Clears local mission data"
          onClick={() => {
            if (confirmReset) { reset(); setConfirmReset(false); }
            else setConfirmReset(true);
          }}
          danger
        />
        <Row
          icon={<LogOut size={15} />}
          iconBg="rgba(251, 113, 133,0.06)"
          iconColor="var(--error)"
          label={confirmSignOut ? 'Confirm sign out?' : 'Sign Out'}
          onClick={() => {
            if (confirmSignOut) logout();
            else setConfirmSignOut(true);
          }}
          danger
          last
        />
      </Section>

      {confirmSignOut && (
        <button onClick={() => setConfirmSignOut(false)} style={{ display: 'block', margin: '-20px auto 0', color: 'var(--text-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
          Cancel
        </button>
      )}

    </div>
  );
}
