'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Sun, Moon, Globe, Bell, BellOff, Shield,
  Mail, Phone, Chrome, Copy, Check, ExternalLink,
  Star, TrendingUp, LogOut, Trash2, ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppState } from '@/hooks/useAppState';
import { getRank, getUnlockedRewards } from '@/lib/rewards';

const STARS_TO_GEL = 0.012; // 1 Star ≈ 0.012 GEL (100 Stars ≈ 1.2 GEL store credit)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 4px' }}>
        {title}
      </p>
      <div style={{ borderRadius: 18, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
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
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
        cursor: onClick || href ? 'pointer' : 'default',
        background: 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (onClick || href) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, border: `1px solid ${iconColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: danger ? 'var(--error)' : 'var(--text-primary)', fontSize: 15, fontWeight: 500, margin: 0 }}>{label}</p>
        {sublabel && <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '1px 0 0' }}>{sublabel}</p>}
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
  const { authenticated, user, logout, linkEmail, linkPhone, unlinkEmail, unlinkPhone } = usePrivy();
  const { wallets } = useWallets();
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

  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');
  const address = solanaWallet?.address ?? state.walletAddress ?? null;

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
  const unlockedRewards = getUnlockedRewards(completed.map(m => m.id), rank.name);
  const availableRewards = unlockedRewards.filter(r => r.unlocked && !r.claimed);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0 24px' }}>
        <button
          onClick={() => router.back()}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ChevronLeft size={17} color="var(--text-secondary)" />
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 19, margin: 0 }}>Settings</h1>
      </div>

      {/* ── ACCOUNT ── */}
      <Section title="Account">
        {/* Email */}
        <Row
          icon={<Mail size={15} />}
          iconBg="rgba(99,102,241,0.08)"
          iconColor="#818cf8"
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
          iconBg="rgba(52,211,153,0.08)"
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
            iconBg="rgba(255,209,102,0.08)"
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
            iconBg="rgba(139,92,246,0.08)"
            iconColor="#8B5CF6"
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

      {/* ── STARS & REWARDS ── */}
      <Section title="Stars & Rewards">
        {/* Balance card */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { value: `✦ ${totalStars.toLocaleString()}`, label: 'Stars Balance', color: 'var(--stars)' },
              { value: `~${gelWorth} ₾`, label: 'Store Value', color: 'var(--success)' },
              { value: availableRewards.length.toString(), label: 'Rewards Ready', color: '#818cf8' },
            ].map(s => (
              <div key={s.label} style={{ borderRadius: 12, padding: '12px 8px', textAlign: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ color: s.color, fontWeight: 800, fontSize: 15, margin: '0 0 2px', fontFamily: 'monospace' }}>{s.value}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rank progress */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{rank.icon} {rank.name}</span>
              {rank.nextRank && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{rank.nextRank} →</span>}
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border-default)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${Math.max(rank.progressPct, 4)}%`, background: 'linear-gradient(90deg, #818cf8, #8B5CF6)', transition: 'width 0.7s' }} />
            </div>
          </div>

          {/* SOL price info */}
          {solPrice > 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 14, textAlign: 'center' }}>
              SOL ${solPrice.toFixed(0)} · 100 Stars ≈ {(100 * STARS_TO_GEL).toFixed(2)} ₾ store credit
            </p>
          )}
        </div>

        {/* Unlocked rewards */}
        {availableRewards.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {availableRewards.map((r, i) => (
              <Row
                key={r.id}
                icon={<Star size={14} />}
                iconBg="rgba(255,209,102,0.1)"
                iconColor="var(--stars)"
                label={r.name}
                sublabel={r.description}
                right={
                  <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--success)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Claim
                  </span>
                }
                last={i === availableRewards.length - 1}
              />
            ))}
          </div>
        )}

        {/* Next reward progress */}
        {availableRewards.length === 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {unlockedRewards.filter(r => !r.unlocked).slice(0, 2).map((r, i, arr) => (
              <Row
                key={r.id}
                icon={<TrendingUp size={14} />}
                iconBg="rgba(139,92,246,0.08)"
                iconColor="#8B5CF6"
                label={r.name}
                sublabel={r.description}
                right={
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {Math.round(r.progress * 100)}%
                  </span>
                }
                last={i === arr.length - 1}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── APPEARANCE ── */}
      <Section title="Appearance">
        <Row
          icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          iconBg={theme === 'dark' ? 'rgba(139,92,246,0.08)' : 'rgba(251,191,36,0.1)'}
          iconColor={theme === 'dark' ? '#8B5CF6' : '#FBBF24'}
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
          ].map(l => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              style={{
                flex: 1, padding: '12px 10px', borderRadius: 14, cursor: 'pointer',
                background: locale === l.code ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                border: `2px solid ${locale === l.code ? 'var(--accent)' : 'var(--border-default)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 22 }}>{l.flag}</span>
              <span style={{ color: locale === l.code ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{l.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── NOTIFICATIONS ── */}
      <Section title="Notifications">
        <Row
          icon={notificationsOn ? <Bell size={15} /> : <BellOff size={15} />}
          iconBg="rgba(255,209,102,0.08)"
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
          iconBg="rgba(248,113,113,0.06)"
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
          iconBg="rgba(248,113,113,0.06)"
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
