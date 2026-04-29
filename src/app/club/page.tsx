'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { Telescope, Check, ExternalLink } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import { TELESCOPE_BRANDS } from '@/lib/constants';

const TELESCOPE_TYPES = ['Refractor', 'Reflector', 'Cassegrain', 'Dobsonian', 'Binoculars', 'Other'];

interface TelescopeRecord {
  brand: string;
  model: string;
  aperture: string;
  type: string | null;
  starsAwarded: boolean;
  createdAt: string;
}

export default function ClubPage() {
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
        setError(d.error ?? 'Save failed. Please try again.');
        return;
      }
      const d = await res.json();
      setTelescope(d.telescope);
      setStarsEarned(d.starsAwarded ?? 0);
      setSaved(true);
      setError('');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <BackButton />
        <Card className="p-6 mt-4 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(232, 130, 107,0.08)', border: '1px solid rgba(232, 130, 107,0.15)' }}>
            <Telescope size={26} className="text-[var(--terracotta)]" />
          </div>
          <div>
            <h2 className="text-text-primary font-bold text-lg mb-1">Register Your Telescope</h2>
            <p className="text-text-muted text-sm">Sign in to register your telescope and earn 50 ✦ Stars.</p>
          </div>
          <Button variant="cyan" onClick={() => setAuthOpen(true)} className="w-full">Sign In to Continue</Button>
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
              style={{ background: 'rgba(232, 130, 107,0.08)', border: '1px solid rgba(232, 130, 107,0.2)' }}
            >
              <span className="text-[var(--terracotta)] text-xl">✦</span>
              <div>
                <p className="text-[var(--terracotta)] font-bold text-sm">+{starsEarned} Stars earned</p>
                <p className="text-text-muted text-xs">First telescope registration bonus</p>
              </div>
            </div>
          ) : telescope?.starsAwarded ? (
            <div
              className="mb-4 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-text-muted text-xs">Bonus Stars already awarded on first registration.</p>
            </div>
          ) : null}
          <Card glow="cyan" className="p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232, 130, 107,0.08)', border: '1px solid rgba(232, 130, 107,0.2)' }}>
                <Telescope size={22} className="text-[var(--terracotta)]" />
              </div>
              <div>
                <p className="text-text-primary font-bold">{telescope?.brand} {telescope?.model}</p>
                <p className="text-text-muted text-sm">{telescope?.aperture} · {telescope?.type ?? 'Telescope'}</p>
              </div>
              <div className="ml-auto w-7 h-7 rounded-full bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/30 flex items-center justify-center flex-shrink-0">
                <Check size={14} className="text-[var(--terracotta)]" />
              </div>
            </div>
            <p className="text-text-muted text-xs mb-4">Your telescope is registered on Stellar. It will be linked to your observations and NFTs.</p>
            <Button
              variant="ghost"
              onClick={() => { setSaved(false); }}
              className="w-full text-sm"
            >
              Update Telescope
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(232, 130, 107,0.08)', border: '1px solid rgba(232, 130, 107,0.15)' }}>
            <Telescope size={20} className="text-[var(--terracotta)]" />
          </div>
          <div>
            <h1 className="text-text-primary font-bold text-lg leading-tight">Register Your Telescope</h1>
            <p className="text-text-muted text-xs">Earn 50 ✦ Stars on first registration</p>
          </div>
        </div>

        <Card className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">Brand</label>
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
            <label className="text-xs text-text-muted font-medium">Model</label>
            <input
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="e.g. NexStar 8SE"
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">Aperture</label>
            <input
              value={form.aperture}
              onChange={e => setForm(f => ({ ...f, aperture: e.target.value }))}
              placeholder="e.g. 203mm"
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-medium">Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[var(--terracotta)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {TELESCOPE_TYPES.map(t => <option key={t}>{t}</option>)}
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
            {loading ? 'Saving...' : telescope ? 'Update Telescope' : 'Register Telescope — Earn 50 ✦'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
