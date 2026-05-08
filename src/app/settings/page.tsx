'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Sun, Moon,
  Mail, Phone, Chrome,
  LogOut, Trash2, ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppState } from '@/hooks/useAppState';

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
  icon, iconBg, iconColor, label, sublabel, right, onClick, href, danger, last, disabled,
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
  last?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
        cursor: !disabled && (onClick || href) ? 'pointer' : 'default',
        background: 'transparent',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!disabled && (onClick || href)) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
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
      {(onClick || href) && !right && !disabled && <ChevronRight size={15} color="var(--text-muted)" />}
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        width: 46, height: 26, borderRadius: 13, padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        background: on ? 'var(--accent)' : 'var(--border-default)',
        opacity: disabled ? 0.4 : 1,
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
  const { authenticated } = useStellarUser();
  const { logout } = useStellarAuth();
  const { reset } = useAppState();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [locale, setLocale] = useState('en');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const c = document.cookie.split(';').find(s => s.trim().startsWith('stellar_locale='));
    if (c) setLocale(c.split('=')[1]?.trim() ?? 'en');
  }, []);

  const switchLocale = (l: string) => {
    document.cookie = `stellar_locale=${l}; path=/; max-age=31536000`;
    setLocale(l);
    window.location.reload();
  };

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

      {/* ── APPEARANCE ── */}
      <Section title="Appearance">
        <Row
          icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={theme === 'dark' ? 'Dark Mode' : 'Day Mode'}
          sublabel={theme === 'dark' ? 'Deep space theme' : 'Bright daytime theme'}
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

      {/* ── ACCOUNT ACTIONS ── */}
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
