'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface RetentionData {
  campaign: { source: string; campaign: string };
  headline: { cohortSize: number; week0: number; week4: number; week4RetentionPct: number | null };
  signupsBySource: Array<{ source: string; day: string; signups: number }>;
  funnel: { signup: number; observation_started: number; observation_minted: number };
}

type Status = 'loading' | 'denied' | 'ready' | 'error';

export default function AdminRetentionPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<RetentionData | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { setStatus('denied'); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken().catch(() => null);
        if (!token) { if (!cancelled) setStatus('denied'); return; }
        const res = await fetch('/api/admin/retention', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 404) { setStatus('denied'); return; }
        if (!res.ok) { setStatus('error'); return; }
        setData(await res.json());
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken]);

  if (status === 'loading') {
    return <Centered>Loading…</Centered>;
  }
  if (status === 'denied') {
    return <Centered>Not found</Centered>;
  }
  if (status === 'error' || !data) {
    return <Centered>Couldn’t load retention data. Try again.</Centered>;
  }

  const { headline, funnel, signupsBySource } = data;
  const pct = headline.week4RetentionPct;
  const funnelMintPct = funnel.signup > 0
    ? Math.round((100 * funnel.observation_minted) / funnel.signup)
    : 0;
  const funnelStartPct = funnel.signup > 0
    ? Math.round((100 * funnel.observation_started) / funnel.signup)
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-text-muted">
          {data.campaign.source} · {data.campaign.campaign}
        </p>
        <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text-primary)' }}>
          Beta retention
        </h1>
      </header>

      {/* 1. Headline */}
      <section
        className="rounded-2xl px-6 py-8 text-center"
        style={{ background: 'rgba(var(--ink), 0.03)', border: '1px solid var(--border-default)' }}
      >
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-muted mb-3">
          Week-4 retention
        </p>
        <p
          className="leading-none"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(48px, 14vw, 88px)', color: 'var(--accent-text)' }}
        >
          {pct == null ? '—' : `${pct}%`}
        </p>
        <p className="text-sm text-text-secondary mt-3">
          {headline.week4} of {headline.week0} week-0 wallets returned in week 4
        </p>
        <p className="text-xs text-text-muted mt-1">
          Cohort size: {headline.cohortSize}
        </p>
      </section>

      {/* 2. Funnel */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text-primary)' }}>
          Funnel
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <FunnelCell label="Signups" value={funnel.signup} pct={100} />
          <FunnelCell label="Started" value={funnel.observation_started} pct={funnelStartPct} />
          <FunnelCell label="Minted" value={funnel.observation_minted} pct={funnelMintPct} />
        </div>
      </section>

      {/* 3. Signups by source by day */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text-primary)' }}>
          Signups by source
        </h2>
        {signupsBySource.length === 0 ? (
          <p className="text-sm text-text-muted">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider">Day</th>
                  <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {signupsBySource.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-3 py-2 font-mono text-xs text-text-secondary">{r.day}</td>
                    <td className="px-3 py-2 text-text-primary">{r.source}</td>
                    <td className="px-3 py-2 font-mono text-right text-text-primary">{r.signups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FunnelCell({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div
      className="rounded-xl px-3 py-4 text-center"
      style={{ background: 'rgba(var(--ink), 0.03)', border: '1px solid var(--border-default)' }}
    >
      <p className="font-mono text-2xl text-text-primary leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-text-muted mt-2">{label}</p>
      <p className="text-[11px] text-accent mt-0.5">{pct}%</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <p className="text-sm text-text-muted">{children}</p>
    </div>
  );
}
