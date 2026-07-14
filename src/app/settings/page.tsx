'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useStellarAuth } from '@/hooks/useStellarAuth';
import { useLocation } from '@/lib/location';
import { enablePush, disablePush } from '@/lib/push/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Sun, Moon,
  Mail, Chrome,
  LogOut, Trash2, ChevronRight,
  Orbit, Sparkles, Cloud, Flashlight, Wallet, ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppState } from '@/hooks/useAppState';
import { Section, Row, Toggle } from '@/components/shared/SettingsList';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('settingsUi');
  const { user, linkEmail, unlinkEmail } = usePrivy();
  const { authenticated, address } = useStellarUser();
  const { location } = useLocation();
  const { logout } = useStellarAuth();
  const { reset } = useAppState();
  const { theme, setTheme, field, toggleField } = useTheme();
  const router = useRouter();

  const [locale, setLocale] = useState('en');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Notification preferences — persisted in localStorage. Browser permission
  // is requested lazily the first time any toggle is turned on.
  const [notif, setNotif] = useState({
    visiblePlanets: false,
    skyEvents: false,
    weatherAlerts: false,
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );
  // iOS only delivers Web Push to home-screen-installed PWAs.
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const c = document.cookie.split(';').find(s => s.trim().startsWith('stellar_locale='));
    if (c) setLocale(c.split('=')[1]?.trim() ?? 'en');

    try {
      const raw = localStorage.getItem('stellar_notifications');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<typeof notif>;
        setNotif((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) { console.error('[settings] read notif prefs', e); }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }

    try {
      const ua = navigator.userAgent || '';
      const isIos = /iphone|ipad|ipod/i.test(ua);
      const standalone =
        (navigator as Navigator & { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
      setIosNeedsInstall(isIos && !standalone);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [authenticated]);

  const persistNotif = (next: typeof notif) => {
    setNotif(next);
    try {
      localStorage.setItem('stellar_notifications', JSON.stringify(next));
    } catch (e) { console.error('[settings] save notif prefs', e); }
  };

  const toggleNotif = async (key: keyof typeof notif) => {
    const turningOn = !notif[key];
    if (turningOn && notifPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        if (result !== 'granted') {
          persistNotif({ ...notif, [key]: false });
          return;
        }
      } catch (e) { console.error('[settings] notif permission', e); }
    }
    const next = { ...notif, [key]: turningOn };
    persistNotif(next);

    // Sync the Web Push subscription: subscribe when any alert is on (and
    // permission granted), unsubscribe when all are off. prefs are stored so
    // the push cron only sends the categories the user kept on.
    const anyOn = Object.values(next).some(Boolean);
    if (anyOn && (typeof Notification !== 'undefined') && Notification.permission === 'granted') {
      await enablePush({
        wallet: address,
        lat: location.lat,
        lon: location.lon,
        city: location.city,
        prefs: next,
      });
    } else if (!anyOn) {
      await disablePush();
    }
  };

  const notifBlocked = notifPermission === 'denied';
  const notifUnsupported = notifPermission === 'unsupported';

  const switchLocale = (l: string) => {
    document.cookie = `stellar_locale=${l}; path=/; max-age=31536000`;
    setLocale(l);
    window.location.reload();
  };

  const email = user?.email?.address ??
    (user?.linkedAccounts.find(a => a.type === 'email') as { address?: string } | undefined)?.address;
  const hasGoogle = user?.linkedAccounts.some(a => a.type === 'google_oauth');
  const addrShort = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;

  if (!authenticated) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{t('signInPrompt')}</p>
        <Link href="/profile" style={{ color: 'var(--accent)', fontSize: 14, marginTop: 12, display: 'inline-block' }}>{t('backToProfile')}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0 22px' }}>
        <button
          onClick={() => router.back()}
          aria-label={t('back')}
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
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 22,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {t('title')}
        </h1>
      </div>

      {/* ── ACCOUNT ── */}
      <Section title={t('accountTitle')}>
        <Row
          icon={<Mail size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={email ? email : t('addEmail')}
          sublabel={email ? t('primaryEmail') : t('linkEmail')}
          onClick={email ? undefined : () => linkEmail()}
          right={email ? (
            <button onClick={() => unlinkEmail(email)} style={{ color: 'var(--text-muted)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>{t('remove')}</button>
          ) : undefined}
          last={!hasGoogle}
        />
        {hasGoogle && (
          <Row
            icon={<Chrome size={15} />}
            iconBg="rgba(255, 179, 71,0.08)"
            iconColor="var(--stars)"
            label={t('googleAccount')}
            sublabel={t('connected')}
            last
          />
        )}
      </Section>

      {/* ── NOTIFICATIONS ── */}
      <Section id="notifications" title={t('notificationsTitle')}>
        {notifBlocked && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--error-dim)',
          }}>
            <p style={{
              margin: 0, color: 'var(--error)',
              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5,
            }}>
              {t('notifBlocked')}
            </p>
          </div>
        )}
        {notifUnsupported && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--warning-dim)',
          }}>
            <p style={{
              margin: 0, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5,
            }}>
              {t('notifUnsupported')}
            </p>
          </div>
        )}
        {!notifUnsupported && iosNeedsInstall && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--warning-dim)',
          }}>
            <p style={{
              margin: 0, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.5,
            }}>
              {t('iosNeedsInstall')}
            </p>
          </div>
        )}
        <Row
          icon={<Orbit size={15} />}
          iconBg="rgba(94, 234, 212,0.08)"
          iconColor="var(--success)"
          label={t('visiblePlanets')}
          sublabel={t('visiblePlanetsSub')}
          right={<Toggle on={notif.visiblePlanets} onToggle={() => toggleNotif('visiblePlanets')} disabled={notifBlocked || notifUnsupported} />}
        />
        <Row
          icon={<Sparkles size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={t('skyEvents')}
          sublabel={t('skyEventsSub')}
          right={<Toggle on={notif.skyEvents} onToggle={() => toggleNotif('skyEvents')} disabled={notifBlocked || notifUnsupported} />}
        />
        <Row
          icon={<Cloud size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={t('weatherAlerts')}
          sublabel={t('weatherAlertsSub')}
          right={<Toggle on={notif.weatherAlerts} onToggle={() => toggleNotif('weatherAlerts')} disabled={notifBlocked || notifUnsupported} />}
          last
        />
      </Section>

      {/* ── APPEARANCE ── */}
      <Section id="appearance" title={t('appearanceTitle')}>
        <Row
          icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={theme === 'dark' ? t('darkMode') : t('dayMode')}
          sublabel={theme === 'dark' ? t('darkModeSub') : t('dayModeSub')}
          right={<Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />}
        />
        <Row
          icon={<Flashlight size={15} />}
          iconBg="rgba(255, 59, 48,0.10)"
          iconColor="#FF3B30"
          label={t('fieldMode')}
          sublabel={t('fieldModeSub')}
          right={<Toggle on={field} onToggle={toggleField} />}
          last
        />
      </Section>

      {/* ── WALLET ── */}
      <Section id="wallet" title={t('walletTitle')}>
        <Row
          icon={<Wallet size={15} />}
          iconBg="rgba(94, 234, 212,0.08)"
          iconColor="var(--success)"
          label={addrShort ?? t('noWallet')}
          sublabel={address ? t('walletSub') : t('walletSignInSub')}
          onClick={address ? () => window.open(`https://explorer.solana.com/address/${address}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'mainnet-beta'}`, '_blank', 'noopener,noreferrer') : undefined}
          right={address ? <ChevronRight size={15} color="var(--text-muted)" /> : undefined}
          last
        />
      </Section>

      {/* ── PRIVACY ── */}
      <Section id="privacy" title={t('privacyTitle')}>
        <Row
          icon={<ShieldCheck size={15} />}
          iconBg="rgba(94, 234, 212,0.08)"
          iconColor="var(--success)"
          label={t('privacyPolicy')}
          sublabel={t('privacyPolicySub')}
          href="/privacy"
          right={<ChevronRight size={15} color="var(--text-muted)" />}
        />
        <Row
          icon={<ShieldCheck size={15} />}
          iconBg="rgba(255, 179, 71,0.08)"
          iconColor="var(--terracotta)"
          label={t('terms')}
          sublabel={t('termsSub')}
          href="/terms"
          right={<ChevronRight size={15} color="var(--text-muted)" />}
          last
        />
      </Section>

      {/* ── LANGUAGE ── */}
      <Section title={t('languageTitle')}>
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
      <Section title={t('accountActionsTitle')}>
        <Row
          icon={<Trash2 size={15} />}
          iconBg="rgba(251, 113, 133,0.06)"
          iconColor="var(--error)"
          label={confirmReset ? t('confirmReset') : t('resetObservations')}
          sublabel={t('resetSub')}
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
          label={confirmSignOut ? t('confirmSignOut') : t('signOut')}
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
          {t('cancel')}
        </button>
      )}

    </div>
  );
}
