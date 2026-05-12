'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { Telescope, Check, ExternalLink } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import { TELESCOPE_BRANDS } from '@/lib/constants';

const TELESCOPE_TYPES = [
  { value: 'Refractor', label: { en: 'Refractor', ka: 'რეფრაქტორი' } },
  { value: 'Reflector', label: { en: 'Reflector', ka: 'რეფლექტორი' } },
  { value: 'Cassegrain', label: { en: 'Cassegrain', ka: 'კასეგრენი' } },
  { value: 'Dobsonian', label: { en: 'Dobsonian', ka: 'დობსონიანი' } },
  { value: 'Binoculars', label: { en: 'Binoculars', ka: 'ბინოკლები' } },
  { value: 'Other', label: { en: 'Other', ka: 'სხვა' } },
] as const;

interface TelescopeRecord {
  brand: string;
  model: string;
  aperture: string;
  type: string | null;
  starsAwarded: boolean;
  createdAt: string;
}

export default function ClubPage() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const t = {
    registerTitle: locale === 'ka' ? 'დაარეგისტრირე შენი ტელესკოპი' : 'Register Your Telescope',
    registerPrompt: locale === 'ka' ? 'შედი, დაარეგისტრირე ტელესკოპი და მიიღე 50 ✦ Stars.' : 'Sign in to register your telescope and earn 50 ✦ Stars.',
    signInContinue: locale === 'ka' ? 'გასაგრძელებლად შედი' : 'Sign In to Continue',
    earned: locale === 'ka' ? 'Stars დაემატა' : 'Stars earned',
    firstBonus: locale === 'ka' ? 'პირველი ტელესკოპის რეგისტრაციის ბონუსი' : 'First telescope registration bonus',
    bonusDone: locale === 'ka' ? 'ბონუსი უკვე გაიცა პირველი რეგისტრაციის დროს.' : 'Bonus Stars already awarded on first registration.',
    telescopeFallback: locale === 'ka' ? 'ტელესკოპი' : 'Telescope',
    registeredBody: locale === 'ka' ? 'შენი ტელესკოპი Stellar-შია რეგისტრირებული. ის დაკვირვებებსა და NFT-ებს დაუკავშირდება.' : 'Your telescope is registered on Stellar. It will be linked to your observations and NFTs.',
    update: locale === 'ka' ? 'ტელესკოპის განახლება' : 'Update Telescope',
    earnFirst: locale === 'ka' ? 'პირველ რეგისტრაციაზე მიიღე 50 ✦ Stars' : 'Earn 50 ✦ Stars on first registration',
    brand: locale === 'ka' ? 'ბრენდი' : 'Brand',
    model: locale === 'ka' ? 'მოდელი' : 'Model',
    aperture: locale === 'ka' ? 'აპერტურა' : 'Aperture',
    type: locale === 'ka' ? 'ტიპი' : 'Type',
    modelPlaceholder: locale === 'ka' ? 'მაგ. NexStar 8SE' : 'e.g. NexStar 8SE',
    aperturePlaceholder: locale === 'ka' ? 'მაგ. 203mm' : 'e.g. 203mm',
    saving: locale === 'ka' ? 'ინახება...' : 'Saving...',
    registerCta: locale === 'ka' ? 'ტელესკოპის რეგისტრაცია — მიიღე 50 ✦' : 'Register Telescope — Earn 50 ✦',
    saveFailed: locale === 'ka' ? 'შენახვა ვერ მოხერხდა. სცადე თავიდან.' : 'Save failed. Please try again.',
    networkError: locale === 'ka' ? 'ქსელის შეცდომა — სცადე თავიდან' : 'Network error — please try again',
  } as const;
  const { getAccessToken } = usePrivy();
  const { authenticated, address: walletAddress } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);

  const [telescope, setTelescope] = useState<TelescopeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    brand: 'Celestron',
    model: '',
    aperture: '',
    type: 'Reflector',
  });

  // Load existing telescope on auth
  useEffect(() => {
    if (!authenticated) { setFetching(false); return; }
    getAccessToken().then(token => {
      if (!token) { setFetching(false); return; }
      fetch('/api/telescopes', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          if (d.telescope) {
            setTelescope(d.telescope);
            setForm({
              brand: d.telescope.brand,
              model: d.telescope.model,
              aperture: d.telescope.aperture,
              type: d.telescope.type ?? 'Reflector',
            });
          }
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }).catch(() => setFetching(false));
  }, [authenticated, getAccessToken]);

  const handleSave = async () => {
    if (!form.brand.trim() || !form.model.trim() || !form.aperture.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/telescopes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          walletAddress: walletAddress ?? null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t.saveFailed);
        return;
      }
      const d = await res.json();
      setTelescope(d.telescope);
      setStarsEarned(d.starsAwarded ?? 0);
      setSaved(true);
      setError('');
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <BackButton />
        <Card className="p-6 mt-4 flex flex-col items-center gap-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
              boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            <Telescope size={26} strokeWidth={2.2} color="#FFFFFF" />
          </div>
          <div>
            <h2 className="text-text-primary font-bold text-lg mb-1">{t.registerTitle}</h2>
            <p className="text-text-muted text-sm">{t.registerPrompt}</p>
          </div>
          <Button variant="cyan" onClick={() => setAuthOpen(true)} className="w-full">{t.signInContinue}</Button>
        </Card>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <BackButton />
        <div className="mt-8 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--terracotta)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (saved || (telescope && !loading)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <BackButton />
        <div className="mt-4">
          {starsEarned > 0 ? (
            <div
              className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(255, 179, 71,0.08)', border: '1px solid rgba(255, 179, 71,0.2)' }}
            >
              <span className="text-[var(--terracotta)] text-xl">✦</span>
              <div>
                <p className="text-[var(--terracotta)] font-bold text-sm">+{starsEarned} {t.earned}</p>
                <p className="text-text-muted text-xs">{t.firstBonus}</p>
              </div>
            </div>
          ) : telescope?.starsAwarded ? (
            <div
              className="mb-4 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-text-muted text-xs">{t.bonusDone}</p>
            </div>
          ) : null}
          <Card glow="cyan" className="p-6">
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
                  boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                }}
              >
                <Telescope size={22} strokeWidth={2.2} color="#FFFFFF" />
              </div>
              <div>
                <p className="text-text-primary font-bold">{telescope?.brand} {telescope?.model}</p>
                <p className="text-text-muted text-sm">{telescope?.aperture} · {telescope?.type ?? t.telescopeFallback}</p>
              </div>
              <div className="ml-auto w-7 h-7 rounded-full bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/30 flex items-center justify-center flex-shrink-0">
                <Check size={14} className="text-[var(--terracotta)]" />
              </div>
            </div>
            <p className="text-text-muted text-xs mb-4">{t.registeredBody}</p>
            <Button
              variant="ghost"
              onClick={() => { setSaved(false); }}
              className="w-full text-sm"
            >
              {t.update}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <BackButton />
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
              boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            <Telescope size={20} strokeWidth={2.2} color="#FFFFFF" />
          </div>
          <div>
            <h1 className="text-text-primary font-bold text-lg leading-tight">{t.registerTitle}</h1>
            <p className="text-text-muted text-xs">{t.earnFirst}</p>
          </div>
        </div>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">{t.brand}</label>
            <select
              value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {TELESCOPE_BRANDS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">{t.model}</label>
            <input
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder={t.modelPlaceholder}
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">{t.aperture}</label>
            <input
              value={form.aperture}
              onChange={e => setForm(f => ({ ...f, aperture: e.target.value }))}
              placeholder={t.aperturePlaceholder}
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">{t.type}</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {TELESCOPE_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-negative text-xs px-1">{error}</p>
          )}

          <Button
            variant="cyan"
            onClick={handleSave}
            disabled={!form.model.trim() || !form.aperture.trim() || loading}
            className="w-full mt-1"
          >
            {loading ? t.saving : telescope ? t.update : t.registerCta}
          </Button>
        </Card>
      </div>
    </div>
  );
}
