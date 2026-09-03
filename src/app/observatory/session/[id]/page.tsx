'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import SessionConsole from '@/components/observatory/SessionConsole';
import { AuthModal } from '@/components/auth/AuthModal';
import { useStellarUser } from '@/hooks/useStellarUser';
import { PREP_LEAD_MS, sessionPhase } from '@/lib/observatory/session-phase';
import type { ObservatoryNode } from '@/lib/observatory/types';
import '../../observatory.css';

type SessionPayload = {
  session: { id: string; startsAt: string; endsAt: string };
  node: ObservatoryNode;
  cloudCover: number | null;
};

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getAccessToken } = usePrivy();
  const { authenticated, ready } = useStellarUser();

  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');
  const [authOpen, setAuthOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const load = useCallback(async () => {
    if (!authenticated) {
      setStatus('denied');
      return;
    }
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/observatory/session/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 404) {
        setStatus('denied');
        return;
      }
      if (!res.ok) throw new Error('failed');
      setPayload((await res.json()) as SessionPayload);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, [authenticated, getAccessToken, id]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  if (!ready || status === 'loading' || now === null) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Opening the room…
        </p>
      </Shell>
    );
  }

  if (status === 'denied') {
    return (
      <Shell>
        <h1 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
          {authenticated ? 'No such session' : 'Sign in to open your session'}
        </h1>
        <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {authenticated
            ? 'This session belongs to another account, or the slot was released.'
            : 'A session room opens only for the account that holds the slot.'}
        </p>
        {authenticated ? (
          <Link href="/observatory" className="mt-4 inline-block text-sm underline">
            Back to the observatory
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="mt-4 rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--accent-border)',
              background: 'var(--accent-dim)',
              color: 'var(--accent-text)',
            }}
          >
            Sign in
          </button>
        )}
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </Shell>
    );
  }

  if (status === 'error' || !payload) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: 'var(--no)' }} role="alert">
          The room could not be opened. Try again in a moment.
        </p>
      </Shell>
    );
  }

  const { node, session, cloudCover } = payload;
  const startsAtMs = new Date(session.startsAt).getTime();
  const endsAtMs = new Date(session.endsAt).getTime();
  const opensAtMs = startsAtMs - PREP_LEAD_MS;
  const phase = sessionPhase(now, startsAtMs, endsAtMs);

  const siteClock = (at: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: node.timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(at));

  if (phase === 'scheduled') {
    return (
      <Shell>
        <Header node={node} line={`Your slot opens ${siteClock(startsAtMs)} site time`} />
        <div className="obs-panel mt-4">
          <div className="obs-panel__bar">
            <span className="flex items-center gap-2">
              <span className="obs-led" aria-hidden="true" />
              <span className="obs-panel__title">Scheduled</span>
            </span>
            <span className="obs-panel__title">{countdown(opensAtMs - now)} until the room opens</span>
          </div>
          <div className="obs-panel__body">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The room opens five minutes before the slot, while the mount unparks and the
              camera wakes. Nothing is charged, and releasing the slot is still free until
              then — the timetable on the instrument page has the button.
            </p>
          </div>
        </div>
        <SimulatorLink />
      </Shell>
    );
  }

  if (phase === 'ended') {
    return (
      <Shell>
        <Header node={node} line={`Your slot ended ${siteClock(endsAtMs)} site time`} />
        <div className="obs-panel mt-4">
          <div className="obs-panel__bar">
            <span className="obs-panel__title">Complete</span>
            <span className="obs-panel__title">
              {siteClock(startsAtMs)} — {siteClock(endsAtMs)}
            </span>
          </div>
          <div className="obs-panel__body">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This was a dry run on the simulator, so nothing was captured to your Collection
              and no Stars were awarded. Frames from the instrument itself arrive when
              {' '}{node.name} finishes commissioning.
            </p>
            <Link
              href={`/observatory/${node.id}`}
              className="mt-3 inline-block rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--accent-border)',
                background: 'var(--accent-dim)',
                color: 'var(--accent-text)',
              }}
            >
              Book another night
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header node={node} line={`Live — your slot runs to ${siteClock(endsAtMs)} site time`} />
      <div className="mt-4">
        <SessionConsole node={node} cloudCover={cloudCover} session={{ startsAtMs, endsAtMs }} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer variant="wide" className="py-6 sm:py-10">
      <BackButton />
      <div className="mt-4">{children}</div>
    </PageContainer>
  );
}

function Header({ node, line }: { node: ObservatoryNode; line: string }) {
  return (
    <header className="obs-panel">
      <div className="obs-panel__bar">
        <span className="flex items-center gap-2">
          <span className="obs-led obs-led--nominal" aria-hidden="true" />
          <h1 className="obs-panel__title" style={{ color: 'var(--text-primary)' }}>
            {node.name} · Session
          </h1>
        </span>
        <span className="obs-panel__title">{line}</span>
      </div>
      <div className="obs-panel__body">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {node.instrument.optics} and a {node.instrument.camera} on a roof in {node.site}. Until
          the instrument is wired, the room runs the simulator — every frame is marked simulated
          and cannot be minted, awarded or logged as an observation.
        </p>
      </div>
    </header>
  );
}

function SimulatorLink() {
  return (
    <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
      In the meantime,{' '}
      <Link href="/observatory/simulator" className="underline">
        the open simulator
      </Link>{' '}
      drives the same optical train with the clock under your control.
    </p>
  );
}

/** mm:ss for a short wait, h:mm for a long one. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, '0')}m`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
