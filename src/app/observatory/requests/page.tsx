'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import { useStellarUser } from '@/hooks/useStellarUser';
import { REQUEST_CLASSES, classOf, priceTetriFor } from '@/lib/observatory/capture-requests';
import { SIM_TARGETS } from '@/lib/observatory/sim-targets';
import type { CaptureRequest } from '@/lib/observatory/requests';
import '../observatory.css';

/** The node the queue runs on while there is one. */
const NODE_ID = 'tbilisi-01';

const PATIENCE = [
  { days: 3, label: '3 nights' },
  { days: 7, label: 'a week' },
  { days: 14, label: 'a fortnight' },
];

export default function RequestsPage() {
  const { getAccessToken, login } = usePrivy();
  const { authenticated, ready } = useStellarUser();

  const [targetId, setTargetId] = useState(SIM_TARGETS[0].id);
  const [days, setDays] = useState(7);
  const [requests, setRequests] = useState<CaptureRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/observatory/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests as CaptureRequest[]);
    } catch {
      // The queue below is a convenience; the form above still works.
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const place = async () => {
    setBusy(true);
    setError('');
    try {
      const token = await getAccessToken();
      const now = new Date();
      const res = await fetch('/api/observatory/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nodeId: NODE_ID,
          targetId,
          windowStart: now.toISOString(),
          windowEnd: new Date(now.getTime() + days * 86_400_000).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'That did not go through.');
        return;
      }
      await load();
    } catch {
      setError('Network error — try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      const token = await getAccessToken();
      await fetch(`/api/observatory/requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      setError('Network error — try again.');
    }
  };

  const price = priceTetriFor(targetId);

  return (
    <PageContainer variant="wide" className="obs py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Ask for a photograph
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          You do not have to be awake. Name an object and how long you are willing to wait,
          and the instrument works your request on the first night the sky allows it.
        </p>
      </header>

      <section
        className="mt-6 border p-5"
        style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="obs-label">object</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--canvas)',
                color: 'var(--text-primary)',
              }}
            >
              {SIM_TARGETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="obs-label">willing to wait</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--canvas)',
                color: 'var(--text-primary)',
              }}
            >
              {PATIENCE.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {SIM_TARGETS.find((t) => t.id === targetId)?.expect}
        </p>

        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {REQUEST_CLASSES[classOf(targetId) ?? 'bright'].label} ·{' '}
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {((price ?? 0) / 100).toFixed(0)}
          </span>{' '}
          ₾ · nothing is charged while the network is a dry run, and a window that closes
          without a photograph costs nothing at all.
        </p>

        {error && (
          <p className="mt-3 text-sm" style={{ color: 'var(--no)' }} role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => (authenticated ? void place() : login())}
          disabled={busy}
          className="mt-4 rounded-md border px-4 py-2 text-sm disabled:opacity-60"
          style={{
            borderColor: 'var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent-text)',
          }}
        >
          {busy ? 'Placing…' : authenticated ? 'Join the queue' : 'Sign in to request'}
        </button>
      </section>

      {requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            Your requests
          </h2>
          <ul className="mt-3 flex flex-col">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t py-3"
                style={{ borderColor: 'var(--obs-rule)' }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {r.targetName}
                  </span>
                  <span className="obs-label">{explain(r)}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {/* JetBrains Mono has no lari sign; the number is mono, the symbol is not. */}
                    <span className="font-mono">{(r.priceTetri / 100).toFixed(0)}</span> ₾
                  </span>
                  {r.state === 'queued' && (
                    <button
                      type="button"
                      onClick={() => void cancel(r.id)}
                      className="text-xs underline"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      withdraw
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        A request is worked between booked sessions, so it never takes a slot from someone
        driving the telescope themselves.{' '}
        <Link href="/observatory/how-it-works" className="underline">
          How a capture is proved
        </Link>
        .
      </p>
    </PageContainer>
  );
}

function explain(r: CaptureRequest): string {
  const until = new Date(r.windowEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  switch (r.state) {
    case 'queued':
      return `waiting for a clear night before ${until}`;
    case 'scheduled':
      return r.scheduledAt
        ? `scheduled for ${new Date(r.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : 'scheduled';
    case 'delivered':
      return 'delivered';
    case 'expired':
      return 'the window closed without a clear night — nothing charged';
    case 'cancelled':
      return 'withdrawn';
  }
}
